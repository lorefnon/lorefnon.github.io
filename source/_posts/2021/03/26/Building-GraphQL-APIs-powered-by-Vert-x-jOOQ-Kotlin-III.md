---
title: 'Building GraphQL APIs powered by Vert.x, jOOQ & Kotlin - III'
date: 2021-03-26
permalink: 2021/03/26/building-graphql-apis-powered-by-vertx-jooq-kotlin-iii/
tags: [Kotlin, GraphQL, Vert.X, Vert.X-Web, Backend-development, API-development]
---

This is the third post in our series of articles where we explore a JVM based stack comprising of Kotlin, Vert.X and jOOQ for development of GraphQL APIs.

<!-- more -->

In the [previous post](/2021/02/05/Building-GraphQL-APIs-powered-by-Vert-x-jOOQ-Kotlin-II/) we integrated a dagger based DI system to simplify wiring up of components. In this post we will add some more GraphQL resolvers which connect to the database using the jooq based DAO layer.

Before we do that, let's add an AppConfig component to read configuration from a properties file in a type safe manner so that our application becomes runtime configurable: 

Our configuration file (`src/resources/app-config.properties`) looks like this:

```properties
db.port = 5432
db.host = localhost
db.database = jooq_graphql_sample
db.user = lorefnon
```

We will write an `AppConfigModule` which will make the parsed configuration available to other services through dagger.

{% hlcode lang:kotlin fold:(ranges:3-6;caption:Imports) %}
package me.lorefnon.sample.module

import dagger.Module
import dagger.Provides
import java.io.FileInputStream
import java.util.*

@Module
class AppConfigModule {

    @Provides
    fun provideAppConfig(): AppConfig {
        val properties = Properties()

        // Enable application consumer to inject a properties file through environment variable
        val fsPropertiesPath = System.getenv()["APP_CONFIG_PATH"]

        val propertiesStream = fsPropertiesPath
            ?.let { FileInputStream(fsPropertiesPath) }
            // Otherwise use the one in class path
            ?: javaClass.classLoader.getResourceAsStream("app-config.properties")

        properties.load(propertiesStream)
        return AppConfig(properties)
    }
}

/**
 * A type safe wrapper over the untyped Properties instance
 */
class AppConfig(private val properties: Properties) {
    val appPort get(): Int = properties.getProperty("server.http.port")?.toInt() ?: 8888
    val dbPort get(): Int? = properties.getProperty("db.port")?.toInt()
    val dbHost get(): String = properties.getProperty("db.host")!!
    val dbName get(): String = properties.getProperty("db.database")!!
    val dbUser get(): String? = properties.getProperty("db.user")
    val dbPassword get(): String? = properties.getProperty("db.password")
}
{% endhlcode %}

Let us add a `DBAccessModule` which uses this configuration to wire up database access: 

{% hlcode lang:kotlin fold:(ranges:3-9;caption:"Imports") %}
package me.lorefnon.sample.module

import dagger.Module
import dagger.Provides
import io.vertx.pgclient.PgConnectOptions
import io.vertx.pgclient.PgPool
import io.vertx.sqlclient.PoolOptions
import io.vertx.sqlclient.SqlClient
import javax.inject.Singleton

@Module
class DBAccessModule {

    /**
     * Provides an database pool client powered by Vert.X asynchronous postgres driver
     */
    @Provides
    @Singleton
    fun providePGClient(connectOptions: PgConnectOptions, poolOptions: PoolOptions): SqlClient =
        PgPool.pool(connectOptions, poolOptions)

    @Provides
    @Singleton
    fun providePGPoolOptions(config: AppConfig) =
        PoolOptions()

    @Provides
    @Singleton
    fun providePGConnectOptions(config: AppConfig) =
        PgConnectOptions()
            .apply {
                port = config.dbPort
                host = config.dbHost
                database = config.dbName
                config.dbUser?.let { user = it }
                config.dbPassword?.let { password = it }
            }
}
{% endhlcode %}

Thanks to jklingsporn's `ClassicReactiveVertxGenerator`, our DAO classes are compatible with the Vert.X postgres driver pool we configured above.

So we can simply instantiate these DAO classes providing passing this postgres client to them. Let us write a module that instantiates our generated DAO classes: 

