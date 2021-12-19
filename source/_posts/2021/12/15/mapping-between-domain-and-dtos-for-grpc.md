---
title: Mapping between Domain and DTO classes for gRPC APIs
date: 2021-12-05
popular: true
tags: [gRPC, Kotlin, Spring, Spring-Boot]
excerpt: An overview of different approaches we can use to convert between the domain classes (which the business logic operates on) and the DTO classes which are exposed to the API.
---

In a [previous post](/2021/09/04/bootstrapping-a-grpc-server-with-spring-boot-and-kotlin) we briefly explored how to build a gRPC api backend with Kotlin. 

In particular, we saw that from the protobuf spec which defines our API, the [protoc compiler](https://grpc.io/docs/protoc-installation/) (along with language specific plugins) is able to generate classes for the language(s) in which our server (or client) is implemented. 

To exemplify for our case (a kotlin/JVM backend), given a proto spec like this: 

```protobuf
message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

The code generator generates an immutable User java class, and an associated builder, which we can invoke like this: 

```kotlin
User
    .newBuilder()
    .setId(1)
    .setName("Lorefnon")
    .build()
```

We also get a set of kotlin extensions, which enable us to do the same thing through a more idiomatic kotlin builder: 

```kotlin
user {
    id = 1
    name = "Lorefnon"
}
```

Note that in this post we mostly consider the official proto plugins for Java & Kotlin (which are complementary) by Google. Generated code may substantially differ for other alternative implementations like [kroto-plus](https://github.com/marcoferrer/kroto-plus) and [pbandk](https://github.com/streem/pbandk).

These classes are primarily intended for deserializing from and serializing to the protobuf format. The conventional term in the JVM ecosystem for such classes, which are primarily intended to transport the data across API boundaries is DTO (Data Transfer Object).

Now the question arises, what do we use in our business logic ?

## Option 1: Using the generated classes in core business logic as well. 

There is nothing really preventing us from using the generated class in our business logic as well. 

However, we should be aware of some restrictions: 

1. Generated DTOs are final: 

    This means that we can't inherit from these classes, can't extend them with internal fields (not part of the API) and can't add behaviors (methods) to them. 

2. They are immutable:

    So whenever we need to get an updated entity, we will need to clone the entity with modifications. 

Thus, using the DTOs as Domain classes as well works well primarily when the business logic is entirely implemented as functional services. 

However, if you need mutability or are not so happy with [anaemic domain models](https://martinfowler.com/bliki/AnemicDomainModel.html), we have a few options.

## Option 2: Pass around the builders

One thing that may not be obvious to developers used to conventional java builders, is that the builders generated from protobuf have both getters and setters. 

So when we need mutability, we can just use the builders and call build only once the object needs to be serialized. 

I recommend doing this only internally within a service class, and not have the builders be passed around across services. 

One reason for this is that in a method that receives a builder instance, we don't have any guarantee from the compiler that all non-optional values have been populated. 

## Option 3: Compose over the builders

A class that composes over the builder can: 

1. Ensure that any consumer never receives a partially populated builder
2. Add behavior to a builder class - I have found this to be particularly useful for things like computed values (like age derived from created_at) which logically belong in the entity class.

While this would have been cumbersome & boilerplate heavy in java, Kotlin's support for interface delegation comes in really handy here. 

```kotlin
class UserBuilder private constructor(
    private val internalBuilder: User.Builder
): UserOrBuilder by internalBuilder {

    // To be used when constructing new objects
    public constructor(
        name: String,
        email: String
        // Other fields whose presence we want to enforce
    ): this(
        User
            .newBuilder()
            .setName(name)
            .setEmail(email)
    )

    // To be used when deserializing previously serialized entity 
    public constructor(
        inputStream: InputStream
    ): this(
        User.newBuilder().mergeFrom(inputStream)

        // If we had successfully serialized, then we know that all mandatory fields will be present
        //
        // But we can add validations if we are consuming multiple generations of serialized entities
    )

    // If needed, define similar constructors to consume ByteArray/ByteString

    // Define setters for fields for which you want to explicitly allow mutation
    fun setName(mail: String) {
        internalBuilder.email = mail
    }
}
```

The UserOrBuilder is a generated interface which contains all the getters. By delegating to this interface through the builder, we can directly invoke all the setters directly on an instance of our `UserBuilder` class, and they'll be proxied to the underlying builder.

By ensuring that our constructor accepts all mandatory parameters, our consumers are guaranteed to never receive partially populated builders. 

Also, we are explicit about which fields we want to allow mutation for. 

The only caveat with this approach is that it is quite a bit of boilerplate because a large set of fields have to enumerated over in the constructor. 

## Option 4: Use a mapping library like MapStruct

MapStruct is a really nice model mapping library for java that has good support for Kotlin and protobuf style builders. 

One great feature of the library, as compared to many other similar model mapping libraries is that there is no reflection involved during mapping - which makes this library very performant in practice. 

Application developers need to define mapper interfaces, and at compile time MapStruct will generate mapper classes which convert between one type to another. 

With this library, we can define our domain classes as Kotlin (data) classes and have them mapped to/from the API classes at the API service layer. 

Following are the primary dependencies we need: 

```kotlin
implementation("org.mapstruct:mapstruct:1.4.2.Final")
kapt("org.mapstruct:mapstruct-processor:1.4.2.Final")
kapt("no.entur.mapstruct.spi:protobuf-spi-impl:1.18")
```

In a spring project, we'd also want MapStruct to automatically annotate generated classes with `@Component` so that we can directly inject them in our services: 

```kotlin
kapt {
    arguments {
        arg("mapstruct.defaultComponentModel", "spring")
    }
}
```

Now, we can define a mapper abstract class or interface, which MapStruct will use to generate our Mappers: 

```kotlin
@Mapper(
    // We can not assign null to setters in protobuf builders
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,

    // For collection members (repeated fields in protobuf), we should use 
    // the add* methods rather than set* methods
    collectionMappingStrategy = CollectionMappingStrategy.ADDER_PREFERRED
)
abstract class DTOMapper {
    abstract fun mapUserFromPB(source: User): UserEntity
    abstract fun mapUserToPB(source: UserEntity): User
}
```

Here `User` entity is the class generated from protobuf, and `UserEntity` is our internal domain class.

For this particular example, this is all we need if our fields have the same name in both classes, and the generated classes and the domain classes use the same types. 

In real world applications, both of these will sometimes not be true. However, to handle these special cases we can configure MapStruct with custom mappings and specify shared type mappers.

```kotlin
abstract class DTOMapper {

    // Custom mapping for field
    @Mappings(
        value = [
            Mapping(source = "mailAddress", target = "email")
        ]
    )
    abstract fun mapUserFromPB(source: User): UserEntity

    // Convert between types used in Domain classes and DTOs
    fun map(value: Date) =
        LocalDate.of(value.year, value.month, value.day)

    fun map(value: LocalDate): Date =
        Date.newBuilder()
            .setDay(value.dayOfMonth)
            .setMonth(value.monthValue)
            .setYear(value.year)
            .build()
}
```

MapStruct [docs](https://mapstruct.org/documentation/installation/) cover all possible options in much more detail.

In our RPC service implementations, we can inject our mappers and use them to transform inputs before delegating to internal classes, and after receiving the results from the internal classes. 

```kotlin
@GrpcService
class UserRPCService(
    private val userRepo: UserRepository,
    private val mapper: DTOMapper
) : UserServiceGrpcKt.UserServiceCoroutineImplBase() {

    override suspend fun getUser(request: UserIdRequest): User {
        return mapper.mapUserToPB(userRepo.getUser(request.id))
    }

}
```

This is the option with minimum boilerplate, but has the trade-off of needing additional heap allocations. However, it is usually an acceptable tradeoff when the types used in the DTOs often differ from the the types used in the domain classes or when we need multiple representations of the same domain class(es) in the API layer (with different set of fields).
