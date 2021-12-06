---
title: 'Bootstrapping a Kotlin gRPC service with Spring Boot'
date: 2021-09-04
tags: [Kotlin, Spring, Spring-Boot, gRPC]
popular: true
---

It has always been possible to build gRPC services in kotlin through java interop, but with the recently improved first class support for kotlin in the official gRPC/protobuf libraries it is quite straightforward to build gRPC services in Kotlin which take advantage of kotlin native features like coroutines. In addition, the grpc-spring-boot-starter makes it really convenient for spring boot users to integrate gRPC.

<!-- more -->

Note that while our services are using coroutines, we will not need webflux (although it is perfectly fine to use both of them together)

This post is primarily a recipe for integrating these components to quickly get started with gRPC on spring boot.

# Gradle configuration:

First part is to configure our gradle configuration (`build.gradle.kts`) to use the protobuf and grpc codegen utilities.

{% hlcode lang:kotlin highlight:13,31-33,35-36,62-88 %}
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import com.google.protobuf.gradle.*

val protobufVersion by extra("3.17.3")
val protobufPluginVersion by extra("0.8.14")
val grpcVersion by extra("1.40.1")

plugins {
    id("org.springframework.boot") version "2.5.4"
    id("io.spring.dependency-management") version "1.0.11.RELEASE"
    kotlin("jvm") version "1.5.21"
    kotlin("plugin.spring") version "1.5.21"
    id("com.google.protobuf") version "0.8.17"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_11

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    implementation("net.devh:grpc-server-spring-boot-starter:2.12.0.RELEASE")

    implementation("io.grpc:grpc-protobuf:${grpcVersion}")
    implementation("io.grpc:grpc-stub:1.40.1")
    implementation("io.grpc:grpc-kotlin-stub:1.1.0")
    compileOnly("jakarta.annotation:jakarta.annotation-api:1.3.5") // Java 9+ compatibility - Do NOT update to 2.0.0
    implementation("com.google.protobuf:protobuf-java:$protobufVersion")
    implementation("net.devh:grpc-client-spring-boot-starter:2.12.0.RELEASE")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.5.1")

    if (JavaVersion.current().isJava9Compatible) {
        implementation("javax.annotation:javax.annotation-api:+")
    }
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = "11"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging.showStandardStreams = true
}

sourceSets {
    test {
        java.srcDirs.add(File("src/test/kotlin"))
    }
}

protobuf {
    protoc {
        artifact = "com.google.protobuf:protoc:${protobufVersion}"
    }
    plugins {
        id("grpc") {
            artifact = "io.grpc:protoc-gen-grpc-java:${grpcVersion}"
        }
        id("grpckt") {
            artifact = "io.grpc:protoc-gen-grpc-kotlin:1.1.0:jdk7@jar"
        }
    }

    generateProtoTasks {
        ofSourceSet("main").forEach {
            task.builtins {
                java {}
                kotlin {}
            }
            it.plugins {
                id("kotlin")
                id("grpc")
                id("grpckt")
            }
        }
    }
}
{% endhlcode %}

Note the use of the additional grpckt plugin for protoc along with the grpc plugin for java code-generation.

Given, the above configuration, we can start defining our API schema in protobuf format.

Let us start with a minimal example of `src/main/proto/demo.proto`:

{% hlcode lang:protobuf %}
syntax = "proto3";

package com.example.grpcdemo.service;

import "google/protobuf/wrappers.proto";
import "google/protobuf/timestamp.proto";

service UserService {
  rpc getUserById (google.protobuf.Int64Value) returns (User);
}

message User {
  int64 id = 1;
  string name = 2;
}

{% endhlcode %}

We will look at the code generated for the above in a bit. But let us first look at how to implement this service in our kotlin backend. Our UserService has just one method for now which returns a user given it's id.

Our `UserService.kt` implementing this RPC service looks something like this:

{% hlcode lang:kotlin %}
package com.example.grpcdemo.service

import com.google.protobuf.Int64Value
import net.devh.boot.grpc.server.service.GrpcService

@GrpcService
class UserService: UserServiceGrpcKt.UserServiceCoroutineImplBase() {

    override suspend fun getUserById(userId: Int64Value): Demo.User {
        return Demo.User
            .newBuilder()
            .setId(1)
            .setName("Lorefnon")
            .build()
    }

}
{% endhlcode %}

We have also configured the kotlin plugin for protobuf, which adds a couple of convenient extensions to the builders generated by the protobuf java plugin. So if we want, instead of using `Demo.User.newBuilder()` as in the above snippet, we could use a more kotlin-esque builder DSL:

