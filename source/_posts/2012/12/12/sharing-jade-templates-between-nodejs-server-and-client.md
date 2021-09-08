---
date: 2012-12-12
permalink: 2012/12/12/sharing-jade-templates-between-nodejs-server-and-client.html
layout: post
title: "Sharing Jade templates between Node.js server and client"
tags: [Javascript, Jade, Node.js]
is_outdated: true

---

Although there are several templating options available for the client eg. [Handlebars](http://handlebarsjs.com), [Mustache](http://mustache.github.com), [Pure](http://beebole.com/pure/) etc. nevertheless, [Jade](http://jade-lang.com/) is attractive in its own right.  Its succinct syntax is cleaner even than [Haml](http://haml.info), which is arguably the predecessor and inspiration-source of all the minimalist whitespace sensitive templating systems. Using Node.js on the server offers an interesting opportunity to reuse the same servers on the server as well as client. This has been made particulary easy by the [numerous community contributions](https://github.com/search?q=jade&ref=commandbar) by Jade enthusiasts which I will attempt to highlight in this post.

When using Jade on the client the most naive approach would be  fetching our typical .jade file via ajax and then parsing the file and then  manipulating the structure and  interpolating the various variables. However,  we can pre-process the jade file beforehand thereby eliminating the heavyweight parsing step in the client. The end result of the pre-processing is a function which takes in the variables needed to render the template and then outputs the resultant HTML string which can be injected into the DOM.

Preprocessing also takes care of [template-inheritance](https://github.com/visionmedia/jade#template-inheritance) and [template-inclusion](https://github.com/visionmedia/jade#includes) seamlessly which are difficult to implement in pure clienside parsing without an added layer of complexity and overhead of multiple ajax calls.

Client-side rendering is made possible by a Jade feature called jade-runtime. On supplying a -c flag to jade, it generates the compiled javascript template which can be used along with the [runtime.js](https://github.com/visionmedia/jade/blob/master/runtime.js) .

[Clientjade](https://github.com/jgallen23/clientjade) takes the process to next level of simplicity.  It is simple npm module which provides you with a command line utility to compile several jade templates into a single compiled javascript file. Compilation is as simple as:

    clientjade test1.jade test2.jade > templates.js

Once templates.js has been included in the page,  individual templates can be accessed using their filenames.

    jade.render($('#target'), 'test1', { name: 'Bob' });

First argument is the DOM node where the template is to be rendered, second is a reference to the template and last is the data required to render the template.

While this entire procedure is very simple, inclusion of multiple compiled templates in an HTML page leads to headaches.  Reason is that every individual compiled file assigns an empty hash to internal object containing references to templates. While in casual usage this is usually not a problem because you can always compile all the templates you need into a single javascript file, this can become troublesome if you are loading templates on-the-fly, as per requirements. The most common scenario is the case when an AMD loader eg. RequireJS is being used to manage dependencies.

Fortunately there is a sister project [node-jade-amd](https://github.com/mysociety/node-jade-amd) which focusses on exactly this usage scenario. As you might expect, after installing the [jade-amd](https://github.com/mysociety/node-jade-amd) npm module you have a handy command line utility using which is as simple as :

    jade-amd --from <source-folder> --to <destination-folder>

The compiled templates have a dependency on jadeRuntime amd module which can be obtained by :

    jade-amd --runtime > jadeRuntime.js

Then the compiled template can be used just like you would use any other amd module :
{% codeblock lang:javascript %}
require([ 'templates/person' ],            // Compiled template AMD modules
    function(personTemplate) {
        var rendered_content = personTemplate({
              name: 'Joe Bloggs'                // Data to be used in the template
         });
    }
);
{% endcodeblock%}
Note that explitly requiring the runtime is not necessary because it is implicitly required by the compiled templates.

If repeated manual recompilation feels like a headache, and you don’t already have a file watcher setup there is a connect middleware [jade-browser](https://github.com/storify/jade-browser) which exposes jade templates to the web browser and also provides a few additional features like express-like render function with partial handling. If you already using [grunt](http://gruntjs.com), you can checkout the plugin [grunt-jade](https://github.com/phated/grunt-jade) .

So jade is an immensely popular templating solution among Node.js developers and the benefit of this is that there are numerous compilation options available to fit into your development toolchain.  I hope this quick detour around jade was helpful.  There are multiple other similar projects aiming to solve similar scenarios.  The ones aforementioned, were a few that I recently used. Please feel free to express any opinions or criticisms. If there is a project with related objectives which is particularly noteworthy,  feel free to add a link.
