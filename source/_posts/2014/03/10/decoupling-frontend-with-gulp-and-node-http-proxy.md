---
date: 2014-03-10
permalink: 2014/03/10/decoupling-frontend-with-gulp-and-node-http-proxy.html
layout: post
title: "Decoupling your frontend development with gulp and http-proxy"
tags: [Javascript, Gulp]
is_outdated: true

---

In past developers have often relied on backend-specific toolchains for
web application frontends. Some examples would be [Rails asset pipeline](http://edgeguides.rubyonrails.org/asset_pipeline.html) or
the legacy ant based toolchain for YUI. However recently node.js based tooling support
for frontend technologies has significantly evolved and it is quite viable
to use a node.js based toolchain for managing your frontend projects, even if
the backend is not node.js, thus keeping the workflow decoupled from the backend.

This has multiple advantages, primary among them being that javascript
developers can configure their tools using a language they already are
familiar with without relying on server-side developers.

The workflow I outline in this post utilizes [gulp](http://gulpjs.com/) and node module [http-proxy](https://www.npmjs.org/package/http-proxy).

Gulp is a build system. I prefer it over alternative task runners like grunt
and mimosa because, as the gulp's website states quite succinctly :

> gulp's use of streams and code-over-configuration makes for a simpler and more intuitive build.

A claim that I have found to be true in practice.

The http-proxy library helps us connect with our backend seemlessly and at the same
time keep the codebase in a separate project. By configuring a proxy server
we can load frontend assets from our local system while route the rest of the
requests to a potentially remote backend. This is particularly helpful when
we have multiple loosely coupled mini-applications backed by a single monolithic
server-side codebase.

An alternative to this would be to configure the backend to support [cross origin
requests](http://www.html5rocks.com/en/tutorials/cors/), but this is really unnecessary if eventually the application will be
served from the same domain.

Let us say we have a javascript heavy dashboard which we would like to develop
in a separate project. Here is the directory structure I'll use. Please note that following this
directory structure is not mandatory and is mainly illustrative.

{% codeblock lang:bash %}
project
  |_ gulpfile.js    # task runner configuration
  |_ dashboard      # generated files go here
  |  |_ css
  |  |_ js
  |_ node_modules   # node.js dependencies are installed here
  |_ package.json   # configuration for node.js packages
  |_ server.js      # proxy server
  |_ src            # source files
     |_ css
     |_ js
{% endcodeblock%}

When deploying the application we can simply drop the dashboard folder to the
web-root of our application eg. the public folder of a Rails application.

Next we illustrate usage of http-proxy module to create a simple proxy server.

{% codeblock lang:javascript %}
// server.js

var httpProxy = require('http-proxy'),
    connect = require('connect'),
    livereload = require('connect-livereload')

var proxy = httpProxy.createProxyServer()

var app = connect()
    .use('/dashboard', connect.static(__dirname+'/dashboard'))
    .use(function(req, res){
        if (req.url.indexOf('dashboard') == -1) {
            proxy.web(req, res, {
                target: 'http://localhost:3000'
            })
        }
    })
    .listen(4000)
{% endcodeblock%}

Before running the server, install the node.js dependencies:

{% codeblock lang:bash %}
npm install --save connect http-proxy connect-livereload
{% endcodeblock%}

What the above script does is simply serve the urls that
have dashboard in the url from dashboard folder while
directing the rest of the requests to another server, which
in case is simply `http://localhost:3000`

For complex routing we can use some of the [routing libraries](https://nodejsmodules.org/tags/router)
for node.js but for our example the simple script above works
pretty well.

Our gulp tasks go in gulpfile.js. Configuring gulp tasks is fairly
simple. While the [official documentation](https://github.com/gulpjs/gulp/blob/master/docs/README.md)
is a thorough reference, we illustrate the workflow through some examples.
For example creating a task to clean our target js and css
folders is as simple as:

{% codeblock lang:javascript %}
var gulp = require('gulp'),
    clean = require('gulp-clean')

gulp.task('clean', function(){
    gulp.src(['./dashboard/js/*', './dashboard/css/*'])
        .pipe(clean())
})
{% endcodeblock%}

The stream based based approach really shines when we use pre-processors for
our js or css files. For example to use stylus for css we can add:

{% codeblock lang:javascript %}
var stylus = require('gulp-stylus')

gulp.task('css', function(){
    gulp.src('./src/css/*.styl')
        .pipe(stylus())
        .pipe(gulp.dest('./dashboard/css'))
})
{% endcodeblock%}

To manage dependencies with browserify we can have:

{% codeblock lang:javascript %}
gulp.task('js', function(){
    gulp.src('./src/js/index.js')
        .pipe(browserify())
        .pipe(gulp.dest('./dashboard/js'))
})

{% endcodeblock%}

As I hope is clear, the stream based approach makes configuration fairly
simple, intuitive and consistent throughout.

Of course associated packages above like `gulp-stylus`, `gulp-browserify`, `gulp-clean`
have to be installed through npm before we can use them.

While we can run `gulp js`, `gulp css`, `gulp clean` etc. from the command line
we would probably want to have a default task that we run most of the time:

{% codeblock lang:javascript %}
gulp.task('default', ['clean', 'js', 'css'])
{% endcodeblock%}

Now running `gulp` will cleanup the dashboard/js and dashboard/css folders and
run our js and css tasks.

To streamline our workflow we configure a watcher which can monitor our files, and
run the associated tasks automatically. Writing a simple watcher is as simple as:

{% codeblock lang:javascript %}
gulp.task('watch', function(){
    gulp.watch('./src/js/**/*', ['default'])
})
{% endcodeblock%}

And why stop here, let us automate browser refreshes too. We can use [livereload](http://livereload.com/) to
automatically reload our browser whenever the files change.

We can add a watcher that notifies the livereload server with changes:

{% codeblock lang:javascript %}
gulp.task('watch', function(){
    var server = livereload()
    gulp.watch('./src/js/**/*', ['default'])
    gulp.watch('./dashboard/**/*')
        .on('change', function(file){
            server.changed(file.path)
        })
})
{% endcodeblock%}

Please note that we could not have hooked up the callback to the watcher we
already had because then it would not guarantee that the pre-processors have
actually completed before our browser refreshes. Please never use timers for
situations like this.

If you have been using livereload for a while then you probably have the browser
extension for livereload. But in case you haven't you can use a middleware for
express in the server.js file. This is especially convenient for testing on
several browsers.

{% codeblock lang:javascript %}
var app = connect()
    .use(connect.logger('dev'))
    .use(livereload({
        port: 35729
    }))
    .use('/dashboard', connect.static(__dirname+'/dashboard'))
    .use(function(req, res){
        if (req.url.indexOf('dashboard') == -1) {
            proxy.web(req, res, {
                target: 'http://localhost:3000'
            })
        }
    })
    .listen(4000)
{% endcodeblock%}

35729 is the default port on which livereload server runs. Note that this
relieves us from having to add the livereload script in our page manually
because the middleware takes care of it for us.

If you use the above configuration, you will soon notice something strange.
When we edit a css file our entire page refreshes. If you have used livereload
before or have seen the demos you know that this should not happen. It should
just transparently reload the css files.

It happens because of the way our gulp tasks are configured. Whenever a file
in src directory changes we run both our js and css tasks which cause both
js and css files to be regerated and thus prompt livereload to refresh the page.

To remedy this we have to modify the watch handler:
{% codeblock lang:javascript %}
gulp.task('watch', function(){
    var server = livereload()
    gulp.watch('./src/js/**/*.js', ['js'])
    gulp.watch('./src/css/**/*.styl', ['css'])
    gulp.watch('./dashboard/**/*')
        .on('change', function(file){
            server.changed(file.path)
        })
})
{% endcodeblock%}

If you try now, you will notice that css changes no longer refresh the full
page as expected.

While the above was not an indepth introduction to any of the technologies involved,
I hope that it gave a basic idea about how node.js based tools can be used
for a streamlined frontend development workflow. As always any comment or criticism is
welcome.