{% hlcode lang:kotlin fold:(ranges:3-11;caption:"Imports") %}
package me.lorefnon.sample.module

import dagger.Module
import dagger.Provides
import io.vertx.core.Vertx
import io.vertx.sqlclient.SqlClient
import me.lorefnon.sample.generated.tables.daos.UsersDao
import org.jooq.Configuration
import org.jooq.SQLDialect
import org.jooq.impl.DefaultConfiguration
import javax.inject.Singleton

@Module
class DAOModule {

    @Provides
    @Singleton
    fun provideJooQConfiguration(): Configuration =
        DefaultConfiguration().apply {
            setSQLDialect(SQLDialect.POSTGRES)
        }

    @Provides
    @Singleton
    fun provideUsersDao(jooqConfig: Configuration, sqlClient: SqlClient) =
        UsersDao(jooqConfig, sqlClient)

    // Expose other DAO classes here
}
{% endhlcode %}

We will also need to make our `MainVerticleComponent` aware of these modules: 

{% hlcode lang:kotlin highlight:11-17 fold:(ranges:3-9;caption:"Imports") %}
package me.lorefnon.sample

import dagger.Component
import graphql.GraphQL
import io.vertx.ext.web.Router
import io.vertx.sqlclient.SqlClient
import me.lorefnon.sample.generated.tables.daos.UsersDao
import me.lorefnon.sample.module.*
import javax.inject.Singleton

@Component(modules = [
    AppConfigModule::class,
    DBAccessModule::class,
    DAOModule::class,
    GraphQLModule::class,
    RouterModule::class
])
@Singleton
interface MainVerticleComponent {
    fun getRouter(): Router
}
{% endhlcode %}

And then inject these instances in `MainVerticle`: 

{% hlcode lang:kotlin highlight:6-10 fold:20-25 %}
class MainVerticle : AbstractVerticle() {

    val components by lazy {
        DaggerMainVerticleComponent
            .builder()
            .appConfigModule(AppConfigModule())
            .dBAccessModule(DBAccessModule())
            .dAOModule(DAOModule())
            .graphQLModule(GraphQLModule())
            .routerModule(RouterModule(vertx))
            .build()
    }

    override fun start(startPromise: Promise<Void>) {
        val appPort = component.getAppConfig().appPort
        vertx
            .createHttpServer()
            .requestHandler(component.getRouter())
            .listen(appPort) { http ->
                if (http.succeeded()) {
                    startPromise.complete()
                    println("HTTP server started on port $appPort")
                } else {
                    startPromise.fail(http.cause());
                }
            }
    }
}
{% endhlcode %}

Our API still works, but obviously our `DBAccessModule` & `DAOModule` are still unused. Let's address that. 

Here is the simplest `UserRegistrationService` implementation, that receives incoming credentials, and saves it in DB after hashing the password: 

{% hlcode lang:kotlin fold:3-7 %}
package me.lorefnon.sample.service

import at.favre.lib.crypto.bcrypt.BCrypt
import io.vertx.core.Future
import me.lorefnon.sample.generated.tables.daos.UserDao
import me.lorefnon.sample.generated.tables.pojos.User
import javax.inject.Inject

class UserRegistrationService @Inject constructor(
    private val userDao: UserDao,
    private val passwordEncryptionService: PasswordEncryptionService
) {
    fun registerUser(name: String, email: String, password: String): Future<RegistrationResult> {
        return userDao.insert(User().apply {
            this.name = name
            this.password = passwordEncryptionService.encrypt(password)
            this.email = email
        }).map { insertCount ->
            RegistrationResult(true)
        }.otherwise { throwable ->
            val comments =
                if (throwable.message?.contains("violates unique constraint") == true)
                    listOf(
                        "A user is already registered for this email/username",
                        "Do you want to sign in instead ?"
                    )
                else null
            RegistrationResult(false, comments)
        }
    }
}

data class RegistrationResult(
    val success: Boolean,
    val comments: List<String>? = null
)
{% endhlcode %}

{% hlcode lang:kotlin %}
package me.lorefnon.sample.service

import at.favre.lib.crypto.bcrypt.BCrypt
import javax.inject.Inject

private const val LOGARITHMIC_COST_FACTOR = 12

class PasswordEncryptionService @Inject constructor() {

