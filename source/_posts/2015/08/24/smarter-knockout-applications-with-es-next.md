---
date: 2015-08-24
permalink: 2015/08/24/smarter-knockout-applications-with-es-next.html
layout: post
title: Smarter knockout applications with ES6/7
tags: [Javascript, KnockoutJS]
is_outdated: true

---

# Overview

This post is an outline of ES6/7 features that we can leverage today in our [Knockout](http://knockoutjs.com) based applications to make them more maintainable.

Thanks to powerful and reliable transpilers like [Babel](http://babeljs.io) we don't have to wait for mass adoption across browser vendors, to try out features from next generation javascript. While this post is essentially an overview written in a specific context, ie. Knockout applications, I encourage readers to refer to excellent online resources like [Javascript Allonge](https://leanpub.com/javascriptallongesix) for a broader coverage.

## View Models as ES 6 classes:

View models are typically defined as javascript constructor functions. ES6 classes offer a bit of syntax sugar over prototypal inheritance and the outcome might appeal to people coming other object oriented languages.

```javascript
class SomeViewModel {
  constructor() {
    this.firstName = ko.observable();
  }
}

ko.components.register({
  viewModel: SomeViewModel,
  template: '<div data-bind="text: firstName"></div>'
})
```

## Arrow functions in computed properties:

In computed properties it is more often than not desirable that the context of function be the same as that of the outer function. Patterns like `var self = this` have been adopted widely for situations like this.

```javascript
function SomeViewModel() {
  this.firstName = ko.observable();
  this.lastName = ko.observable();
  var self = this;
  this.fullName = ko.computed(function() {
    return self.firstName() + ' ' + self.lastName();
  });
}
```

Arrow functions simplify this use case by providing special syntax for functions which, as MDN [explains](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) it, capture the this value of the enclosing context

```javascript
class SomeViewModel {
  constructor() {
    this.firstName = ko.observable();
    this.lastName = ko.observable();
    this.fullName = ko.computed(() => {
      return this.firstName() + ' ' + this.lastName();
    });
  }
}
```

Or for smaller functions we can reduce the verbosity even further:

```javascript
class SomeViewModel {
  constructor() {
    this.firstName = ko.observable();
    this.lastName = ko.observable();
    this.fullName = ko.computed(() => this.firstName() + ' ' + this.lastName());
  }
}
```

## Imports for code organization:

JS imports are the new standard approach to deal with modularization in JS code, and I can only anticipate [more](https://angular.io/) and [more](http://aurelia.io/) libraries moving to them from older patterns like [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) or [CommonJS](http://wiki.commonjs.org/wiki/CommonJS). Babel can transpile imports to require invocations that follow AMD/CommonJS syntax so you can move to newer syntax progressively and continue using your existing loaders/bundlers. My personal recommendation for bundler is [webpack](http://webpack.github.io/) which offers interesting features like [Code splitting](http://webpack.github.io/docs/code-splitting.html) out of the box.

## Template strings

Template strings make it easy to define small multi-line templates along side view models.

```
ko.components.register({
  viewModel: SomeViewModel,
  template:
    `<div>
      <h1> Hello friend, nice to meet you </h1>
      <div>
        Dear <span data-bind="text: firstName()"></span> It is nice to meet you.
      </div>
    </div>`
});
```

Although for larger templates I recommend using something like [webpack-raw-loader](https://github.com/webpack/raw-loader) so you can write:

```javascript
ko.components.register({
  viewModel: SomeViewModel,
  template: require('./some_view_model.html')
});
```

However larger templates more often than not indicate need for fine-grained modularization, so the above recommendation should be taken with a pinch of salt.

## ES7 Decorators for Component registration:

If you have been keeping up with advancements with Angular 2.0, you may have noticed the use of annotations for component registration. Here is an example from their [quick start tutorial](https://angular.io/docs/js/latest/quickstart.html) showing how annotations go hand in hand with the new class syntax:

```
// Annotation section
@Component({
  selector: 'my-app'
})
@View({
  template: '<h1>Hello {{ name }}</h1>'
})
// Component controller
class MyAppComponent {
  name: string;
  constructor() {
    this.name = 'Alice';
  }
}
```

While I refer to [this excellent writeup](https://github.com/wycats/javascript-decorators) by [Yehuda Katz](https://twitter.com/wycats) on javascript decorators for an indepth overview, the following snippet is a quick overview as to how we can leverage javascript decorators to handle component registration in knockout:

```
function Component(params) {
  return function(viewModel) {
    ko.components.register(params.name, {
      viewModel: viewModel,
      template: params.template
    })
  }
}
```

Once our `Component` decorator has been defined we can simply use it like this:

```
@Component({
  name: 'my-app-component',
  template:
    `<div>
      ...
    </div>`
})
class MyAppViewModel {
  constructor() {
    ...
  }
}
```

You may be tempted to use the `target.name` to enforce some module naming conventions, but before you tread that way please be aware of lack of IE support for [Function#name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name).

This concludes this overview for now, though there is a lot to be explored in next generation javascript beyond this basic introduction. As always, I welcome any suggestions or requests for improvement in the comments section below.
