/**
 * @typedef {object} Holder~StandardItemDefinition
 * @property {string} name
 * @property {string | string[]} [need] - the items this item requires
 * @property {Holder~ItemBuilder} build
 */

/**
 * @typedef {object} Holder~CustomItemDefinition
 * @property {string} type - denote the type of this item
 * @property {string} name
 * @property {string | string[]} [need] - the items this item requires
 * @property [...options] - any other custom options
 */

/**
 * @typedef {Holder~StandardItemDefinition | Holder~CustomItemDefinition} Holder~ItemDefinition
 */

/**
 * @typedef {function} Holder~ItemBuilder
 * @async
 * @param {object} items - items already built
 * @param {object} definition - the definition of current item
 * @return {Promise.<Holder~ItemPack>}
 */

/**
 * @typedef {object} Holder~ItemPack
 * @property {any} [item]
 * @property {function} [stop] - async () => void, stop listen to any requests
 * @property {function} [destroy] - async () => void, destroy this item and release resources
 */

const clean = require('clean-options')
const toposort = require('toposort')
const flatten = require('lodash.flatten')
const Signal = require('await-signal')

const symbols = {
  logger: Symbol('logger'),
  items: Symbol('items'),
  destroys: Symbol('destroys'),
  stops: Symbol('stops'),
  loadSignal: Symbol('loadSignal'), // init, loading, loaded
  closeSignal: Symbol('closeSignal'), // init, closing, closed
  sigtermListener: Symbol('sigtermListener'),
  adapters: Symbol('adapters')
}

class Holder {
  /**
   * @param {object} [options]
   * @param {object} [options.logger]
   * @param {object} [options.adapters] - key is a type, value is a function which maps {@link Holder~CustomItemDefinition} to {@link Holder~StandardItemDefinition}
   */
  constructor (options) {
    const {
      logger = console,
      adapters = {}
    } = clean(options)

    this[symbols.logger] = logger
    this[symbols.loadSignal] = new Signal('init')
    this[symbols.closeSignal] = new Signal('init')
    this[symbols.adapters] = adapters
  }

  /**
   * load item definitions
   *
   * @param {Holder~ItemDefinition[]} definitions
   * @returns {Promise<void>}
   */
  async load (definitions = []) {
    const loadSignal = this[symbols.loadSignal]
    const closeSignal = this[symbols.closeSignal]
    if (!(loadSignal.state === 'init' && closeSignal.state === 'init')) {
      throw new Error(`Invalid status. Expect (init, init), received (${loadSignal.state}, ${closeSignal.state})`)
    }
    loadSignal.state = 'loading'

    const adapters = this[symbols.adapters]
    const logger = this[symbols.logger]
    const items = this[symbols.items] = {}
    const destroys = this[symbols.destroys] = []
    const stops = this[symbols.stops] = []
    definitions = sortDefinitions(definitions)
    for (let definition of definitions) {
      if (definition.type) definition = adapters[definition.type](definition) // adapt custom definition
      const {name, build} = definition
      logger.info('loading item...', {name})
      const item = await build(items, definition)
      logger.info('item loaded', {name})
      if (item) {
        if (item.stop) stops.push({name, stop: item.stop})
        if (item.destroy) destroys.push({name, destroy: item.destroy})
        items[name] = item.item
      }
      // if user try to close holder while loading, stop loading more items
      if (closeSignal.state === 'closing') break
    }
    logger.info('all items loaded')

    loadSignal.state = 'loaded'
  }

  /**
   * close the holder and stop/destroy all items
   *
   * @return {Promise<void>}
   */
  async close () {
    const loadSignal = this[symbols.loadSignal]
    const closeSignal = this[symbols.closeSignal]
    if (!(loadSignal.state !== 'init' && closeSignal.state === 'init')) {
      throw new Error(`Invalid status. Expect (!init, init), received (${loadSignal.state}, ${closeSignal.state})`)
    }
    closeSignal.state = 'closing'
    await loadSignal.until('loaded')

    const logger = this[symbols.logger]
    // stop all request listeners
    for (let item of this[symbols.stops].reverse()) {
      logger.info('stopping item...', {name: item.name})
      await item.stop()
      logger.info('item stopped', {name: item.name})
    }
    logger.info('all items stopped')
    // destroy all items and release all resources
    for (let item of this[symbols.destroys].reverse()) {
      logger.info('destroying item...', {name: item.name})
      await item.destroy()
      logger.info('item destroyed', {name: item.name})
    }
    logger.info('all items destroyed')

    closeSignal.state = 'closed'
  }

  /**
   * get the item by name
   *
   * @param {string} name
   * @return {any}
   */
  getItem (name) {
    const loadSignal = this[symbols.loadSignal]
    const closeSignal = this[symbols.closeSignal]
    if (!(loadSignal.state === 'loaded' && closeSignal.state === 'init')) {
      throw new Error(`Invalid status. Expect (loaded, init), received (${loadSignal.state}, ${closeSignal.state})`)
    }

    return this[symbols.items][name]
  }
}

module.exports = Holder

function sortDefinitions (definitions) {
  checkUniqueDefinitions(definitions)
  const nodes = definitions.map(x => x.name)
  const edges = flatten(definitions.map(x => getNeed(x).map(y => [x.name, y])))
  const sortedNodes = toposort.array(nodes, edges).reverse()
  return sortedNodes.map(node => definitions.find(x => x.name === node))
}

function checkUniqueDefinitions (definitions) {
  const names = new Set()
  definitions.forEach(x => {
    if (names.has(x.name)) {
      throw new Error(`definition name '${x.name}' is duplicated`)
    }
    names.add(x.name)
  })
}

function getNeed (x) {
  if (!x.need) return []
  else if (!Array.isArray(x.need)) return [x.need]
  else return x.need
}