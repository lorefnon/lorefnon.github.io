---
title: Integrating hono and graphql yoga
tags: [GraphQL,Hono,Node.js]
date: 2023-12-17
permalink: 2023/12/17/integrating-hono-and-graphql-yoga/
---

[Hono](https://hono.dev/) is a lightweight web micro-framework that is compatible with many js runtimes like Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, Netlify, Lagon, AWS Lambda, Lambda@Edge, and Node.js.

This quick recipe illustrates how to integrate hono with [graphql-yoga](https://the-guild.dev/graphql/yoga-server) to serve a GraphQL API. Yoga is quite [flexible](https://the-guild.dev/graphql/yoga-server/docs/integrations/z-other-environments) about the underlying request handling library.

```ts
import { serve } from "@hono/node-server"
import { createYoga } from "graphql-yoga"
import { Hono } from "hono"
import { getConfigParam } from "./config.js"
import { schema } from "./schema.js"

const app = new Hono()

const yoga = createYoga({
  schema,
  logging: "debug",
  plugins: [/* Add any plugins here */],
})

// Configure hono to delegate graphql requests to GraphQL Yoga
app.use("/graphql", async (context) =>
  yoga.handle({
    request: context.req.raw,
  }, {})
)

serve(app, (info) => {
  console.log(`Listening on http://localhost:${info.port}`) // Listening on http://localhost:3000
})
```

`schema` being imported here is a [GraphQLSchema](https://graphql-js.org/api/class/GraphQLSchema) instance. You can generate it through any graphql-js compatible library that you are familiar with.

If you don't have a preference already, I recommend [Garph](https://garph.dev/). It makes it quite convenient to define type safe GraphQL schemas in pure typescript without needing any code generation. And of course, it plays well with graphql-yoga.

```ts
import { g, InferResolvers, buildSchema } from 'garph'
import { createYoga, YogaInitialContext } from 'graphql-yoga'
import { createServer } from 'http'

const queryType = g.type('Query', {
  greet: g.string()
    .args({
      name: g.string().optional().default('Max')
    })
    .description('Greets a person')
})

const resolvers: InferResolvers<{ Query: typeof queryType }, { context: YogaInitialContext }> = {
  Query: {
    greet: (parent, args, context, info) => `Hello, ${args.name}`
  }
}

const schema = buildSchema({ g, resolvers })
```
