---
date: 2012-08-11
permalink: 2012/08/11/debunking-10-common-knockoutjs-myths.html
layout: post
title: "Debunking 10 common KnockoutJS myths"
tags: [Javascript, KnockoutJS]
is_outdated: true
post_warnings: 
    - I no longer recommend using knockout.js for newer projects. You may be better served by MobX or Effector.
---

It seems that among the developer community, there exist multiple misconceptions regarding KnockoutJS. This is particularly true for developers who are not familiar with the MVVM pattern or declarative style followed by Knockout. This posts aims to clarify some of these misconceptions.

I was particularly motivated to write this post after [this discussion](http://stackoverflow.com/questions/5112899/knockout-js-vs-backbone-js-vs/6340870#6340870) at Stackoverflow.

KnockoutJS is tied to specific server side back-ends.
=============================================================

This mainly stems from the similarities of the declarative binding style used in KO with the WPF declarative bindings. Since I do not work with Microsoft technologies, I can not really assert if the WPF declarative binding style was indeed an inspiration behind KO, however I would like to highlight that KO is strictly a client side library and an ASP.net backend (or any specific server side backend for that matter) is not mandatory. In fact KO will work happily with no server-side code at all. I strongly recommend people to checkout the basic examples presented in the site using jsfiddle and convince yourself that this is indeed the case.

On a sidenote, there do exist libraries that aim to provide seamless integration layers between KO and ASP.net MVC eg. KnockoutMVC which claims to facilitate creation of complex client side applications without writing a single line of javascript. I strongly advocate against using such esoteric frameworks.

KnockoutJS has hard-wired dependency on jQuery and jQuery-templating plugin.
============================================================================

Again this is absolutely incorrect. The core functionality provided by KO is framework agonistic. And as far as templating is concerned integrating of third party templating engines is not very difficult. Since KO is open source you can probably find support for your favourite templating engine already available. For example the ko.mustache extension by Marcin Wtorkowski adds support for mustache templating engine.

Because of the level of abstraction offered by declarative bindings, KnockoutJS is difficult to debug.
======================================================================================================

While it is true that KO hides away the boiler plate code for data synchronization and the users are concerned with declaring the bindings in attributes, when things go wrong (either at your end or if you happen to discover a bug in the library) you will have to dig into the layers of abstraction. Fortunately in case of KO, the abstractions are not very convoluted and a basic understanding of the binding management lifecycle makes debugging pretty easy. KO source code is well written and not very difficult to understand, although that certainly is a subjective opinion.

I plan to highlight some guidelines for debugging KO applications in a future post.

It is difficult to properly test a KnockoutJS application.
==========================================================

There is simply no reason for this to be true considering that KO is plain simple javascript. In particular KO is well tested and has a comprehensive test suite, which alleviates the developer from writing test cases for boilerplate code for managing data synchronizations. The domain logic is still javascript and KO does not abstract away any client-server interaction so testing the core of your application mostly involves testing your own javascript code only.

Also, with a basic understanding of KO handlers, the bindingHandlers can be mocked, providing a greater control to the developer.

KnockoutJS applications do not degrade gracefully in absence of javascript.
===========================================================================

Graceful degradation in absense of javascript depends on the way your application has been architectured. Although KO being a pure javascript library, does not offer any support for graceful degradation in absence of javascript, nevertheless unlike many of the competing technologies it does not hinder graceful degradation.

To create a KO application that degrades gracefully, just ensure that the initial state of the page that is rendered by the server suffices to convey the information that a user should see in absence of javascript. Fallback mechanisms (eg simple forms and links) should be available that provide the complete (or partial) application functionality in absence of javascript. Then when you create your view models you can instantiate them from the data already available from the DOM and future data can be loaded via ajax without refreshing the page.

A good example for this functionality can be a grid. The basic HTML page served by the server can contain a simple HTML table with support for traditional links for pagination. Then you can create your view models from the data present in the table ( or ajax if a bit of redundant data load does not matter for you) and utilize KO for interactive bindings.

Since KO does not use special inline markup or custom html tags, but rather simple data-bind attributes which are anyways not visible in absence of javascript, it does not hinder graceful degradation.

Although simple attribute-binding works well, designing complex interactive UI results in cluttered code.
=========================================================================================================

Again code organization is something that KO does not enforce upon you. A very nice way to make to code modular and easy to understand is to use custom bindings. Custom bindings are not something to be used as a last resort . Creating them is easy and utilizing them you can write very succinct code that is easily understandable and manageable. Infact properly using custom bindings can significantly improve performance as compared to several data-bind attributes for same property across several adjacent DOM nodes.

A few people strongly believe that doing something slightly abnormal (somewhat different from the advertised use-cases) the developer has to go to great lengths in case of KnockoutJS. This is certainly not the case. KnockoutJS does an elegant job at data binding. Not only can the actual value stored in text nodes be mapped to JavaScript objects, practically any attribute and even individual styles can be mapped to JavaScript data structures. Combine with that the fact that mapping can be directed to dynamic objects which actually derive their data from other data structures and the excellent integration of KnockoutJS with jQuery templating system, EVERY single type of UI binding can be made in knockoutJS with lesser number of lines than backbone provided you craft your viewmodels and templates creatively.
7. Doing anything serious using KnockoutJS requires verbose inline scripts.

This is also incorrect. Please read the above paragraph on properly using dynamic objects and custom bindings.

Yes code like

{% codeblock lang:html %}
The item is <span data-bind="text: price() > 50 ? 'expensive' : 'affordable'"></span> today.
{% endcodeblock%}

is certainly ugly. But you can simply define a custom attribute that depends on price using ko.computable and have that in the view-model. As a developer you already are smart enough to avoid embedding javascript application logic inside html. KO does not come in your way.

KnockoutJS does not offer a multitude of widgets.
=================================================

This is absolutely correct. But KO noway advertises the same. It is essentially a data-binding library that does one thing and does it well. It is not a complete application SDK or UI framework.

Integrating KnockoutJS with a restful backend is difficult.
===========================================================

As I previously pointed out, KO does not abstract out client server interaction. In fact the management of your Model layer is left almost entirely to you. Having said that, if your restful backend makes data available as json, the backbone mapping plugin makes it trivial to sync server data with view models.

If the structure of the data fetched from sever differs significantly from the way view models are organized, then you anyway have to write code for transforming the code.

The knockout-rest plugin by Francesco Pontillo provides a very easy and intuitive way to integrate view-models with a restful backend.

Using libraries like KnockoutJS have serious negative impact on SEO.
====================================================================

If you follow the guidelines presented above on graceful degradation then there is no reason why this should happen.

Even if you are not concerned about graceful degradation, and your application is heavily dependent on Ajax based content fetching,  These  guidelines from Google, can make your website crawlable.

I sincerely hope that this post was successful in removing many of the common misconceptions regarding KnockoutJS and I also hope that you will be able to appreciate the power of this fantastic library. Please leave your suggestions and opinions in the comments section below. Also if you have been working on a project that enhances or extends the capabilities of KnockoutJS please feel free to drop in a link.
