---
date: 2015-11-15
permalink: 2015/11/15/utilities-for-efficient-filesystem-navigation-in-emacs.html
layout: post
title: "Utilities for efficient filesystem navigation in emacs"
category:
tags: [Emacs, Helm]
is_outdated: true

---

While most of time spent working on a project goes into coding, finding the right files or understanding the directory structure is fairly time consuming as well. This is especially true when we are exploring unknown projects - in particular, projects with custom directory structures as opposed to CoC frameworks. This post outlines a few tools which aid in project exploration and navigation across files which I have found to be useful in practice

## Dired

While built into emacs, Dired is indespensable. I sincerely regret not spending the time required to develop familiarity with Dired when I was initially learning basics of Emacs. While the facilities provided by Dired are powerful enough to replace the full fledged file manager of your operating system, the real power comes from native integration with the rest of emacs.

<img src='/images/2015-11-15/dired.png'>

For instance, a Dired is buffer is just like a normal buffer, and all the dired buffers will be directly available from `list-buffers` - and from any alternative approaches to list buffers (eg. `helm-buffers-list` which we discuss shortly).

I have found emacs bookmarks functionality to be particularly useful with Dired. Dired buffers can be bookmarked just like ordinary buffers and we can use `bookmark-jump` to quickly jump to important Dired buffers opened before.

<img src='/images/2015-11-15/bookmarks.png'>

## Neotree

Neotree is a more conventional file manager - similar to what we find in IDEs. It is useful as an easily accessible persistent sidebar that provides the complete outline of the project. It is useful as a mini file manager though not as powerful as dired. The great part is that it is entirely usable through keyboard.

<img src='/images/2015-11-15/neotree.png'>

## Helm

Helm has been described as a package in a league of its own. Rather than being an isolated productivity tool, it improves our entire emacs experience through a powerful completion engine which may be different from the tab based completion pervasive in other editors/IDEs or Shell but once the habit sets in, it is difficult to go back.

We will not go into much depth into Helm, but the package is well documented and for getting started here is an excellent [introductory article](http://tuhdo.github.io/helm-intro.html).

<img src='/images/2015-11-15/helm.png'>

## Ag and Helm-Ag

While grep is arguably the most popular tool for finding files containing specific content, tools like the [Silver Searcher](https://github.com/ggreer/the_silver_searcher) improve upon grep by providing specialized tools for searching codebases. There is an [ag-mode](https://github.com/Wilfred/ag.el) that integrates Ag with emacs and if you do use helm, there is a [helm integration plugin](https://github.com/syohex/emacs-helm-ag) as well.

<img src='/images/2015-11-15/ag.png'>

## Projectile and Helm-Projectile

[Projectile](http://batsov.com/projectile/) is an amazing project management solution for solution.

> Projectile is a project interaction library for Emacs. Its goal is to provide a nice set of features operating on a project level without introducing external dependencies(when feasible). For instance - finding project files has a portable implementation written in pure Emacs Lisp without the use of GNU find (but for performance sake an indexing mechanism backed by external commands exists as well).

Helm-projectile facilitates integration of projectile and helm, here is a great [introductory article](http://tuhdo.github.io/helm-projectile.html) on getting started with this combo.

## Ranger

While Helm and Ag is useful for rapidly finding files when we know what we are looking for - however for exploring an unknown project and performing code review for changes across files, it is not the ideal solution. For this use case I have found a unix utility called Ranger very useful. Fortunately there also exists a Ranger mode for emacs which emulates similar feature within emacs. I have found its preview feature particularly complementary to the hierarchical tree based solutions.

<img src='/images/2015-11-15/ranger.png'>


This completes our detour into utilities make it easy to traverse projects in emacs. If there are other tools that this article could benefit from, please mention them in the comments below.
