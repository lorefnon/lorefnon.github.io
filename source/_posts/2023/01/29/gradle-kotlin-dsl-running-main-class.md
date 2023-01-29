---
title: Running an arbitrary main class as a Gradle task using the kotlin DSL
tags: [Gradle,Kotlin]
date: 2023-01-29
---

This post is a simple recipe illustrating how we can run an arbitrary main class as a gradle task through the [Gradle JavaExec utility](https://docs.gradle.org/current/dsl/org.gradle.api.tasks.JavaExec.html). Because we love kotlin, both our gradle configuration and main class are written in kotlin.

```kt
// build.gradle.kts

tasks.register<JavaExec>("sampleTask") {
    mainClass.set("com.example.util.SampleTaskKt")
    classpath = sourceSets["main"].runtimeClasspath
}
```

```kt
// src/main/kotlin/com/example/util/sampleTask.kt

package com.example.util

fun main(args: Array<String>) {
    print("hello world")
}
```

Now if you run `./gradlew sampleTask` in cli (or use your IDE's gradle panel to execute it) you should see "hello world" printed in the console.

Gradle's JavaExec is quite handy for one off project specific tasks for which you don't want to implement a dedicated plugin.
