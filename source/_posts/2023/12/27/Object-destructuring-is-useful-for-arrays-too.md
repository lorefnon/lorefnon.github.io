---
title: Object destructuring is useful for arrays too
tags: [Javascript]
date: 2023-12-27
---

Javascript has [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#object_destructuring) for objects, and [array destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#array_destructuring) for arrays (and other iterables).

However, we sometimes forget that in javascript arrays are objects too, and thus object destructuring can be used with arrays as well.

```js
const { 0: a } = [10]
console.log(a) // 10
```

We need to provide an alternative identifier because `0` can not be used as one. This works because js arrays quack like objects with string keys. 

```js
console.log([10]["0"]) // 10
```

Above usages are not so useful though, but it can be handy in scenarios where you get a collection from somewhere else and want to extract something useful out of it succinctly.

So instead of: 

```js
[1, 2, 3].map((item, index, collection) => `${index}/${collection.length}`) // ['0/3', '1/3', '2/3']
```

We could write: 

```js
[1, 2, 3].map((item, index, { length }) => `${index}/${length}`) // ['0/3', '1/3', '2/3']
```

Or, let's say we need the siblings of each item while iterating: 

```js
[1, 2, 3].map((item, index, { 
    [index-1]: prev,
    [index+1]: next,
}) => ({ item, prev, next }))
// [{"item":1,"prev": undefined, "next":2},{"item":2,"prev":1,"next":3},{"item":3,"prev":2, "next": undefined}]
```

Here we take advantage of the feature that while destructuring, our keys can be computed expressions.

Also, there is nothing stopping us from making use of destructured items in key expressions within the same destructuring assignment:

```js

[1, 2, 3].map((current, index, { 
    length,
    0: first,
    [length-1]: last
}) => `${first}...${current}...${last}`)
// ['1...1...3', '1...2...3', '1...3...3']
```

JS is fun, yeah ?
