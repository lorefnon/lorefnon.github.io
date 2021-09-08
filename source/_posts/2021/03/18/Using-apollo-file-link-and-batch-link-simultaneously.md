---
title: 'Using Apollo Upload Link and Batch Link together'
date: 2021-03-18
tags: [GraphQL, Apollo]
---

Apollo GraphQL client offers generic extensibility of the client-server interaction through a "Link" API. 

From the [official docs](https://www.apollographql.com/docs/react/api/link/introduction/), the high level idea is: 

> The Apollo Link library helps you customize the flow of data between Apollo Client and your GraphQL server. You can define your client's network behavior as a chain of link objects that execute in a sequence

This is conceptually pretty similar to middlewares in server-side routing libraries like express.

Links enable us to extend the capabilities of the graphql client in interesting ways.

[upload link](https://www.npmjs.com/package/apollo-upload-client) for example, uses an unofficial (but widely adopted among server implementation) [extension](https://github.com/jaydenseric/graphql-multipart-request-spec) for integrating file uploads in GraphQL API. 

[Batch link](https://www.apollographql.com/docs/react/api/link/apollo-link-batch-http/) is another  very useful link which is able to transparently combine multiple GraphQL operations into a single HTTP request without any code-change on the side of API invoker component.

However, the problem when using both of them in the same application, is that they are both terminating links. So we can not just add them both to our ApolloClient and call it a day. Whichever comes first, terminates the request and the other never gets executed.

However, batch link is particularly useful primarily for queries, and upload link is useful for mutations. So we simply needs a mediator that reroutes the request to one of the two after looking at the incoming request. 

This is made very easy by `ApolloLink.split` function: 

```js
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  Operation,
  NextLink,
} from '@apollo/client';

const batchLink = new BatchHttpLink(batchLinkOptions);

const uploadLink = createUploadLink(uploadLinkOptions);

// This split is needed because both batchLink and uploadLink are
// terminating links
//
const mediatorLink = ApolloLink.split(
  hasFile,
  batchLink,
  uploadLink
);
```

Here `hasFile` is a function that can return true/false depending on which of the subsequent links is to be selected. 

A simple implementation of `hasFile` can look like: 

```js
function hasFile(operation) {
    // A single GraphQL operation can comprise of a combination of multiple queries and mutation
    if (operation.query.definitions.find(it => it.operation === 'mutation')) {
        // Check if there is atleast one mutation present
        return false;
    }
    return true;
}
```

We have access to the complete operation object here, so we can also take a decision based on the name of the operation, variables we receive etc.

Now, instead of passing either of these links to the ApolloClient options, we can pass the mediator link instead:

```js
export const client = new ApolloClient({
  uri: '/graphql',
  link: mediatorLink,
  // ... other options
});
```