    fun encrypt(password: String) =
        BCrypt.withDefaults().hashToString(LOGARITHMIC_COST_FACTOR, password.toCharArray())

    fun verify(password: String, encryptedPassword: String) =
        BCrypt.verifyer().verify(password.toCharArray(), encryptedPassword).verified
}
{% endhlcode %}

A production ready solution will also do email verification, time-limit number of signups from an IP, etc. but for our tutorial we will not go into the intricacies of user registration best practices. 

Our service, at this point, is a plain kotlin service that can be tested in isolation. It is not, however, GraphQL aware. 

We need to next expose this service through a resolver: 

{% hlcode lang:kotlin fold:(ranges:3-12;caption:"Imports") highlight:22,26,37-43,52-54,57-65 %}
package me.lorefnon.sample.module

import graphql.GraphQL
import graphql.schema.idl.RuntimeWiring.newRuntimeWiring
import graphql.schema.idl.SchemaGenerator
import graphql.schema.idl.SchemaParser

import dagger.Module
import dagger.Provides
import graphql.schema.idl.TypeRuntimeWiring
import me.lorefnon.sample.service.UserRegistrationService
import javax.inject.Singleton

@Module
class GraphQLModule {

    @Provides
    @Singleton
    fun provideGraphQL(
        userRegistrationService: UserRegistrationService
    ) = GraphQLBuilder(
        userRegistrationService
    ).build()

    inner class GraphQLBuilder(
        private val userRegistrationService: UserRegistrationService
    ) {
        fun build(): GraphQL = GraphQL
            .newGraphQL(buildExecutableSchema())
            .build()

        private val rawSchema = """
            type Query {
                hello: String
            }
    
            type Mutation {
                registerUser(username: String!, email: String!, password: String!): RegistrationResult!
            }
    
            type RegistrationResult {
                success: Boolean!
            }
        """.trimIndent()

        private fun buildRuntimeWiring() = newRuntimeWiring()
            .type("Query") {
                it.dataFetcher("hello") {
                    "world"
                }
            }
            .type("Mutation") {
                it.associateRegisterUserMutation()
            }
            .build()

        // Local extension method for graphql-java's TypeRuntimeWiring Builder
        // to associate the registerUser resolver
        private fun TypeRuntimeWiring.Builder.associateRegisterUserMutation() =
            dataFetcher("registerUser", VertxDataFetcher.create { env ->
                val username = env.getArgument<String>("username")
                val email = env.getArgument<String>("email")
                val password = env.getArgument<String>("password")
                userRegistrationService.registerUser(username, email, password)
            })

        private fun buildExecutableSchema() =
            SchemaGenerator().makeExecutableSchema(parseSchema(), buildRuntimeWiring())

        private fun parseSchema() =
            SchemaParser().parse(rawSchema)
    }
}
{% endhlcode %}

We have updated our GraphQL schema SDL to include a `registerUser` mutation field and we have updated our runtime wiring to resolve this field through the `registerUser` method of `UserRegistrationService`. 

In an extension method (`associateRegisterUserMutation`), we are bridging the non-typesafe arguments API of GraphQL java to the type safe `UserRegistrationService.registerUser` arguments.

One interesting thing to note here is the use of `VertxDataFetcher.create`. In case of our static resolver before (`Query.hello` field), we had passed a lambda to `TypeRuntimeWiring.Builder.dataFetcher`. This works perfectly fine for simple values or java objects. If our `userRegistrationService.registerUser` returned a `RegistrationResult` instance directly, we would not have to use `VertxDataFetcher.create`. 
But what it actually returns is a Vert.X `Future` instance that resolves to a `RegistrationResult`. 

