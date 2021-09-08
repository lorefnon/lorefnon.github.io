---
date: 2014-02-02
permalink: 2014/02/02/configuring-emacs-for-rails.html
layout: post
title: "Configuring Emacs as a productive development environment for Rails development."
tags: [Rails, Emacs]
is_outdated: true

---

## Updates

- The default keybindings have been updated based on the feedback from [Asok](https://github.com/asok), the author of the awesmoe `projectile-rails` package.

---

This post outlines some of the Emacs extensions (open source, of course) which can significantly ease the life of a Rails developer. While Rails is, by design, quite a productive framework, having the dev environment properly setup can multiply developer efficiency by an order of magnitude. Although almost all of this information is available online elsewhere, I nevertheless wanted to summarize my explorations in form of a basic guide to easily configure extensions I have found to be useful, during the course of my Rails projects. While the primary audience is a forgetful me from the future, I hope developers new to Rails or Emacs (or both) will find this helpful to get up and running with Emacs and Rails, without having to wade through reams of documentation right upfront. I have tried my best to link the appropriate authoritative resources, which may be helpful for people looking forward to customizing and extending the setup.

While the setup below has been tested only in Linux Elementary, it should work for other Posix environments as well. Please ensure that you have got atleast [Emacs 24](http://www.gnu.org/software/emacs/#Obtaining) and can download packages through [`package.el`](https://github.com/technomancy/package.el). If you are not familiar with package management in emacs [Bozhidar Batsov](https://github.com/bbatsov) has presented [a great introduction](http://batsov.com/articles/2012/02/19/package-management-in-emacs-the-good-the-bad-and-the-ugly/). Adding the following snippet to your `~/.emacs` should provide access to [marmalade](http://marmalade-repo.org/) and [melpa](http://melpa.milkbox.net/#/) package archives:

{% codeblock lang:lisp %}
(require 'package)
(add-to-list 'package-archives
    '("marmalade" .
      "http://marmalade-repo.org/packages/"))
(add-to-list 'package-archives
    '("melpa" . "http://melpa.milkbox.net/packages/") t)
(package-initialize)
{% endcodeblock%}

Syntax Checking
===============

While the `ruby-mode` bundled with Emacs works well with syntax highlighting, it does not automatically handle syntax checking. Luckily we have [flymake](http://www.emacswiki.org/emacs/FlyMake), which is a generic on the fly syntax checking system. We can install [flymake-ruby](https://github.com/purcell/flymake-ruby) which facilitates syntax checking for ruby through our package manager. Just hit `M-x package-install` and type in `flymake-ruby`.

Once flymake-ruby is installed, we just have to hook it up with the ruby-mode.
{% codeblock lang:lisp %}
(require 'flymake-ruby)
(add-hook 'ruby-mode-hook 'flymake-ruby-load)
{% endcodeblock%}

And voila, no syntax errors go unnoticed ever again:

![Emacs flymake screenshot](/images/emacs-flymake.png)


Sane indentation
================

The default indentation system attempts to align the arguments of a function
with the opening bracket vertically.

{% codeblock lang:ruby %}
function_call (arg1,
               arg2);
{% endcodeblock%}

While this is subjective, but if you, like me, find this behaviour erratic - the following will make emacs indent code inside parenthesis similar to elsewhere.

{% codeblock lang:lisp %}
(setq ruby-deep-indent-paren nil)
{% endcodeblock%}

Ruby shell inside emacs
=======================

[inf-ruby](https://github.com/nonsequitur/inf-ruby) provides a REPL buffer connected to a Ruby subprocess. It is available through the package manager. Once installed you would probably want to bind it to a convenient shortcut. The following would bind it to `C-c r r`.

{% codeblock lang:lisp %}
(global-set-key (kbd "C-c r r") 'inf-ruby)
{% endcodeblock%}

Integration with RVM
====================

If you use RVM for managing ruby versions, you would want to use [rvm.el](https://github.com/senny/rvm.el). Once installed you will just have to call `rvm-activate-corresponding-ruby` and rvm.el will automatically pick up your ruby version and gemset from .rvmrc file.

The following will bind the aforementioned command to `C-c r a`

{% codeblock lang:lisp %}
(global-set-key (kbd "C-c r a") 'rvm-activate-corresponding-ruby)
{% endcodeblock%}

![rvm.el](/images/emacs-rvm.png)

It seamlessly integrates with `inf-ruby` so if you invoke `inf-ruby` after the previous step, you will get the version of ruby and gemset you expect.

Project management with projectile
==================================

So far the steps had nothing to do with Rails and were equally useful for vanilla ruby projects. However for managing large Rails applications some basic project management facilities might come in handy.

While there are a plethora of project management utilities for emacs, One that is particularly simple and easy to install is [projectile](https://github.com/bbatsov/projectile). It is available through the package manager. Once installed it can be configured as a global mode as follows:

{% codeblock lang:lisp %}
(projectile-global-mode)
{% endcodeblock%}

or it can be hooked into particular modes:

{% codeblock lang:lisp %}
(add-hook 'ruby-mode-hook 'projectile-on)
{% endcodeblock%}

I would also strongly recommend using the [ido-mode](http://www.emacswiki.org/emacs/InteractivelyDoThings) which, among other things, provides various enhancements to make navigation between files and buffers easy. The default behaviour of `C-x C-f` and `C-x C-b` are changed to a more interactive version, which shows a list of matched options while typing right inside the minibuffer. [flx-ido](https://github.com/lewang/flx) is an extension which further enhances the matching capabilities of ido to perform fuzzy matching (a-la sublime text) which can be a great productivity boost, particularly if you are a bit sloppy with keyboard. `ido` is built into emacs and `flx-ido` is available through package manager.

`flx-ido-mode` activates the ido mode augmenting with flexible matching.

You may want to use following snippet to display ido completions vertically instead of horizontally, as is the default behaviour.

{% codeblock lang:lisp %}
 ;; Display ido results vertically, rather than horizontally
  (setq ido-decorations (quote ("\n-> " "" "\n   " "\n   ..." "[" "]" " [No match]" " [Matched]" " [Not readable]" " [Too big]" " [Confirm]")))
  (defun ido-disable-line-truncation () (set (make-local-variable 'truncate-lines) nil))
  (add-hook 'ido-minibuffer-setup-hook 'ido-disable-line-truncation)
  (defun ido-define-keys () ;; C-n/p is more intuitive in vertical layout
    (define-key ido-completion-map (kbd "C-n") 'ido-next-match)
    (define-key ido-completion-map (kbd "C-p") 'ido-prev-match))
  (add-hook 'ido-setup-hook 'ido-define-keys)
{% endcodeblock%}

![Emacs ido vertical completions](/images/emacs-ido-vertical.png)

Projectile integrates with ido and uses it as its indexing method. For projectile to recognize the project root, you just have to drop an empty .projectile file there. Once that is done, you can simply perform a fuzzy search for files using `C-c C-p f` and directories using `C-c C-p d`

![Projectile find file](/images/emacs-projectile-file-search.png)
![Projectile find dir](/images/emcas-projectile-dir-search.png)

[Projectile Rails](https://github.com/asok/projectile-rails) builds upon `projectile` to provide project management facilities specifically tailored for Rails applications. It is available through package manager and can be hooked up with projectile using :

{% codeblock lang:lisp %}
(add-hook 'projectile-mode-hook 'projectile-rails-on)
{% endcodeblock%}

Projectile Rails adds a large number of keybindings to ease navigation across files in a rails project, running rake tasks, invoking console etc.
Following is the list of commands and associated bindings taken from the home page of projectile rails.

<table>
<thead><tr>
<th>Command</th>
<th>Keybinding</th>
<th>Description</th>
</tr></thead>
<tbody>
<tr>
<td>projectile-rails-find-model</td>
<td><kbd>C-c r m</kbd></td>
<td>Find a model using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-model</td>
<td><kbd>C-c r M</kbd></td>
<td>Go to a model connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-controller</td>
<td><kbd>C-c r c</kbd></td>
<td>Find a controller using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-controller</td>
<td><kbd>C-c r C</kbd></td>
<td>Go to a controller connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-view</td>
<td><kbd>C-c r v</kbd></td>
<td>Find a template or partial using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-view</td>
<td><kbd>C-c r V</kbd></td>
<td>Go to a view connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-helper</td>
<td><kbd>C-c r h</kbd></td>
<td>Find a helper using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-helper</td>
<td><kbd>C-c r H</kbd></td>
<td>Go to a helper connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-lib</td>
<td><kbd>C-c r l</kbd></td>
<td>Find a lib using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-feature</td>
<td><kbd>C-c r f</kbd></td>
<td>Find a feature using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-spec</td>
<td><kbd>C-c r p</kbd></td>
<td>Find a spec using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-spec</td>
<td><kbd>C-c r P</kbd></td>
<td>Go to a spec connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-migration</td>
<td><kbd>C-c r n</kbd></td>
<td>Find a migration using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-current-migration</td>
<td><kbd>C-c r N</kbd></td>
<td>Go to a migration connected with the current resource.</td>
</tr>
<tr>
<td>projectile-rails-find-javascript</td>
<td><kbd>C-c r j</kbd></td>
<td>Find a javascript using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-stylesheet</td>
<td><kbd>C-c r s</kbd></td>
<td>Find a stylesheet using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-log</td>
<td><kbd>C-c r o</kbd></td>
<td>Find a log file and enable <code>auto-revert-tail-mode</code> in its buffer.</td>
</tr>
<tr>
<td>projectile-rails-find-initializer</td>
<td><kbd>C-c r i</kbd></td>
<td>Find an initializer file using <code>projectile-completions-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-environment</td>
<td><kbd>C-c r e</kbd></td>
<td>Find an environment file using <code>projectile-completions-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-locale</td>
<td><kbd>C-c r a</kbd></td>
<td>Find a locale file using <code>projectile-completions-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-mailer</td>
<td><kbd>C-c r @</kbd></td>
<td>Find a mailer file using <code>projectile-completions-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-find-layout</td>
<td><kbd>C-c r y</kbd></td>
<td>Find a layout file using <code>projectile-completions-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-console</td>
<td>
<kbd>C-c r ! c</kbd>, <kbd>C-c r r</kbd>
</td>
<td>Run <code>rails console</code> command in <code>inf-ruby</code> buffer.</td>
</tr>
<tr>
<td>projectile-rails-server</td>
<td>
<kbd>C-c r ! s</kbd>, <kbd>C-c r R</kbd>
</td>
<td>Run <code>rails server</code>.</td>
</tr>
<tr>
<td>projectile-rails-rake</td>
<td><kbd>C-c r ! r</kbd></td>
<td>Select a rake task to run using <code>projectile-completion-system</code>.</td>
</tr>
<tr>
<td>projectile-rails-generate</td>
<td><kbd>C-c r ! g</kbd></td>
<td>Run <code>rails generate</code> command.</td>
</tr>
<tr>
<td>projectile-rails-extract-region</td>
<td><kbd>C-c r x</kbd></td>
<td>Extract the selected region to a partial.</td>
</tr>
<tr>
<td>projectile-rails-goto-file-at-point</td>
<td>
<kbd>C-c r RET</kbd>, <kbd>C-c r g f</kbd>
</td>
<td>Go to a file at point. Depending on the context that might be a constant, template or partial, or a gem.</td>
</tr>
<tr>
<td>projectile-rails-goto-gemfile</td>
<td><kbd>C-c r g g</kbd></td>
<td>Go to <code>Gemfile</code> file.</td>
</tr>
<tr>
<td>projectile-rails-goto-routes</td>
<td><kbd>C-c r g r</kbd></td>
<td>Go to <code>config/routes.rb</code> file.</td>
</tr>
<tr>
<td>projectile-rails-goto-schema</td>
<td><kbd>C-c r g d</kbd></td>
<td>Go to <code>db/schema.rb</code> file.</td>
</tr>
<tr>
<td>projectile-rails-goto-spec-helper</td>
<td><kbd>C-c r g l</kbd></td>
<td>Go to <code>spec/spec_helper.rb</code> file.</td>
</tr>
</tbody>
</table>

Note that `rails console` uses `inf-ruby`, so integration with rvm is smooth and effortless.

![Projectile Rails console](/images/projectile-rails-console.png)

Intelligent Code navigation and Completion with Robe
====================================================

[Robe](https://github.com/dgutov/robe) is a code assistance tool that uses a Ruby REPL subprocess with your application or gem code loaded, to provide information about loaded classes and modules, and where each method is defined.

Robe is available via package manager. Once installed it can be hooked into ruby mode.
{% codeblock lang:lisp %}
(require 'robe)
(add-hook 'ruby-mode-hook 'robe-mode)
{% endcodeblock%}

If you are using rvm you  may want to instruct robe to auto-trigger `rvm-activate-corresponding-ruby`.

{% codeblock lang:lisp %}
(defadvice inf-ruby-console-auto (before activate-rvm-for-robe activate)
  (rvm-activate-corresponding-ruby))
{% endcodeblock%}

`robe-jump` bound by default to `M-.` can be used to jump to definitions of various classes and methods. While it is not ideal, in most of the scenarios, the expected entry is present in the first few suggestions.

For intelligent completion robe can be integrated with [company mode](http://company-mode.github.io/). Company mode is a modern and modular completion system for emacs which accepts a multitude of pluggable back-ends and front-ends to provide rich completions on the fly. Robe provides a backend to the completion in form of company-robe. This can be configured as follows :

{% codeblock lang:lisp %}
(global-company-mode t)
(push 'company-robe company-backends)
{% endcodeblock%}

Now all you have to do is hit `robe-start` when you navigate into your project. After that at any point
if you trigger `company-robe` you should be greeted with an intellisense like method definitions.

Completion will start automatically after you type a few letters. Use M-n, M-p, &lt;tab&gt; and &lt;return&gt; to complete. Search through the completions with C-s, C-r and C-o. Even the documentations are available right from the editor (Press F1 at any menu entry).

![Emacs robe completions](/images/emacs-robe-completions.png)

One of the caveats is that robe requires `pry` and `pry-doc` to be in Gemfile. This is a problem when working with third party projects and I don't have a workaround for that yet.

Also Ruby being a dynamic language which strives to push the limits on flexibility, perfect completion is simply not possible. Many of known caveats are listed [here](https://github.com/dgutov/robe#notes) and some are being actively being worked upon. But nevertheless, I have found the setup to be quite useful for day to day development and hope you do too.

I hope that this quick detour into the world of emacs-extensions has motivated you to atleast try out Emacs. How far you go down the rabbit hole is of-course for you to decide. As always, any criticism, suggestions and comments are welcome.
