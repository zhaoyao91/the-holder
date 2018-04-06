const Holder = require('./index')
const sleep = require('sleep-promise')

describe('Holder', () => {
  it('should load a item', async () => {
    expect.assertions(3)
    const def1 = {
      name: 'item1',
      build: async (_, def) => {
        expect(def.name).toBe('item1')
        return {
          item: 'Hello'
        }
      }
    }

    const def2 = {
      name: 'item2',
      need: 'item1',
      build: async ({item1}) => {
        expect(item1).toBe('Hello')
      }
    }

    const holder = new Holder()
    await holder.load([def1, def2])
    expect(holder.getItem('item1')).toBe('Hello')
  })

  it('should load items by dependant relations', async () => {
    const sequence = []

    const defs = [
      {name: 'd', need: ['c'], build: () => {sequence.push('d')}},
      {name: 'a', build: () => {sequence.push('a')}},
      {name: 'c', need: ['b', 'a'], build: () => {sequence.push('c')}},
      {name: 'b', need: ['a'], build: () => {sequence.push('b')}},
    ]

    const holder = new Holder()

    await holder.load(defs)

    expect(sequence).toEqual(['a', 'b', 'c', 'd'])
  })

  it('should close the holder correctly (stop items and destroy items)', async () => {
    const sequence = []

    const defs = [
      {
        name: 'a', build: () => {
          return {
            stop: () => {
              sequence.push('stop a')
            },
            destroy: () => {
              sequence.push('destroy a')
            }
          }
        }
      },
      {name: 'b', need: ['a'], build: () => {}},
      {
        name: 'c', need: ['b', 'a'], build: () => {
          return {
            stop: () => {
              sequence.push('stop c')
            }
          }
        }
      },
      {
        name: 'd', need: ['c'], build: () => {
          return {
            destroy: () => {
              sequence.push('destroy d')
            }
          }
        }
      },
    ]

    const holder = new Holder()
    await holder.load(defs)
    await holder.close()

    expect(sequence).toEqual([
      'stop c',
      'stop a',
      'destroy d',
      'destroy a'
    ])
  })

  it('should not load items with cycle dependencies', async () => {
    expect.assertions(1)
    const defs = [
      {name: 'a', need: 'b', build () {}},
      {name: 'b', need: 'a', build () {}}
    ]

    const holder = new Holder()
    try {
      await holder.load(defs)
    }
    catch (err) {
      expect(err.message).toMatch(/Cyclic dependency/)
    }
  })

  it('should not load items with duplicate names', async () => {
    expect.assertions(1)
    const defs = [
      {name: 'a', build () {}},
      {name: 'a', build () {}}
    ]

    const holder = new Holder()
    try {
      await holder.load(defs)
    }
    catch (err) {
      expect(err.message).toMatch(/definition name '.*' is duplicated/)
    }
  })

  it('should interrupt the loading by closing the holder', async () => {
    const loaded = [false, false, false]
    const closed = [false, false, false]
    const defs = [
      {
        name: 'a',
        build () {
          loaded[0] = true
          return {
            destroy () {closed[0] = true}
          }
        }
      },
      {
        name: 'b',
        need: ['a'],
        async build () {
          await sleep(100)
          loaded[1] = true
          return {
            destroy () {closed[1] = true}
          }
        }
      },
      {
        name: 'c',
        need: 'b',
        build () {
          loaded[2] = true
          return {
            destroy () {closed[2] = true}
          }
        }
      }
    ]
    const holder = new Holder()
    holder.load(defs)
    await sleep(10)
    await holder.close()
    expect(loaded).toEqual([true, true, false])
    expect(closed).toEqual([true, true, false])
  })

  it('should adapt custom type', async () => {
    const customDef = {
      type: 'add',
      name: 'testItem',
      a: 1,
      b: 2
    }
    const addAdapter = (def) => {
      return {
        ...def,
        build () {
          return {item: def.a + def.b}
        }
      }
    }
    const holder = new Holder({adapters: {add: addAdapter}})
    await holder.load([customDef])
    const item = holder.getItem('testItem')
    expect(item).toBe(3)
  })
})
