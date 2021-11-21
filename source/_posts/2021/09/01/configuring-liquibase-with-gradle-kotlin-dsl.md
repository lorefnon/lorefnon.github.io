---
title: 'Configuring Liquibase through Gradle Kotlin DSL'
date: 2021-09-01
tags: [Kotlin, Liquibase, Gradle]
excerpt: This post is a minimal recipe for configuring Liquibase runner through the Gradle kotlin DSL.
---

This post is a minimal recipe for configuring Liquibase runner through the Gradle kotlin DSL. This is mostly ported from the offical examples [here](https://github.com/liquibase/liquibase-gradle-plugin#usage) written using the Gradle's Groovy DSL:

We can specify our database properties in gradle.properties:

```
db_url=jdbc:mysql://172.17.0.2:3306/oms_dev
db_user=root
db_password=rootroot
```

And use them in our build.gradle.kts:

```kotlin
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    jcenter()
}

plugins {
    kotlin("jvm") version "1.5.21"
    id("org.liquibase.gradle") version "2.0.3"
}

// Liquibase plugin configuration
liquibase {
    activities.register("main") {
        val db_url by project.extra.properties
        val db_user by project.extra.properties
        val db_password by project.extra.properties

        this.arguments = mapOf(
            "logLevel" to "info",
            "changeLogFile" to "src/main/resources/db/changelog.yml",
            "url" to db_url,
            "username" to db_user,
            "password" to db_password,
            "driver" to "com.mysql.cj.jdbc.Driver"
        )
    }
    runList = "main"
}

dependencies {
    // Include database drivers to be used by liquibase
    liquibaseRuntime("mysql:mysql-connector-java:8.0.26")
    liquibaseRuntime("org.liquibase:liquibase-core:4.4.3")
    liquibaseRuntime("org.yaml:snakeyaml:1.29")
}
```
