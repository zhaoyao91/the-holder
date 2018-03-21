# The Holder

General app loader or item holder.

## Introduction

Generally speaking, the backbone of an app takes the following responsibilities:

- correctly load aspects (items) the app cares about
  - config, context, components ...
  - items usually have dependencies from here to there, thus the dependencies of an item must be loaded before it
  - any item should have access to its dependencies
- correctly close the app
  - the ability to stop receiving any request from outside world while keep handling already received requests until
  they finished to support graceful shutdown 
  - the ability to destroy items and release all resources
  
**The Holder** takes and only takes tasks listed above. The detailed logic, such as what items should be load, what're 
their dependencies, how should they be stopped and destroyed, is left blank to the user.

## Installation

```
npm install the-holder
```

## Usage

```
// define your app
const definitions = [
  {name: 'config', build: () => {...load config... return {item: config}}},
  {
    name: 'db', 
    need: 'config', 
    build: async ({config}) => {
      ...connect to db... 
      return {
        item: connection,
        destroy: async () => {...disconnect...}
      }
    }
  },
  {
    name: 'server',
    need: 'config',
    build: async ({config}) => {
      ...start (such as http) server... 
      return {
        item: server,
        stop: async () => {...stop receiving requests...}
      }
    }
  },
  {
    name: 'handlers',
    need: ['config', 'db', 'server'],
    build: ({config, db, server}) => {
      ...register handlers to the server...
      ...no need to return anything...
    }
  }
]

// start app (holder)
const Holder = require('the-holder')
const holder = new Holder()
await holder.load(definitions)

// setup graceful shutdown
const gracedown = require('grace-down')
gracedown(async () => {
  await holder.close()
  process.exit(0)
})
```

## API

### Holder

#### $.constructor

```
(options?: Options) => Holder

Options ~ {
  logger?
}
``` 

#### $.load

Load items by their definitions.

Items will be loaded in an order computed by their dependant relations.

```
(ItemDefinition[]) => Promise => Void

ItemDefinition: StandardItemDefinition | PerItemDefinition

StandardItemDefinition: {
  name: String,
  need?: String | String[],
  build: (items) => Promise => ItemPack,
}

// special item definition which will build a new specific item for every item depends on it 
// this kind of item cannot be stopped or destroyed
PerItemDefinition: {
  perItem: true,
  name: String,
  need?: String | String[],
  build: (items, definition) => Promise => Item
}

Item ~ Any

ItemPack: {
  item: Item,

  // as server, stop request listener
  stop?: () => Promise => void,

  // destroy item and release its resources
  destroy?: () => Promise => void,
}
```

#### $.close

Close the holder and stop/destroy all items in the reverse order they were loaded by.

Items are to be destroyed after all items are closed.

```
() => Promise => Void
```

## License

MIT