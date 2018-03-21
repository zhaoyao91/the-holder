/*
StandardItemDefinition: {
  name: String,
  need?: String[],
  build: (items) => Promise => ItemPack,
}

PerItemDefinition: {
  type: 'per-item',
  name: String,
  need?: String[],
  build: (items, definition) => Promise => Item
}

CustomItemDefinition: {
  type: String,
  ...
}

ItemDefinition: StandardItemDefinition | PerItemDefinition | CustomItemDefinition


Item ~ Any

ItemPack: {
  item: Item,

  // as server, stop request listener
  stop?: () => Promise => void,

  // destroy item and release its resources
  destroy?: () => Promise => void,
}

Adapter: (CustomItemDefinition) => StandardItemDefinition
 */

const clean = require('clean-options')
const toposort = require('toposort')
const flatten = require('lodash.flatten')

module.exports = class Holder {
  constructor (options) {
    const {
      logger = console,
      adapters = {},
    } = clean(options)

    this._logger = logger
    this._adapters = adapters
  }

  async load (definitions) {
    const logger = this._logger
    const adapters = this._adapters
    const items = {}
    const perItemDefs = []
    const destroys = []
    const stops = []
    definitions = adaptDefinitions(definitions, adapters)
    definitions = sortDefinitions(definitions)
    for (let definition of definitions) {
      const {type} = definition
      if (type === 'per-item') perItemDefs.push(definition)
      else {
        const {name, build} = definition
        const itemItems = {...items}
        for (let perItemDef of perItemDefs) {
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
    this._destroys = destroys.reverse()
    this._stops = stops.reverse()
    logger.info('all items loaded')
  }

  async close () {
    const logger = this._logger
    // stop all request listeners
    for (let item of this._stops) {
      logger.info('stopping item...', {name: item.name})
      await item.stop()
      logger.info('item stopped', {name: item.name})
    }
    logger.info('all items stopped')
    // destroy all items and release all resources
    for (let item of this._destroys) {
      logger.info('destroying item...', {name: item.name})
      await item.destroy()
      logger.info('item destroyed', {name: item.name})
    }
    logger.info('all items destroyed')
  }
}

function adaptDefinitions(definitions, adapters) {
  return definitions.map(definition => {
    const {type} = definition
    if (!type || type === 'per-item') return definition
    else {
      const adapter = adapters[type]
      if (!adapter) throw new Error(`cannot find adapter for type '${type}'`)
      return adapter(definition)
    }
  })
}

function sortDefinitions (definitions) {
  checkUniqueDefinitions(definitions)
  const nodes = definitions.map(x => x.name)
  const edges = flatten(definitions.map(x => (x.need || []).map(y => [x.name, y])))
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
