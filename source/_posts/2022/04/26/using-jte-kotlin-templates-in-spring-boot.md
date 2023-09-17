---
title: Using jte kotlin templates in spring-boot
date: 2022-04-26
tags: [spring-boot, kotlin]
permalink: 2022/04/26/using-jte-kotlin-templates-in-spring-boot/
---

# About

[jte](https://github.com/casid/jte) is a new and performant template engine for JVM.
It supports precompilation of templates in production and hot reloading in development, and also has good tooling support though an intellij plugin.

jte has recently introduced support for kotlin templates - where the embedded expressions are kotlin instead of java.
This is a natural fit if your backend is implemented in kotlin and this post is a quick recipe for configuring this in spring-boot.

jte already provides a spring-boot-starter which takes care of all of the plumbing. We just need to add the jte-kotlin dependency for kotlin template support.

```kotlin
// In build.gradle.kts

dependencies {
	var jteVersion = "2.0.2"

	implementation("gg.jte:jte-spring-boot-starter:$jteVersion")
        // jte-kotlin is needed to compile kte templates
	implementation("gg.jte:jte-kotlin:$jteVersion")

        // ... other dependencies
}
```

As an additional convenience we configure the view resolver below to automatically pick kte templates (with embedded kotlin expressions)
when no template extension is provided:

```kotlin
package com.example.config

import gg.jte.TemplateEngine
import gg.jte.springframework.boot.autoconfigure.JteViewResolver
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class TemplateConfig {
    @Bean
    fun jteViewResolver(templateEngine: TemplateEngine) =
        JteViewResolver(templateEngine).apply {
            setSuffix(".kte")
        }
}
```

Now, if we have a controller like this:

```kotlin
package com.kaljourn.server.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class HomeController {
    @GetMapping("/")
    fun home(): String = "home/index"
}
```

Now, the template file at `src/main/jte/home/index.kte` will be automatically picked up and rendered whenever user visits the `/` endpoint.
