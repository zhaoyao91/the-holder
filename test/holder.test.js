const Holder = require('../index')

describe('Holder', () => {
  it('should load a item', async () => {
    expect.assertions(2)
    const def1 = {
      name: 'item1',
      build: async () => {
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

  it('should load needed per-item item', async () => {
    expect.assertions(3)
    const defs = [
      {name: 'base', build () {return {item: 'Base'}}},
      {
        perItem: true, name: 'name', need: 'base', build (context, def) {
          expect(context.base).toBe('Base')
          return def.name
        }
      },
      {
        name: 'item1', need: 'name', build (context) {
          expect(context.name).toBe('item1')
        }
      },
      {
        name: 'item2', need: 'item1', build (context) {
          // as item2 do not declare requirement on name
          // it won't receive this per-item item
          expect(context.name).toBeUndefined()
        }
      }
    ]

    const holder = new Holder()
    await holder.load(defs)
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

  test('holder cannot be loaded after loaded', async () => {
    expect.assertions(1)
    const holder = new Holder()
    await holder.load()
    try {
      await holder.load()
    } catch (err) {
      expect(err.message).toMatch(/^Invalid status. Holder can only be loaded at 'init' status, but current status is .*$/)
    }
  })

  test('holder cannot be closed before loaded', async () => {
    expect.assertions(1)
    const holder = new Holder()
    try {
      await holder.close()
    } catch (err) {
      expect(err.message).toMatch(/^Invalid status. Holder can only be closed at 'loaded' status, but current status is .*$/)
    }
  })

  test('item cannot be retrieved before loaded', async () => {
    expect.assertions(1)
    const holder = new Holder()
    try {
      holder.getItem('hi')
    } catch (err) {
      expect(err.message).toMatch(/^Invalid status. Item can only be retrieved at 'loaded' status, but current status is .*$/)
    }
  })
})
