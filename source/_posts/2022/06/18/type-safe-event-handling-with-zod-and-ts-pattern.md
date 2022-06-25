---
title: Type-safe event handling in Typescript with zod and ts-match
tags: [typescript, zod, ts-match]
popular: true
date: 2022-06-18
discussions:
    mastodon:
        id: '108499918533228631'
---

# Event handling

It is no surprise to anyone that event handling is bread and butter in javascript. However, often we receive several types of events from an event source which makes handling them in a type-safe manner harder. Eg. if we are consuming websocket events on the backend we may write something like: 

```ts
import ws from "ws"

export const app = express()

const server = app.listen(3000)

const wss = new ws.Server({ server })

wss.on("connection", (ws: ws.WebSocket) => {
    ws.on("message", (data) => {
        const parsed = JSON.parse(data); 
               ^
               `----- any :(
    })
})
```

Similarly we could be receiving a message from a different window/frame through postMessage, or another peer over a webrtc data channel, the problem remains the same: After receiving the data we need to disambiguate it into one of the multiple possible types of messages and branch out the handling logic from there.

The most basic way would be to write a [type-guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) for each possible type.

Typescript offers flow-sensitive typing so once we have established in a branch that a value is of a particular type, we do need any extra casts. 

So we could write something like this: 

```ts
interface PostDetails {
    title: string;
    description: string;
}

// Types for our events:
interface CreatePost {
    type: "CreatePost",
    data: PostDetails
}

interface UpdatePost {
    type: "UpdatePost",
    data: PostDetails
}

// Type-guards for different message types
const isCreatePost = (event: any): event is CreatePost => event.type === "CreatePost"
const isUpdatePost = (event: any): event is CreatePost => event.type === "UpdatePost"

// Later in our message receiver: 

ws.on("message", (data) => {
    const parsed = JSON.parse(data); 
    if (isCreatePost(parsed)) {
        ws.send(handleCreatePost(parsed))
        //                       ^
        //                       `---- type of parsed is CreatePost in this branch
    } else if (isUpdatePost(parsed)) {
        ws.send(handleUpdatePost(parsed))
        //                        ^
        //                         `---- type of parsed is UpdatePost in this branch
    }
    // ....
})
```

This works, but it is quite a bit of boilerplate to discriminate/disambiguate between different possible types. This boilerpate is also repetitive if we adopt a convention that we will always discriminate the types based on a `type` attribute which all the events will have. 

Other issue is that we are trusting the rest of the shape of the data based on the type attribute. Our type-guards (isCreatePost, isUpdatePost etc.) just check for the type property - and assumes that rest of the properties are as expected. If the websocket client sends an invalid object like `{ type: "CreatePost" }` (no data) we will get a runtime error which may surface deeper inside the handling logic with a confusing stack trace. 

When we are receiving data over a network boundary or from a persisted store, it is generally safer to validate the complete payload at the boundary itself (which is our message receiver function in this example) and fail early with a clean error.

We could write our type-guard to be more defensive like: 

```ts
const isCreatePost = (event: any): event is CreatePost => {
    return event.type === "CreatePost" &&
        typeof event.data === "object" &&
        typeof event.data.title === "string" &&
        typeof event.data.description === "string";
}
```

But this is now a ton of additional work. 

This is also error prone because tomorrow if we add another field in PostDetails we will also need to update all these type-guards to accomodate the same. They have to kept in sync manually with no help from type-checker whatsoever.

Fortunately, we have libraries to simplify this validation logic for us. One such library is [zod](https://github.com/colinhacks/zod) which is what I currently use in my production applications.

With zod we can define the shape of our events through zod's API: 

```ts
import * as zod from "zod";

const PostDetailsSchema = z.object({
    title: z.string(),
    description: z.string()
});

const CreatePostSchema = z.object({
    type: z.literal("CreatePost"),
    data: PostDetailsSchema
});

const UpdatePostSchema = z.object({
    type: z.literal("UpdatePost"),
    data: PostDetailsSchema.partial()
})
```

The benefit of defining these schema objects, is that we are able to perform runtime validation of unknown data.

So our isCreatePost type-guard can be written as: 

```ts
const isCreatePost = (event: any): event is CreatePost =>
    CreatePostSchema.safeParse(event).success
