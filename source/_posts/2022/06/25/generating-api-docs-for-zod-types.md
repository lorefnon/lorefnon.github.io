---
title: Generating API docs for zod-types
tags: [typescript, zod]
date: 2022-06-25
permalink: 2022/06/25/generating-api-docs-for-zod-types/
---

I often like to use [zod](https://github.com/colinhacks/zod) for validating user provided options in the public API in typescript projects. Zod offers a really nice validation & type inference support and it is nice to be able to fail early for invalid options even if consumer is not using typescript.

Generating API documentation is a bit of trouble though, for these types. [Typedoc](https://typedoc.org/) is a nice documentation generator I frequently use, but it does not have any specialized zod support and works best when types are defined through normal typescript interfaces.

So what do we do ? 

Interestingly, typescript is able to propagate comments through inheritance hierarchy and mapped types.

So if we have a zod-type as follows: 

```ts
import * as z from "zod";

const UserSchema = z.object({
    /** Full name of user */
    name: z.string()
})
```

and later define an interface that extends the type inferred from this: 

```ts
interface User extends z.TypeOf<typeof UserSchema> {}
```

The generated documentation of User will contain the comments for name property.

This unfortunately works only for Object types as long as we don't introduce any unions and intersections - any base type of an interface must have statically known members. This also doesn't work well for nested object types as typedoc will pick only the types at top level.

For more complex types, a simple workaround is to extract interfaces for constituent types and link them in the documentation. 

So instead of:

```ts
const UserDetailsSchema = z.object({
    profile: z.object({
        name: z.string()
    }).nullish()
});
```

We'd write: 

```ts
const ProfileSchema = z.object({
    /** Full name of user */
    name: z.string()
});

interface Profile extends z.TypeOf<typeof ProfileSchema> {}

const UserDetailsSchema = z.object({
    /** See {@link Profile} */
    profile: Profile.nullish()
})

interface UserDetails extends z.TypeOf<typeof UserDetailsSchema> {}
```

This increases the boilerplate a bit, but is otherwise quite practical.