{% hlcode lang:kotlin %}
return user {
  id = 1
  name = "Lorefnon"
}
{% endhlcode %}

Our implementation derives from the `UserServiceGrpcKt.UserServiceCoroutineImplBase` which was generated for us. The generated functions use some protobuf specific types and we return a `User` instance constructed through the builder that was also generated for us.

Overall our code loooks pretty readable, and we didn't have to write any mapping boilerplate.

If we peek into the build directory, we can find all the code our code-generator generated for us:

```
▾ build/
  ▸ classes/
  ▸ extracted-include-protos/
  ▸ extracted-protos/
  ▾ generated/
    ▾ source/proto/main/
      ▾ grpc/com/example/grpcdemo/service/
          UserServiceGrpc.java
      ▾ grpckt/com/example/grpcdemo/service/
          DemoGrpcKt.kt
```

The first thing we want to look at is the `UserServiceKt` where our base class we derived from resides:

{% hlcode lang:kotlin fold:3-28 highlight:79-81,93-94 %}
package com.example.grpcdemo.service

import com.google.protobuf.Int64Value
import com.example.grpcdemo.service.UserServiceGrpc.getServiceDescriptor
import io.grpc.CallOptions
import io.grpc.CallOptions.DEFAULT
import io.grpc.Channel
import io.grpc.Metadata
import io.grpc.MethodDescriptor
import io.grpc.ServerServiceDefinition
import io.grpc.ServerServiceDefinition.builder
import io.grpc.ServiceDescriptor
import io.grpc.Status
import io.grpc.Status.UNIMPLEMENTED
import io.grpc.StatusException
import io.grpc.kotlin.AbstractCoroutineServerImpl
import io.grpc.kotlin.AbstractCoroutineStub
import io.grpc.kotlin.ClientCalls.serverStreamingRpc
import io.grpc.kotlin.ClientCalls.unaryRpc
import io.grpc.kotlin.ServerCalls.serverStreamingServerMethodDefinition
import io.grpc.kotlin.ServerCalls.unaryServerMethodDefinition
import io.grpc.kotlin.StubFor
import kotlin.String
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.jvm.JvmOverloads
import kotlin.jvm.JvmStatic
import kotlinx.coroutines.flow.Flow

/**
 * Holder for Kotlin coroutine-based client and server APIs for
 * com.example.grpcdemo.service.UserService.
 */
object UserServiceGrpcKt {
  const val SERVICE_NAME: String = UserServiceGrpc.SERVICE_NAME

  @JvmStatic
  val serviceDescriptor: ServiceDescriptor
    get() = UserServiceGrpc.getServiceDescriptor()

  val getUserByIdMethod: MethodDescriptor<Int64Value, Demo.User>
    @JvmStatic
    get() = UserServiceGrpc.getGetUserByIdMethod()

