---
title: 'Vue composition API and type-safe GraphQL access'
date: 2021-08-07
tags: [Vue, GraphQL, Apollo, TypeScript]
excerpt: An overview of how the vue composition API can significantly reduce the boilerplate around GraphQL integration
popular: true
---

# About setup script


The [vue composition API](https://v3.vuejs.org/guide/composition-api-introduction.html) is pretty cool, esp. with the recent addition of [setup script support](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md) in [Vue 3.2](https://blog.vuejs.org/posts/vue-3.2.html) which drastically reduces unnecessary boilerplate when most of the logic is present in the setup function of the component.

From the announcement post:

> `<script setup>` is a **compile-time syntactic sugar** that greatly improves the ergonomics when using Composition API inside SFCs.

```html
<script setup>
import { ref } from 'vue'

const color = ref('red')
</script>

<template>
  <button @click="color = color === 'red' ? 'green' : 'red'">
    Color is: {{ color }}
  </button>
</template>
```

# GraphQL through Composition API

With [vue-apollo-composable](https://v4.apollo.vuejs.org/) we can use a composable API to access our GraphQL API which can take advantage of above support.

Lastly, using [gql-tag-operations-preset](https://www.graphql-code-generator.com/docs/presets/gql-tag-operations) we can ensure that we get type-safety while accessing resources over GraphQL.

This combination works seamlessly and unlike previous codegen based approaches doesn't require us to manually import types or functions generated from graphql files.

The rest of this post is primarily an overview of the involved configuration.

# Dependencies

Currently, my preferred way to get started with Vue project is to scaffold it through vite (`yarn create vite`) which internally uses the really fast [esbuild](https://github.com/evanw/esbuild) native transpiler.

Other build tools may require minor adjustment around import aliasing.

Here is what our package.json looks like:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "serve": "vite preview",
    "codegen:graphql": "yarn run graphql-codegen -c graphql-codegen.yaml"
  },
  "dependencies": {
    "@apollo/client": "^3.4.5",
    "@graphql-typed-document-node/core": "^3.1.0",
    "@vue/apollo-composable": "^4.0.0-alpha.14",
    "graphql": "^15.5.1",
    "graphql-tag": "^2.12.5",
    "vue": "^3.0.5",
    "vue-router": "4"
  },
  "devDependencies": {
    "@app/gql": "link:./src/gql",
    "@graphql-codegen/cli": "^2.0.1",
    "@graphql-codegen/gql-tag-operations-preset": "^1.0.1",
    "@graphql-codegen/typescript-graphql-request": "^4.0.0",
    "@vitejs/plugin-vue": "^1.4.0",
    "@vue/compiler-sfc": "^3.1.5",
    "typescript": "^4.3.5",
    "vite": "^2.5.0-beta.1",
    "vue-tsc": "^0.2.2"
  }
}
```

# Configuration for graphql-code-generator

We have a `codegen:graphql` script configured above, which we can use to generate types for our GraphQL accessors.

Here is what our `graphql-codegen.yaml` looks like:

```yaml
schema: ./schema/schema.graphqls
documents:
  - 'src/**/*.ts'
  - 'src/**/*.vue'
  - '!src/gql/**/*'
generates:
  ./src/schema/generated/graphql.d.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
  ./src/gql/:
    preset: gql-tag-operations-preset
```

From the docs for [gql-tag-operations-preset](https://www.graphql-code-generator.com/docs/presets/gql-tag-operations):

> This preset generates typings for your inline gql function usages, without having to manually specify import statements for the documents. All you need to do is import your gql function and run codegen in watch mode.

Since `yarn run` forwards our arguments to the underlying scripts, to run the aforementioned watch mode, we can simply run:

```sh
yarn run codegen:graphql --watch
```

This will keep scanning our code for usage of graphql queries/mutations and generate corresponding types.

We will look at some examples below.

## Import aliasing:

The last piece of setup we need to do is configuration for imports.

This may get simplified in future, but as of this writing this needs to be done in both tsconfig.json (in case you are using typescript,  make typescript compiler & editor tooling happy) and vite config (to make vite happy).

In `tsconfig.json`:

{% hlcode lang:json highlight:12-14 %}
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["esnext", "dom"],
    "paths": {
      "@app/gql": ["./src/gql"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"]
}
{% endhlcode %}

In `vite.config.ts`:

{% hlcode lang:typescript highlight:12 %}
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      "@app/gql": resolve(__dirname, "./src/gql")
    }
  }
})
{% endhlcode %}

What this enables us to do is to import a helper function from `@app/gql` which we will use to make graphql queries (or perform mutations).

And the watcher will keep adding overloads to this helper for each of our usage.

# Usage in application

Here is what a usage of this helper looks like in our component:

```html
<template lang="pug">
div(v-if="loading")
  | Loading ...
div(v-else)
  div(v-if="result?.currentUser")
    | Hello {{ result.currentUser.name }}
  div(v-else)
    | Not logged in
</template>

<script lang="ts" setup>
import { gql } from "@app/gql"
import { useQuery } from "@vue/apollo-composable"

const { result, loading } = useQuery(
    gql(/* GraphQL */ `
        query CurrentUserQuery {
            currentUser {
                name
            }
        }
    `)
)
</script>
```

Note that other than `gql` we didn't need to import anything else. And we may get a type error initially, it will quickly disappear once our watcher generates the necessary overloads, and our `result` and `loading` variables will be correctly typed as vue refs.

The result's value type will be derived from our query and if we update the query, the type will auto-update too.

And because these are reactive refs, we can directly use them in templates without needing any watchers or cleanup code.

Lastly, if you are curious, here is what the overloads generated look like:

```typescript
import * as graphql from './graphql';

const documents = {
    "query CurrentUserQuery {...}": graphql.CurrentUserQueryDocument,
};

export function gql(source: "query CurrentUserQuery {...}"): (typeof documents)["query CurrentUserQuery {...}"];

export function gql(source: string): unknown;
export function gql(source: string) {
  return (documents as any)[source] ?? {};
}
```

Not quite pretty :), but usually you never have to peek into this file at all.
