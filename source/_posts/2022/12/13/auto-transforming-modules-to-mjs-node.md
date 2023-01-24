---
title: Auto-transforming modules to mjs using babel
tags: [Babel,Javascript]
date: 2022-12-13
---
The unfortunate reality of being a js library author in present day world is that we need to deal with multiple module systems and bundlers, which make life hard. 

While commonjs usage is declining, many users are yet to move to esm fully.

Solutions like tsup provide a nice DX for deploying libraries by bundling separately to an artifact of each configured module type. 

However, for nodejs libraries I often prefer to not bundle my libraries, and thankfully babel ecosystem makes it easy to handle these scenarios.

This post outlines a simple babel setup where: 

1. We author code without needing explicit extensions in import: 
    ```ts
    // bar.ts

    import { foo } from "./foo"
    ```

2. As part of build, we generate `.mjs` modules where the relative imports are also transformed to use `.mjs`:

    ```ts
    // bar.mjs

    import { foo } from "./foo.mjs"
    ```

Benefit of this setup is that the generated .mjs modules can co-exist alongside .cjs modules.

Consumers of the module can either explicitly import with mjs extension (eg. `import { foo } from "foo-lib/foo.mjs"`) or configure their bundler/runtime to default to mjs if they prefer mjs.

Note that this setup does not fully emulate node-specific module resolution. For example: `import { foo } from "./foo"` will not be auto-resolved to `import { foo } from "./foo/index.js"` if foo is directory.

Babel config: 

```js
module.exports = {
    presets: [
        '@babel/preset-typescript',
        ['@babel/preset-env', {
            targets: {
                node: 16
            },
            modules: false
        }]
    ],
    plugins: [
        ['babel-plugin-replace-import-extension', {
            extMapping: {
                '': '.mjs'
            }
        }]
    ]
}
```

```sh
babel src \
    --config-file ./babel.esm.config.js \
    --out-dir dist \
    --out-file-extension ".mjs" \
    --extensions ".ts" \
    --ignore "**/*.d.ts"
```

