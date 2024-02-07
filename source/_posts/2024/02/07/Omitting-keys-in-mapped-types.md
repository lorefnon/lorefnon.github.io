---
title: Omitting keys in mapped types
tags: []
date: 2024-02-07
---

Let's use the following type: 

```ts
interface User {
    name: string
    age: number
    address: {
        city: string
        country: string
    }
}
```

TS enables us to map over the keys of an object type to derive new types. Simplest example would be something like this:

```ts
type User$1 = {
    [K in keyof User]: User[K]
}
```

Because we are mapping keys in `User` type to corresponding values in `User` type, our `User$1` is equivalent to `User`.

Most mapped types we see in the wild will use a different value type, typically one that is derived from `User[K]`.

The issue we want to tackle is that we want to omit certain keys when generating the mapped type. 

Here, let's say we want to include only those keys whose value types are primitive.

```ts
type Primitive = string | number | boolean | symbol;
```

If the user type is known to us in advance, we can simply do: 

```ts
type User$2 = {
    [K in keyof Pick<User, "name" | "age">]: User[K]
}
// { name: string, age: number }
```

However, often we won't have the User type known to us ahead of time, or we wouldn't want to hard code the keys.

We could map the values we don't want to never:

```ts
type User$3 = {
    [K in keyof User]: User[K] extends Primitive
        ? User[K]
        : never
}
// { name: string, age: number, address: never }
```

This is close. But, that never type can cause issues in some scenarios. By mapping the value type to never, we are saying that for
any type to be compatible with `User$3`, address must not be present. Depending on the use case, this can be undesirable.

What if we want to just remove the keys which we don't want ?

To achieve that, instead of mapping the value type, we can map the key type to never for cases we want to omit: 

```ts
type User$4 = {
    [K in keyof User as (
        User[K] extends Primitive 
            ? K 
            : never
    )]: User[K]
}
// { name: string, age: number }
```

This is a bit less readable, but exactly what we wanted.
