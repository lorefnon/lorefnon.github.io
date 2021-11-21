---
title: 'Adapting jOOQ code generator to Rails database naming conventions'
date: 2021-08-03
tags: [Java, JOOQ, Ruby on Rails]
excerpt: An overview of how to adapt jooQ to naming conventions which are not supported out of the box
---

I recently updated an application which was historically built using Ruby on Rails to [Spring boot](https://spring.io/projects/spring-boot) & [jOOQ](https://www.jooq.org/).

The Rails convention is to use plural table names (eg. `users`) which are auto-mapped to models with singular names (eg. `User`).

JOOQ doesn't do any automatic plural->singular conversion by default, so if we directly use code-generator we end up with pojos named like `class Users` and interfaces like `interface IUsers` which are not ideal because an instance here represents a single entity/row and so should be named singular.

Fortunately this is easy to address with a custom `NamingStrategy`:

```java
package com.example;

import org.jibx.schema.codegen.extend.DefaultNameConverter;
import org.jibx.schema.codegen.extend.NameConverter;
import org.jooq.codegen.DefaultGeneratorStrategy;
import org.jooq.meta.Definition;

public class NamingStrategy extends DefaultGeneratorStrategy {

    private final NameConverter nameTools = new DefaultNameConverter();

    @Override
    public String getJavaClassName(final Definition definition, final Mode mode) {
        final String javaClassName = super.getJavaClassName(definition, mode);

        // Let's retain the plural names for TableImpl clasess
        if (mode == Mode.DEFAULT) return javaClassName;

        // Let's use singular names for others
        return nameTools.depluralize(javaClassName);
    }

}
```

Support for custom `GeneratorStrategy` implementations in JooQ offers possibility of very low level customizations of how SQL layer names are translated to java/kotlin layer.

In our case, we simply use the depluralize utility from jibx to singularize our names.

We can configure our JooQ configuration to use this naming strategy:

{% hlcode lang:java highlight:11-13 %}
<configuration>
    <jdbc>
        <driver>${db.driverClassName}</driver>
        <url>${db.url}</url>
        <user>${db.username}</user>
        <password>${db.password}</password>
    </jdbc>
    <generator>
        <name>org.jooq.codegen.JavaGenerator</name>
        <!-- Other configuration options -->
        <strategy>
            <name>com.example.NamingStrategy</name>
        </strategy>
    </generator>
</configuration>
{% endhlcode %}
