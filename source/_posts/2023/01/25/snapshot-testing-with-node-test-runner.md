---
title: Snapshot testing with node test runner (node:test)
tags: [Node.js,Javascript]
date: 2023-01-25
permalink: 2023/01/25/snapshot-testing-with-node-test-runner/
---

While there are a lot of popular test runners in node.js ecosystem, like jest, mocha etc. node has recently introduced a built in test runner available as `test` package in the standard library. The [official documentation](https://nodejs.org/api/test.html) describe the usage, and it should look familiar to people coming from most popular testing libraries.

```ts
import { describe, it } from "node:test";
import assert from "node:assert"

describe('A thing', () => {
  it('should work', () => {
    assert.strictEqual(1, 1);
  });
});
```

However, one aspect that it does not handle currently is snapshot testing. 

As popularised by [Jest](https://jestjs.io/), snapshot testing is a convenient mechanism to ensure that certain computed values don't change across test runs by storing the result on first run and comparing with the stored value in subsequent runs. [Jest docs](https://jestjs.io/docs/snapshot-testing) explain the concept in more detail.

Fortuantely, using the library  [snap-shot-core](https://www.npmjs.com/package/snap-shot-core) we can easily integrate snapshot testing with `node:test` without needing to switch to another testing library.

```ts
import Snap from "snap-shot-core"

describe('User insertion', () => {
    it('inserts new row', async () => {
        await UserService.createUser({
            email: 'janedoe@example.com'
        })
        const user = await UserService.findByEmail('janedoe@example.com')
        Snap.core({
            what: user,
            file: __filename,
            specName: 'inserts new row'
        })
    })
})
```

This will write a snapshot file if not present, or validate against once if present. 

Note that one caveat here is that, being a standalone library we needed to explicitly specify the specName.

If using the `test` function from `node:test`, we have access to the test name through `testContext.name`, which we can pass to this lib. 

```ts
import Snap from "snap-shot-core"

test('user insertion', (testCtx) => {
    await UserService.createUser({
        email: 'janedoe@example.com'
    })
    const user = await UserService.findByEmail('janedoe@example.com')
    Snap.core({
        what: user,
        file: __filename,
        specName: testCtx.name
    })
})
```

However, for BDD style tests, we don't have the test context injected. One convenient solution to prevent the spec names from getting out of sync is to use named functions. 

```ts
describe('User insertion', () => {
    it(async function insertsNewRow() { // <-- Spec name inferred from function name
        await UserService.createUser({
            email: 'janedoe@example.com'
        })
        const user = await UserService.findByEmail('janedoe@example.com')
        Snap.core({
            what: user,
            file: __filename,
            specName: insertsNewRow.name
        })
    })
})
```

Lastly, if our test files are ES modules, we won't have access to `__filename`. We can instead use the `fileURLToPath` utility.

```ts
import Snap from "snap-shot-core"
import { fileURLToPath } from 'url'

describe('User insertion', () => {
    it(async function insertsNewRow() {
        await UserService.createUser({
            email: 'janedoe@example.com'
        })
        const user = await UserService.findByEmail('janedoe@example.com')
        Snap.core({
            what: user,
            file: fileURLToPath(import.meta.url),
            specName: insertsNewRow.name
        })
    })
})
```
