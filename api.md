<a name="Holder"></a>

## Holder
**Kind**: global class  

* [Holder](#Holder)
    * [new Holder([options])](#new_Holder_new)
    * _instance_
        * [.load(definitions)](#Holder+load) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.close()](#Holder+close) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.getItem(name)](#Holder+getItem) ⇒ <code>any</code>
    * _inner_
        * [~StandardItemDefinition](#Holder..StandardItemDefinition) : <code>object</code>
        * [~CustomItemDefinition](#Holder..CustomItemDefinition) : <code>object</code>
        * [~ItemDefinition](#Holder..ItemDefinition) : [<code>StandardItemDefinition</code>](#Holder..StandardItemDefinition) \| [<code>CustomItemDefinition</code>](#Holder..CustomItemDefinition)
        * [~ItemBuilder](#Holder..ItemBuilder) ⇒ [<code>Promise.&lt;ItemPack&gt;</code>](#Holder..ItemPack)
        * [~ItemPack](#Holder..ItemPack) : <code>object</code>

<a name="new_Holder_new"></a>

### new Holder([options])

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> |  |
| [options.logger] | <code>object</code> |  |
| [options.adapters] | <code>object</code> | key is a type, value is a function which maps [CustomItemDefinition](#Holder..CustomItemDefinition) to [StandardItemDefinition](#Holder..StandardItemDefinition) |

<a name="Holder+load"></a>

### holder.load(definitions) ⇒ <code>Promise.&lt;void&gt;</code>
load item definitions

**Kind**: instance method of [<code>Holder</code>](#Holder)  

| Param | Type |
| --- | --- |
| definitions | [<code>Array.&lt;ItemDefinition&gt;</code>](#Holder..ItemDefinition) | 

<a name="Holder+close"></a>

### holder.close() ⇒ <code>Promise.&lt;void&gt;</code>
close the holder and stop/destroy all items

**Kind**: instance method of [<code>Holder</code>](#Holder)  
<a name="Holder+getItem"></a>

### holder.getItem(name) ⇒ <code>any</code>
get the item by name

**Kind**: instance method of [<code>Holder</code>](#Holder)  

| Param | Type |
| --- | --- |
| name | <code>string</code> | 

<a name="Holder..StandardItemDefinition"></a>

### Holder~StandardItemDefinition : <code>object</code>
**Kind**: inner typedef of [<code>Holder</code>](#Holder)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> |  |
| [need] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | the items this item requires |
| build | [<code>ItemBuilder</code>](#Holder..ItemBuilder) |  |

<a name="Holder..CustomItemDefinition"></a>

### Holder~CustomItemDefinition : <code>object</code>
**Kind**: inner typedef of [<code>Holder</code>](#Holder)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | denote the type of this item |
| name | <code>string</code> |  |
| [need] | <code>string</code> \| <code>Array.&lt;string&gt;</code> | the items this item requires |
| [...options] |  | any other custom options |

<a name="Holder..ItemDefinition"></a>

### Holder~ItemDefinition : [<code>StandardItemDefinition</code>](#Holder..StandardItemDefinition) \| [<code>CustomItemDefinition</code>](#Holder..CustomItemDefinition)
**Kind**: inner typedef of [<code>Holder</code>](#Holder)  
<a name="Holder..ItemBuilder"></a>

### Holder~ItemBuilder ⇒ [<code>Promise.&lt;ItemPack&gt;</code>](#Holder..ItemPack)
**Kind**: inner typedef of [<code>Holder</code>](#Holder)  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>object</code> | items already built |
| definition | <code>object</code> | the definition of current item |

<a name="Holder..ItemPack"></a>

### Holder~ItemPack : <code>object</code>
**Kind**: inner typedef of [<code>Holder</code>](#Holder)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [item] | <code>any</code> |  |
| [stop] | <code>function</code> | async () => void, stop listen to any requests |
| [destroy] | <code>function</code> | async () => void, destroy this item and release resources |
| [buildItem] | <code>function</code> | async (definition) => any, builder function which will be called for every following items to build dynamic item for them |

