---
date: 2015-11-15
permalink: 2015/11/15/a-minimal-setup-for-using-es6-modules-in-rails.html
layout: post
title: "A minimal setup for using ES6 modules in Rails"
tags: ['Rails', 'Javascript', 'ES6']
excerpt: "`browserify-rails` + `babelify` is a hassle-free solution if you are planning to use ES6 modules with sprockets, compared to the officially recommended `sprockets-es6`."
is_outdated: true

---

While ES6 adoption is progressively improving across browsers, and the sprockets team is planning to integrate ES6 features into Rails asset pipeline in near future, using a widely popular transpiler: [Babel](https://babeljs.io) we can leverage many of those features right away. The specific aspect of interest for this post is ES6 modules feature which provides a standardized module system for javascript.

While babel does have a solution for ES6 modules, rather than handling dependency resolution itself - it transpiles the modules to existing javascript based module systems - the most popular ones being [AMD](https://github.com/amdjs) and [CommonJS](https://commonjs.org). This post does not go into a compartive analysis of them, but there is an excellent [article](addyosmani.com/writing-modular-js/) by [Addy Osmani](https://twitter.com/addyosmani) which provides an in-depth elaboration on the topic.

The solution [recommended](https://babeljs.io/docs/setup/#rails) by the Babel team for using babel with rails, is through an experimental [sprockets-es6](https://github.com/TannerRogalsky/sprockets-es6) gem, which is intended to be a PoC for future work to be integrated into Sprockets. Quoting from the README:

> This plugin is primarily experimental and will never reach a stable 1.0. The purpose is to test out BabelJS features on Sprockets 3.x and include it by default in Sprockets 4.x.

Apart from the experimental status, the key issue with using this gem is that it is non-trivial to get ES6 modules to work with it. The primary reason being that, as mentioned above, even though babel transpiles ES6 modules to CommonJS (or AMD), we still need to provide an implementation of the relevant module system that will enable the browsers to recognize the modules. This means we will have to include another dependency like [sprockets-commonjs](https://github.com/maccman/sprockets-commonjs). However there is a caveat:

> One caveat to the approach this library takes, is that dependencies loaded through require() will not be added to the dependency graph. This library will not parse the AST tree for require calls. This decision has been made for a variety of reasons, but it does mean you need to require files through both CommonJS and Sprockets.

Using AMD modules with [requirejs-rails](https://github.com/jwhitley/requirejs-rails) is something that works, however javascript community has largely adopted [npm](https://npmjs.com) for package management framework. For example - jQuery plugin repository now states:

> The jQuery Plugin Registry is in read-only mode.
> New plugin releases will not be processed.
> We recommend moving to npm, using "jquery-plugin" as the keyword in your package.json. The npm blog has instructions for publishing your plugin to npm.

There is however a simpler solution: Using the gem [browserify-rails](https://github.com/browserify-rails/browserify-rails) which bridges sprockets and [browserify](http://browserify.org/). Browserify is a javascript bundler that leverages CommonJS :

> Browserify lets you require('modules') in the browser by bundling up all of your dependencies

The great thing about browserify is that we can hook in transforms which can take care of additional pre-processing before the `require`d files are bundled up. Of particular interest to us, is the browserify transform for babel - [babelify](https://github.com/babel/babelify) which allows us to  sidestep the caveat above. We need to have a node installation on the system though, just having a javascript runtime is not sufficient - but this is not much of an issue because node.js is now widely supported on all widely used platforms.

To get this to work we need to add `browserify-rails` to Gemfile:

```ruby
gem "browserify-rails"
```

as well as a `package.json` in project root:


```javascript
{
    "name": "something",
    "license": "MIT",
    "engines": {
        "node": ">= 0.10"
    },
    "dependencies": {
        "babel-preset-es2015": "^6.1.18",
        "babelify": "^7.2.0",
        "browserify": "~> 10.2.4",
        "browserify-incremental": "^3.0.1"
    }
}
```

If we want to use other javascript libraries available through npm we can include them directly in the package.json. There is a single caveat though: We can not directly start using ES6 modules in our top level files (typically application.js) but only in our `require`d files:

So our application.js can be fairly minimal with a single require statement:

```javascript
require('./main')
```

Now we can use ES6 modules in main.js

main.js:

```javascript
import hello from './hello'

hello()
```

hello.js:

```javascript
function hello() {
    alert('hello world');
}

export default hello;
```

If we run the server now and visit the home page, we should be greeted with a hello prompt.
