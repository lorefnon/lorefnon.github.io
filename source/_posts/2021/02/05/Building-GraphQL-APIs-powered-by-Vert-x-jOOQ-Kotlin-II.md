---
title: 'Building GraphQL APIs powered by Vert.x, Dagger, jOOQ & Kotlin - II'
date: 2021-02-06
tags: [Kotlin, GraphQL, Vert.X, Vert.X-Web, Backend-development, API-development]
draft: true
---

This continues from our [previous post](/2021/02/01/Building-GraphQL-APIs-powered-by-Vert-x-jOOQ-Kotlin-I) in a series of articles where we explore a JVM based stack comprising of Kotlin, Vert.X and jOOQ for development of GraphQL APIs.

When we last left off, we had a simple GraphQL API with a single field in our `Query` type which was statically resolved. 

Before we go further, let's integrate a dependency injection system that simplies the task of wiring up our application components. In this post we'll use [Dagger](https://dagger.dev/). In contrast to many other popular DI/IoC solutions, dagger operates through compile time code generation, reducing the reflection overhead causing startup delay.

Feel free to skip this post, and checkout the [next one in series](/2021/03/26/Building-GraphQL-APIs-powered-by-Vert-x-jOOQ-Kotlin-III/) if you don't want to use Dagger.

We will need to add dagger as a dependency as well as configure Kotlin's annotation processor [Kapt](https://kotlinlang.org/docs/kapt.html) to use dagger. 

In pom.xml: project > dependencies

{% hlcode lang:xml highlight:2-4 %}
<dependency>
    <groupId>com.google.dagger</groupId>
    <artifactId>dagger</artifactId>
    <version>2.16</version>
</dependency>
{% endhlcode %}

Kapt configuration goes into the Kotlin maven-plugin's configuration section: 

{% hlcode lang:xml highlight:16-22 fold:(ranges:25-48;caption:"Other Execution Tags") %}
<plugin>
    <groupId>org.jetbrains.kotlin</groupId>
    <artifactId>kotlin-maven-plugin</artifactId>
    <version>${kotlin.version}</version>
    <executions>
        <execution>
            <id>kapt</id>
            <goals>
                <goal>kapt</goal>
            </goals>
            <configuration>
                <sourceDirs>
                    <sourceDir>src/main/kotlin</sourceDir>
                    <sourceDir>src/main/java</sourceDir>
                </sourceDirs>
                <annotationProcessorPaths>
                    <annotationProcessorPath>
                        <groupId>com.google.dagger</groupId>
                        <artifactId>dagger-compiler</artifactId>
                        <version>2.16</version>
                    </annotationProcessorPath>
                </annotationProcessorPaths>
            </configuration>
        </execution>
        <execution>
            <id>compile</id>
            <goals>
                <goal>compile</goal>
            </goals>
            <configuration>
                <sourceDirs>
                    <sourceDir>${project.basedir}/src/main/kotlin</sourceDir>
                    <sourceDir>${project.basedir}/src/main/java</sourceDir>
                </sourceDirs>
            </configuration>
        </execution>
        <execution>
            <id>test-compile</id>
            <goals>
                <goal>test-compile</goal>
            </goals>
            <configuration>
                <sourceDirs>
                    <sourceDir>${project.basedir}/src/test/kotlin</sourceDir>
                    <sourceDir>${project.basedir}/src/test/java</sourceDir>
                </sourceDirs>
            </configuration>
        </execution>
    </executions>
</plugin>
{% endhlcode %}

Let us move our GraphQL wiring to a Dagger module: 

{% hlcode lang:kotlin highlight:16,19-20 fold:(ranges:3-14;caption:"Imports")  %}
package me.lorefnon.sample.module

import graphql.GraphQL
import graphql.schema.idl.RuntimeWiring.newRuntimeWiring
import graphql.schema.idl.SchemaGenerator
import graphql.schema.idl.SchemaParser

import dagger.Module
import dagger.Provides
import graphql.schema.idl.TypeRuntimeWiring
import io.vertx.ext.web.handler.graphql.schema.VertxDataFetcher
import me.lorefnon.sample.service.UserLoginService
import me.lorefnon.sample.service.UserRegistrationService
import javax.inject.Singleton

@Module
class GraphQLModule {

    @Provides
    @Singleton
    fun provideGraphQL() = GraphQLBuilder().build()

    inner class GraphQLBuilder {
        fun build(): GraphQL = GraphQL
            .newGraphQL(buildExecutableSchema())
            .build()

        private val rawSchema = """
            type Query {
                hello: String
            }
        """.trimIndent()

        private fun buildRuntimeWiring() = newRuntimeWiring()
            .type("Query") {
                it.dataFetcher("hello") { "world" }
            }
            .build()

        private fun buildExecutableSchema() =
            SchemaGenerator().makeExecutableSchema(parseSchema(), buildRuntimeWiring())

        private fun parseSchema() =
            SchemaParser().parse(rawSchema)
    }
}
{% endhlcode %}

When the dependencies are coming from our own project we will typically use `@Inject` annotation in the classes to be injected. 

However, when we are instantiating or configuring third party classes that we don't have control over we'll typically use `@Provides` annotation (as in the example above). These methods are conventionally named as `provide*` and are organized as what Dagger calls Modules (entirely unrelated to Java 9 modules developed as part of project Jigsaw). The `@Module` annotation marks our class as a Dagger Module.

The utility of the inner class may not be obvious at this point, but it just makes it easier to better organize the runtime wiring where we need access to our other services. This will likely be more evident once we start integrating more features in our API.

Our router integration can be moved to a Dagger module too: 

{% hlcode lang:kotlin fold:(ranges:3-10;caption:"Imports") highlight:12,15,16 %}
package me.lorefnon.sample.module

import dagger.Module
import dagger.Provides
import graphql.GraphQL
import io.vertx.core.Vertx
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import io.vertx.ext.web.handler.graphql.GraphQLHandler
import javax.inject.Singleton

@Module
class RouterModule(private val vertx: Vertx) {

    @Provides
    @Singleton
    fun provideRouter(graphQL: GraphQL): Router =
        Router.router(vertx).also { r ->
            r.route().handler(BodyHandler.create())
            r.post("/graphql").handler(
                GraphQLHandler.create(graphQL)
            )
        }

}
{% endhlcode %}

Note that both our Router and GraphQL instances are marked as `@Singleton` so dagger will only ever create a single instance of them and inject the same instance wherever needed.

The last dagger specific boilerplate class that we need to write is a dagger `Component` that acts as a facade for the code that isn't wired up using dagger. This can be used to bootstrap our injector and  also makes dagger instantiated instances available to non dagger managed code.

A dagger `Component` is typically written as an interface that will be implemented by Dagger at compile time: 

{% hlcode lang:kotlin fold:(ranges:3-9;caption:Imports) %}
package me.lorefnon.sample

import dagger.Component
import graphql.GraphQL
import io.vertx.ext.web.Router
import io.vertx.sqlclient.SqlClient
import javax.inject.Singleton

import me.lorefnon.sample.module.*

@Component(modules = [
    GraphQLModule::class,
    RouterModule::class,
])
@Singleton
interface MainVerticleComponent {
    fun getRouter(): Router
}
{% endhlcode %}

While we may have many services instantiated through dagger, we will not need to add accessors for all of them to the Component above. The only one we will need in our tutorial, is a the router accessor, which makes the router instance (which is created through dagger) available to our MainVerticle class (which is not created dagger).

If we run `mvn compile`, dagger will generate a `DaggerMainVerticleComponent` that implements our `MainVerticleComponent` class.

We can now use the companion Builder of this class to wire up the dependencies of our verticle: 

Let us update our `MainVerticle` to make use of the Dagger generated `MainVerticleComponent` implementation:

{% hlcode lang:kotlin lineNums:false highlight:9-15,20 %}
package me.lorefnon.sample

import io.vertx.core.AbstractVerticle
import io.vertx.core.Promise
import me.lorefnon.sample.module.*

class MainVerticle : AbstractVerticle() {

    val component by lazy {
        DaggerMainVerticleComponent
            .builder()
            .graphQLModule(GraphQLModule())
            .routerModule(RouterModule(vertx))
            .build()
    }

    override fun start(startPromise: Promise<Void>) {
        vertx
            .createHttpServer()
            .requestHandler(component.getRouter())
            .listen(8888) { http ->
                if (http.succeeded()) {
                    startPromise.complete()
                    println("HTTP server started on port 8888")
                } else {
                    startPromise.fail(http.cause());
                }
            }
    }
}
{% endhlcode %}

(`component` needs to be lazy because when class is instantiated vertx instance is not available)

If we run `mvn compile exec:java` now, we will have the same API as before, but now with DI integrated.

In the [next part](/2021/03/26/Building-GraphQL-APIs-powered-by-Vert-x-jOOQ-Kotlin-III/) of this series, we will look at integrating the Jooq geenrated DAOs into our GraphQL API.