  /**
   * A stub for issuing RPCs to a(n) com.example.grpcdemo.service.UserService service as
   * suspending coroutines.
   */
  @StubFor(UserServiceGrpc::class)
  class UserServiceCoroutineStub @JvmOverloads constructor(
    channel: Channel,
    callOptions: CallOptions = DEFAULT
  ) : AbstractCoroutineStub<UserServiceCoroutineStub>(channel, callOptions) {
    override fun build(channel: Channel, callOptions: CallOptions): UserServiceCoroutineStub =
        UserServiceCoroutineStub(channel, callOptions)

    /**
     * Executes this RPC and returns the response message, suspending until the RPC completes
     * with [`Status.OK`][Status].  If the RPC completes with another status, a corresponding
     * [StatusException] is thrown.  If this coroutine is cancelled, the RPC is also cancelled
     * with the corresponding exception as a cause.
     *
     * @param request The request message to send to the server.
     *
     * @return The single response from the server.
     */
    suspend fun getUserById(request: Int64Value): Demo.User = unaryRpc(
      channel,
      UserServiceGrpc.getGetUserByIdMethod(),
      request,
      callOptions,
      Metadata()
    )

  /**
   * Skeletal implementation of the com.example.grpcdemo.service.UserService service based on
   * Kotlin coroutines.
   */
  abstract class UserServiceCoroutineImplBase(
    coroutineContext: CoroutineContext = EmptyCoroutineContext
  ) : AbstractCoroutineServerImpl(coroutineContext) {
    /**
     * Returns the response to an RPC for com.example.grpcdemo.service.UserService.getUserById.
     *
     * If this method fails with a [StatusException], the RPC will fail with the corresponding
     * [Status].  If this method fails with a [java.util.concurrent.CancellationException], the RPC
     * will fail
     * with status `Status.CANCELLED`.  If this method fails for any other reason, the RPC will
     * fail with `Status.UNKNOWN` with the exception as a cause.
     *
     * @param request The request from the client.
     */
    open suspend fun getUserById(request: Int64Value): Demo.User = throw
        StatusException(UNIMPLEMENTED.withDescription("Method com.example.grpcdemo.service.UserService.getUserById is unimplemented"))

    final override fun bindService(): ServerServiceDefinition = builder(getServiceDescriptor())
      .addMethod(unaryServerMethodDefinition(
      context = this.context,
      descriptor = UserServiceGrpc.getGetUserByIdMethod(),
      implementation = ::getUserById
    ))
      .addMethod(serverStreamingServerMethodDefinition(
      context = this.context,
      descriptor = UserServiceGrpc.getListUsersMethod(),
      implementation = ::listUsers
    )).build()
  }
}
{% endhlcode %}

There isn't much rocket science here. The code looks much similar to what we would have written if we were implementing this boilerplate ourselves.

In our previous example, we have used a unary call. gRPC also has good support for streaming.

Before we conclude our post, let's quickly look at what implementing a stream returning endpoint looks like. We add a `listUsers` method to our `UserService` which returns a stream of `User`.

{% hlcode lang:protobuf highlight:10 %}
syntax = "proto3";

package com.example.grpcdemo.service;

import "google/protobuf/wrappers.proto";
import "google/protobuf/timestamp.proto";

service UserService {
  rpc getUserById (google.protobuf.Int64Value) returns (User);
  rpc listUsers(ListUsersInput) returns (stream User);
}

message ListUsersInput {}

message User {
  int64 id = 1;
  string name = 2;
}

{% endhlcode %}

One weird gRPC oddity is that even though our function does not need an argument, it is required to accept an argument, and hence we have defined an empty message type.

As you may expect, on the kotlin side our return value is a [Flow](https://kotlinlang.org/docs/flow.html#sequences) - enabling us to return a collection of values over time.

In our simple example below, we simply return a list, converted to a flow through a convenient extension function from kotlinx.coroutines.

{% hlcode lang:kotlin highlight:11,25 fold:4-9 %}
@GrpcService
class UserService: UserServiceGrpcKt.UserServiceCoroutineImplBase() {

    override suspend fun getUserById(userId: Int64Value): Demo.User {
        return Demo.User.newBuilder().apply {
            id = userId.value
            name = "Lorefnon"
        }.build()
    }

    override fun listUsers(request: Demo.ListUsersInput): Flow<Demo.User> {
        return listOf(
            Demo.User.newBuilder().apply {
                id = 10
                name = "Harry"
            }.build(),
            Demo.User.newBuilder().apply {
                id = 20
                name = "Hermione"
            }.build(),
            Demo.User.newBuilder().apply {
                id = 20
                name = "Ron"
            }.build()
        ).asFlow()
    }
}
{% endhlcode %}

Lastly, if you don't want to deal with coroutines, you don't need to. It is perfectly fine to still use the base classes generated for Java, in your kotlin code.

In fact, it is also perfectly fine to use just the kotlin extensions for Protobuf DSL, while not using the `*CoroutineImplBase` classes for gRPC. The two have no dependency on each other.

To illustrate this in our last example, we could have written:

{% hlcode lang:kotlin %}
@GrpcService
class UserService: UserServiceGrpc.UserServiceImplBase() {

    override fun getUserById(
      userId: Int64Value,
      responseObserver: StreamObserver<User>
    ) {
      responseObserver.onNext(user {
        id = userId.value
        name = "Lorefnon"
      })
      responseObserver.onCompleted()
    }

    override fun listUsers(
      request: Demo.ListUsersInput,
      responseObserver: StreamObserver<User>
    ) {
      responseObserver.onNext(
        user {
          id = 10
          name = "Harry"
        }
      )
      responseObserver.onNext(
        user {
          id = 20
          name = "Hermione"
        }
      )
      responseObserver.onNext(
        user {
          id = 20
          name = "Ron"
        }
      )
      responseObserver.onFinish()
    }
}
{% endhlcode %}

As we are using `UserServiceGrpc.UserServiceImplBase` instead of `UserServiceGrpcKt.UserServiceCoroutineImplBase`, our functions are no longer suspending functions. Also instead of returning values, they accept a `responseObserver` which can be used to return one or more values.

This brings us to the end of this short post. We explored how we can bootstrap a simple gRPC service using kotlin and spring boot, and handle unary calls and streaming. As next steps you are encouraged to explore the [grpc-spring-boot-starter's introduction](https://yidongnan.github.io/grpc-spring-boot-starter/en/server/getting-started.html) and the [gRPC official site](https://grpc.io/) which provide detailed documentation on gRPC integrations.
