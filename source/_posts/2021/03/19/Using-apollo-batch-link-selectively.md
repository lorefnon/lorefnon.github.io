---
title: 'Using Apollo Batch Link selectively'
date: 2021-03-19
tags: [GraphQL, Apollo]
excerpt: An overview of how to exclude certain requests from being batched when using Apollo batch link
---

In a [previous post](/2021/03/18/Using-apollo-file-link-and-batch-link-simultaneously/) we have explored the concept of [Links](https://www.apollographql.com/docs/react/api/link/introduction/) in Apollo and usage of `ApolloLink.split` for routing requests selectively towards one of multiple terminating links.

This utility is also useful when we want to selectively batch our operations. 

The caveat with [Apollo batch-link](https://www.apollographql.com/docs/react/api/link/apollo-link-batch-http/) is that, the entire batch is delivered only once the slowest operation in the batch completes.

If we know ahead of time that some of our operations are expected to take longer time (We may at times be ok with that because they don't impact the user experience) then we can exclude them from batching.

The link selector predicate we pass to ApolloLink.split can look at the operation name and decide whether to route the request to BatchLink or normal HttpLink.

```js
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  Operation,
  HttpLink,
} from '@apollo/client';

const httpLink = new HttpLink({
  uri: "/graphql"
  // ...Additional options
});

const batchLink = new BatchHttpLink({
    batchInterval: 250
});

const operationBatchingBlacklist = new Set<string>();
operationBatchingBlacklist.add("someExpensiveOperation");

const mediatorLink = ApolloLink.split(
  function shouldBatchRequests({ operationName }: Operation) {
    return !operationBatchingBlacklist.has(operationName);
  },
  batchLink,
  httpLink
);

export const client = new ApolloClient({
  uri: '/graphql',
  link: mediatorLink
});
```