```

We also don't have to manually define the typescript interfaces for `CreatePost`, `UpdatePost` etc. ourselves. They can instead be inferred from the Schema objects. 

```ts
type CreatePost = z.TypeOf<typeof CreatePostSchema>;
type UpdatePost = z.TypeOf<typeof UpdatePostSchema>;
```

The above approach of discriminating between multiple types using a shared property is very common in practice, and we call union of such types as discriminated unions. 

Zod has built in support for discriminated unions, and we can define an EventSchema as follows: 

```ts
//                                          ,---- Property based on which we will discriminate
//                                         V           the members of our union type
const EventSchema = z.discriminatedUnion("type", [
    CreatePostSchema,
    UpdatePostSchema
])
```

Often, we won't define the individual members separately: 

```ts
const EventSchema = z.discriminatedUnion("type", [
   z.object({
     type: z.literal("CreatePost"),
     data: PostDetailsSchema
   }),
   z.object({
     type: z.literal("UpdatePost"),
     data: PostDetailsSchema
   })
])
```

which is exactly the same as above. 

If we use the previously mentioned TypeOf type to get the static type of EventSchema we will get a union of the CreatePost and UpdatePost types. 

```ts
type Event = z.TypeOf<typeof EventSchema>
```

The above will be inferred as: 

```ts
type Event = 
    | { type: "CreatePost", data: { title: string, description: string } }
    | { type: "UpdatePost", data: { title?: string, description?: string } }
```

which is effectively: 

```ts
type Event = CreatePost | UpdatePost
```

One additional thing that we gain from defining a discriminated union is an exhaustiveness check. So we if we use `EventSchema.parse(someData)` this will throw a runtime error if someData does not conform to the complete shape of one of the errors.

We can write our handler as: 

```ts
ws.on("message", (data) => {
    try { 
        const parsed = EventSchema.parse(JSON.parse(data)); // Parse will throw for invalid events
        //     ^
        //      `--- CreatePost | UpdatePost
        switch (parsed.type) {
        case "CreatePost":
            ws.send(handleCreatePost(parsed)) 
            //                        ^
            //                        `---- type of parsed is CreatePost in this branch
            return; 
        case "UpdatePost":
            ws.send(handleUpdatePost(parsed))
            //                      ^
            //                       `---- type of parsed is UpdatePost in this branch
            return;
        }
    } catch (e) {
        console.error(e);
        // Also see https://github.com/colinhacks/zod#error-formatting
    }
})

```

However, it would be also nice to have this exhaustiveness check enforced in our handler at compile time. The way our code is currently written, tomorrow if we add a new type of event in the discriminated union, but forget to add an if-else branch in the above code, it will get silently ignored - Not great. 

We can take advantage of the typescript compiler option [noImplicitReturns](https://www.typescriptlang.org/tsconfig#noImplicitReturns) to enforce this: 

```ts
ws.on("message", (data) => {
    try { 
        ws.send(handleEvent(EventSchema.parse(JSON.parse(data)))); // Parse will throw for invalid events
    } catch (e) {
        console.error(e);
    }
});

const handleEvent = (event: Event) => {
    switch (event.type) {
        case "CreatePost":
            return handleCreatePost(event);
        case "UpdatePost":
            return handleUpdatePost(event);
    }
}
```

Note that our switch statement does not have a default case. 

So if we update our Event have another variant like: 

```ts
const EventSchema = z.discriminatedUnion("type", [
   z.object({
     type: z.literal("CreatePost"),
     data: PostDetailsSchema
   }),
   z.object({
     type: z.literal("UpdatePost"),
     data: PostDetailsSchema.partial()
   }),
   z.object({
     type: z.literal("DeletePost"),
     data: z.object({ id: z.string() })
   })
])
```

None of the switch-case branches will now match for `DeletePost` and we will end up with a possible branch of code that returns implicitly. Typescript will now complain about that.

We could wrap-up the post here - given that we have accomplished all the type-safety features we wanted. However, I am not a huge fan of having to rely on implicit returns (or similar workarounds) for exhaustiveness check. 

In many functional languages, we have support for [pattern-matching](https://abitofocaml.weebly.com/12-pattern-matching.html) with built in support for exhaustiveness check. Typescript does not have this at the moment but there are userland implementations that emulate pattern matching. One such library is [ts-pattern](https://github.com/gvergnaud/ts-pattern), which I have found to work very well in practice. 

With ts-pattern we could write our handler as: 

```ts
import { match } from "ts-pattern";

// --- 

match(event)
    .with({ type: 'CreatePost' }, handleCreatePost)
    .with({ type: 'UpdatePost' }, handleUpdatePost)
    .exhaustive()   // <--- will be a type error if Event type has any other union members
```

Not only is this more succinct for this use case, ts-pattern becomes more useful when we have more complex scenario like combining multiple predicates or performing checks based on multiple properties. Take a look at some of their examples in the [docs](https://github.com/gvergnaud/ts-pattern#readme).

Also, unlike our switch-case or if-else examples above, the entire match invocation is a single expression so we could use the return value of our handler without needing temporary variables.

```ts
ws.send(
    match(event)
        .with({ type: 'CreatePost' }, handleCreatePost)
        .with({ type: 'UpdatePost' }, handleUpdatePost)
        .exhaustive()
)
```

Cool, eh ?
