/*
StandardItemDefinition: {
  name: String,
  need?: String | String[],
  build: (items) => Promise => ItemPack,
}

PerItemDefinition: {
  perItem: true,
  name: String,
  need?: String | String[],
  build: (items, definition) => Promise => Item
}

ItemDefinition: StandardItemDefinition | PerItemDefinition

Item ~ Any

ItemPack: {
  item: Item,

  // as server, stop request listener
  stop?: () => Promise => void,

  // destroy item and release its resources
  destroy?: () => Promise => void,
}
 */

const clean = require('clean-options')
const toposort = require('toposort')
const flatten = require('lodash.flatten')

const symbols = {
  logger: Symbol('logger'),
  items: Symbol('items'),
  destroys: Symbol('destroys'),
  stops: Symbol('stops'),
  status: Symbol('status') // init => loading => loaded => closing => closed
}

class Holder {
  constructor (options) {
    const {
      logger = console,
    } = clean(options)

    this[symbols.logger] = logger
    this[symbols.status] = 'init'
  }

  async load (definitions = []) {
    const status = this[symbols.status]
    if (status !== 'init') {
      throw new Error(`Invalid status. Holder can only be loaded at 'init' status, but current status is '${status}'`)
    }
    this[symbols.status] = 'loading'

    const logger = this[symbols.logger]
    const items = this[symbols.items] = {}
    const perItemDefs = []
    const destroys = this[symbols.destroys] = []
    const stops = this[symbols.stops] = []
    definitions = sortDefinitions(definitions)
    for (let definition of definitions) {
      const {perItem} = definition
      if (perItem) perItemDefs.push(definition)
      else {
        const {name, build} = definition
        const itemItems = {...items}
        const neededPerItemDefs = perItemDefs.filter(def => getNeed(definition).includes(def.name))
        for (let perItemDef of neededPerItemDefs) {
          logger.info('loading per-item item...', {name: perItemDef.name, for: name})
          itemItems[perItemDef.name] = await perItemDef.build(itemItems, definition)
          logger.info('per-item item loaded', {name: perItemDef.name, for: name})
        }
        logger.info('loading item...', {name})
        const item = await build(itemItems)
        logger.info('item loaded', {name})
        if (item) {
          if (item.stop) stops.push({name, stop: item.stop})
          if (item.destroy) destroys.push({name, destroy: item.destroy})
          items[name] = item.item
        }
      }
    }
    logger.info('all items loaded')

    this[symbols.status] = 'loaded'
  }

  async close () {
    const status = this[symbols.status]
    if (status !== 'loaded') {
      throw new Error(`Invalid status. Holder can only be closed at 'loaded' status, but current status is '${status}'`)
    }
    this[symbols.status] = 'closing'

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

    this[symbols.status] = 'closed'
  }

  getItem (name) {
    const status = this[symbols.status]
    if (status !== 'loaded') {
      throw new Error(`Invalid status. Item can only be retrieved at 'loaded' status, but current status is '${status}'`)
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