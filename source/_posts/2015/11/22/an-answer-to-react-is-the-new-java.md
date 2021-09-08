---
date: 2015-11-22
permalink: 2015/11/22/an-answer-to-react-is-the-new-java.html
layout: post
title: "An answer to \"React is the new Java\""
description: ""
category:
tags: [React, Javascript]
is_outdated: true

---

This post is essentially my attempt to answer some of the concerns presented in this [opinion](https://news.ycombinator.com/item?id=10609159) posted in HN. The author has likened the success of React with the success of Java, exemplifying how time again, what (s)he identifies as worse technology, has been pushed to a higher popularity rather than more competent alternatives available.

> I have been learning new technologies pretty much continuously. It's not impossible, especially if you follow sites like Hacker News, to keep a finger on the direction of the industry, and then try to stay on top of the next new hot technology of the year.

> But I hear you on the "worse" technology sometimes winning. You mentioned Java; it was worse than just about all other major contenders, and is only finally losing popularity.

> On a current technology fad: React seems to be designed to ignore 40 years of accumulated software best practices. [1] Separation of concerns? Who needs that any more? And the rationale for it is that it allows teams of 100 developers work together on an app.

## Separation of Concerns ?

Well, separation on concerns is a good thing to have. But only when the concerns actually translate to different responsibilities and not when they are multiple facets of the same problem.

The way I see it, managing an identifyable entity in the presentation layer is a singular concern. Breaking up this presentation entity into decoupled parts - a chunk of text based HTML template, a stylesheet to make this template visually appealing and associated javascript that alters the DOM structure depending on user interaction of change of application state, does not facilitate separation of concerns, it makes things less cohesive. [Loose coupling, High Cohesion](http://thebojan.ninja/2015/04/08/high-cohesion-loose-coupling/) is a classic best practice, proven time again, and React does not ignore this, it accentuates its importance.

Especially in web-applications the styling rules are intrinsically linked to the DOM structure of a widget and so is the javascript that is responsible for syncing the application state to and from the DOM. Multitude of javascript libraries have recognized this long before React including but not limited to widely popular libraries like [Knockout](http://knockoutjs.com/), [Dojo](https://dojotoolkit.org/) and [ExtJS](https://www.sencha.com/products/extjs/).

## Fads are not born from thin air

Promotion of best practices like [Stateless components](https://medium.com/@joshblack/stateless-components-in-react-0-14-f9798f8b992d#.h457qzmob) and [composition of higher order components](https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750#.6lh6otq97) goes a long way towards ensuring separation of concerns where they matter.

The upcoming Web Component technology is fueled by the widespread need for true component oriented building blocks and popularity of frameworks like Google Polymer highlights it very well.

## JSX and designer languages

> Open standards? Nah, how about lock-in to custom language extensions that will prevent you from migrating your code to the next web standard! Much better.

JSX is a custom language extension alright but it is not mandatory for using React. It is [fairly easy](http://jamesknelson.com/learn-raw-react-no-jsx-flux-es6-webpack/) to use vanilla javascript and benefit from all the features of React. In fact it is also easy to use React with other AltJS languages like [Coffeescript](http://blog.vjeux.com/2013/javascript/react-coffeescript.html), [Livescript](http://lorefnon.me/2015/09/21/react-and-livescript-in-harmony.html) and [Typescript](https://github.com/Asana/typed-react).

While I agree that without JSX, the code is much more verbose - there are solutions like [React hyperscript](https://github.com/mlmorg/react-hyperscript) that let you express the DOM structure within javascript, or [React Templates](https://github.com/wix/react-templates) and [React Jade](https://github.com/jadejs/react-jade) which allow you to use external templates with React.

Also there is a [draft specification](https://facebook.github.io/jsx/) for JSX in place and some other frameworks have already [started](https://github.com/insin/msx) adopting it.

## About open standards

### Web Components

The reasons for not using an open standard like web components have been [explained](https://github.com/facebook/react/issues/5052#issuecomment-145594782) by the React team:

> It has turned out that the spec is incomplete with regard to things like event delegation and there are still major changes being pushed from various sides, such as Mozilla. What was in Polymer/Chrome is not the final incarnation so we've had to revert some of the support that we already added (e.g. support for event handling in shadow trees).

> In terms of strategy, we'll go forward with as if it didn't exist and try to improve interop at the React or React-like component layer instead. I've talked with members of other popular UI frameworks and they seem to feel the same. In fact, we probably have a better chance at implementing solid interop in user land.

In fact there already exist some [resources](http://addyosmani.com/blog/component-interop-with-react-and-custom-elements/) for working with React and Web-components in same application.

There is nothing preventing us from migrating to the next web standard. As others have pointed out in the thread, removing JSX is just a matter of running the transformer against the existing codebase and checking in the generated javascript. The output is still human readable.

### XML in javascript

Attempts towards seamless incorporation of XML in ecmascript is not a new idea. Actionscript has had that since ages. While E4X is an [open standard](https://en.wikipedia.org/wiki/ECMAScript_for_XML), pragmatic reasons have been [put forward](http://blog.vjeux.com/2013/javascript/jsx-e4x-the-good-parts.html) by React team for not embracing it entirely:

> The major use case of XML within Javascript is to write HTML tags. Unfortunately, what E4X generates is not a DOM node. In order to use it to generate DOM nodes, you've got to do a conversion phase not provided by default.

> The second use case of XML is to represent data. In Javascript world, this use case is already being fulfilled by JSON. E4X only supports strings as a data type where Javascript objects can contain numbers, booleans, functions ...

> All the code is not going to be converted to E4X right away. There's going to be a transition phase where E4X and non E4X code will have to co-exist. The fact that the objects E4X generates are not accessible from non E4X code means that none of the libraries ever written can work with E4X structures.

## On meritocracy vs mediocracy

> And how many app teams have 100 or more active developers? Probably fewer than a dozen, and I submit that none of them probably should. Certainly not the Facebook app: It has a lot of features, but not that many features, and yet it has a 150Mb footprint.

> When I hear things like that, I can't help but fill in "junior" or "mediocre" in front of "developers." React helps to prevent people from breaking each others' code when you have bloated development teams filled with junior developers. React has some cool ideas, but all told I think it's a step backward for software engineering, and certainly isn't as much of a help for small teams, especially if you want to have a CSS/SCSS/LESS expert styling your product without having to dig through JSX files, for instance.

In a small app with a small team, there is little use for any framework at all, but software applications have this uncanny tendency to unexpectedly grow large depending on changing requirements, expanding scope. Given the above, I would certainly feel more comfortable working on a system where I can change the appearance of a component with confidence that will not introduce subtle changes in totally unrelated parts of my application, probably parts that I know nothing about.

While yes, there are fewer teams that have 100 or more active developers, but high churn rates are an unavoidable problem especially in the startup ecosystems. While a competent developer will certainly be able to jump into an unknown codebase and in due time figure out his/her way - but if the codebase is structured around best practices distilled by the community the time required in the same is drastically reduced. Optimizing the process around that seems like a very good idea.

## On stylesheets - a system of cascading problems

Adding to the problem is that automated regression testing of CSS is time consuming and error prone. While there are [solutions](https://css-tricks.com/automating-css-regression-testing/) I think the crux of the problem is that our current styling system is a broken technology - globally shared stylesheets are evil and technologies like [Radium](https://github.com/FormidableLabs/radium) are steps in the right direction.

While it isn't like we have not tried to solve this problem [before](https://gridstylesheets.org/), I am really glad to see practical alternatives to stylesheets gathering traction.

## The good parts

> I do like React's idea of the Virtual DOM for optimization, but you can get that without using React. [2] React Native is great for using native components and driving them from JavaScript, but it's also not the only game in town. [3]

I agree, much has been written about these benefits, and the availability of alternatives is not exactly a secret either. I don't have much to add.

## Conclusion

> Back to the original point, though: You can stay on top of the Hot New Technologies, but when there are good technical reasons to use alternate technologies, stay on top of those as well. And then explain clearly to your clients (or employers) why the current fad is a fad, and how to get the key benefits of that stack without its drawbacks. Oh, and choose clients (or employers) who will listen to strong technical arguments. :)

While I disagree with the primary premise, this is a very strong and sound advise. I whole-heartedly agree that solutions should be rationally vetted and benchmarked before being put to use. I hope that arguments I have presented above are perceived as rationally just. Any comments or suggestions are more than welcome.