graphql-java library is not aware of this `Future` class. It does understand `java.util.concurrent.CompletionStage` (Read more about [asynchronous execution](https://www.graphql-java.com/documentation/v15/execution/#asynchronous-execution) in graphql-java), but the `Future` being returned here is not `java.util.concurrent.CompletableFuture` (which implements `java.util.concurrent.Future` and `java.util.concurrent.CompletionStage`) but rather `io.vertx.core.Future`, which is used by the vert.x libraries. 

So we need to convert the vert.x future to a `CompletionStage`. We already have a `.toCompletionStage()` method in vert.x Futures for this, but the `VertxDataFetcher` fetcher is an added convenience on top of that which is [Vert.x context](https://vertx.io/docs/apidocs/io/vertx/core/Context.html) aware.

We can now restart our service and try out our mutation through Altair, or other GraphQL Client:

```graphql
mutation {
  registerUser(
    username: "lorefnon", 
    email: "lorefnon@gmail.com",
    password: "password"
  ) {
    success
    comments
  }
}
```

If it's all wired up correctly, we should get a successful response:

```json
{
  "data": {
    "registerUser": {
      "success": true,
      "comments": null
    }
  }
}
```

If we try to create another user with the same login, we should receive a clear error:

```json
{
  "data": {
    "registerUser": {
      "success": false,
      "comments": [
        "A user is already registered for this email/username",
        "Do you want to sign in instead ?"
      ]
    }
  }
}
```

We also need a mechanism to allow users to login. So let us add another mutation where we can pass in the credentials are retrieve a JWT token:

```kotlin
package me.lorefnon.sample.service

import io.vertx.core.Future
import me.lorefnon.sample.generated.tables.daos.UserDao
import javax.inject.Inject

class UserLoginService @Inject constructor(
    private val userDao: UserDao,
    private val passwordEncryptionService: PasswordEncryptionService,
    private val authTokenService: AuthTokenService
) {
    fun login(name: String, password: String): Future<String?> =
        userDao.findOneByName(name).map {
            it?.let { user ->
                if (passwordEncryptionService.verify(password, user.password)) user
                else null
            }?.let { user ->
                authTokenService.getToken(user.name)
            }
        }
}
```

Let's add that to our GraphQL module similar to the registration field: 

{% hlcode lang:kotlin fold:(ranges:3-14;caption:Imports) highlight:23,26,49,65,77-82 fold:52-56,69-75 %}
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
    fun provideGraphQL(
        userRegistrationService: UserRegistrationService,
        userLoginService: UserLoginService
    ) = GraphQLBuilder(
        userRegistrationService,
        userLoginService
    ).build()

    inner class GraphQLBuilder(
        private val userRegistrationService: UserRegistrationService,
        private val userLoginService: UserLoginService
    ) {
        fun build(): GraphQL = GraphQL
            .newGraphQL(buildExecutableSchema())
            .build()

        private val rawSchema = """
            type Query {
                hello: String
            }
    
            type Mutation {
                registerUser(
                    username: String!, 
                    email: String!, 
                    password: String!
                ): RegistrationResult!

                login(username: String!, password: String!): String
            }
    
            type RegistrationResult {
                success: Boolean!
                comments: [String]
            }

        """.trimIndent()

        private fun buildRuntimeWiring() = newRuntimeWiring()
            .type("Query") {
                it.dataFetcher("hello") { "world" }
            }
            .type("Mutation") {
                it.associateRegisterUserMutation()
                it.associateLoginMutation()
            }
            .build()

        private fun TypeRuntimeWiring.Builder.associateRegisterUserMutation() =
            dataFetcher("registerUser", VertxDataFetcher.create { env ->
                val username = env.getArgument<String>("username")
                val email = env.getArgument<String>("email")
                val password = env.getArgument<String>("password")
                userRegistrationService.registerUser(username, email, password)
            })

        private fun TypeRuntimeWiring.Builder.associateLoginMutation() =
            dataFetcher("login", VertxDataFetcher.create { env ->
                val username = env.getArgument<String>("username")
                val password = env.getArgument<String>("password")
                userLoginService.login(username, password)
            })

        private fun buildExecutableSchema() =
            SchemaGenerator().makeExecutableSchema(parseSchema(), buildRuntimeWiring())

        private fun parseSchema() =
            SchemaParser().parse(rawSchema)
    }
}
{% endhlcode %}

An invocation of this API looks like this:

```graphql
mutation {
  login(username: "lorefnon", password: "password")
}
```

```json
{
  "data": {
    "login": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJtZS5sb3JlZm5vbi5zYW1wbGUiLCJ1c2VyIjoibG9yZWZub24ifQ.vJNjffx0dMAqoORfXlf-dUF6cAhwMfTPLeZzxB632_k"
  }
}
```

In the next post we will utilize this API to secure other fields in our GraphQL API.
