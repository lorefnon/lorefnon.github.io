---
title: Decomposing your taskfiles
tags: [taskfile]
date: 2024-01-30
permalink: /2024/01/30/decomposing-your-taskfiles
---

[Taskfile.dev](https://taskfile.dev) is a very convenient language/framework agnostic task runner that I frequently use in larger projects - esp. ones that are composed of polyglot services. It is also a nice alternative to npm scripts which start to get unweidly once you begin to have dependencies that you want to run in parallel, want to run certain scripts in certain folder etc.

However, sooner or later, the primary taskfile grows quite large as we add more and more tasks.

Fortunately taskfile has a nice solution for this, we can include other taskfiles in a taskfile.

```
version: "3"

includes:
  backend:
    taskfile: ./modules/backend/Taskfile.part.yaml
    dir: ./modules/backend
  frontend:
    taskfile: ./modules/frontend/Taskfile.part.yaml
    dir: ./modules/frontend
```

This is particularly convenient for monorepos where each module will typically have a set of closely related set of tasks that depend on each other, but are otherwise unrelated to tasks for other modules/services. Its also nice that all the tasks get auto-prefixed so a `build` task defined in `backend/Taskfile.part.yaml` will be available as `backend:build`.

Note that we named our constituent taskfiles as `Taskfile.part.yaml` rather than `Taskfile.yaml`.

If we use  the latter, any tasks defined in the top level `Taskfile.yaml` will become inaccessible while we are in child directories because task will just find the first `Taskfile.yaml` in parent directory and stop there. So any tasks in parent taskfile will not be found. It also causes confusion because in subdirectories we will need to use unprefixed tasks where as in top level we will need to run prefixed tasks.

If you use yaml-language-server, you can get autocompletion and checking for your Taskfile.part.yaml files by adding this comment to top: 

```
# yaml-language-server: $schema=https://taskfile.dev/schema.json
```
