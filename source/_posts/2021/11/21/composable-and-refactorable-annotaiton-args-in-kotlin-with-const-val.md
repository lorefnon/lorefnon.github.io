---
title: Composable and Refactorable annotation arguments in Kotlin with const val
date: 2021-11-21
tags: [Kotlin]
---

There are many libraries in JVM ecosystem that lean heavily on use of annotations. A pain point when dealing with string args passed to annotations is that they are hard to compose/reuse.

For example, here is a sample mybatis mapper:

{% hlcode lang:kotlin %}
import org.apache.ibatis.annotations.Select

interface PersonMapper {

    @Select(
        """
        select *
        from person where id = #{value}
        """
    )
    fun selectPersonById(id: Int): Person

    @Select(
        """
        select *
        from person where email = #{value}
        """
    )
    fun selectPersonById(email: String): Person

}
{% endhlcode %}

As written above, if we want to change the name of person table in future, we'd have to resort to find/replace across the project, which isn't great.

In addition, a typo in the table name would be a runtime error as opposed to a compile time.

Both of the above issues are easily solvable by using `const val` feature of Kotlin, for defining compile time constants.

{% hlcode lang:kotlin %}
const val PERSON_TABLE = "person"

interface PersonMapper {

    @Select(
        """
        select *
        from ${PERSON_TABLE} where id = #{value}
        """
    )
    fun selectPersonById(id: Int): Person

    @Select(
        """
        select *
        from ${PERSON_TABLE} where email = #{value}
        """
    )
    fun selectPersonById(email: String): Person

}

{% endhlcode %}

String constants can simply be interpolated into the strings passed to annotations, and they can be changed in one place if need be.

This also enables us to extract fragments and reuse them in multiple annotations, enabling reusability. In addition, if we follow the pattern consistently, IDE features like "Find usages" enable us to quickly find all the mappers which are accessing the user table.

Another example here uses Retrofit library for creating declarative REST API clients:

{% hlcode lang:kotlin %}

const val VERSION = "v1"
const val USER_ENDPOINT = "/api/${VERSION}/user"

interface UserClient {

    @GET(USER_ENDPOINT)
    fun getUserByEmail(
        @Query("email") email: String
    ): Call<User>

    @GET(USER_ENDPOINT)
    fun getUserById(
        @Query("id") id: String
    ): Call<User>

}
{% endhlcode %}

Now when we migrate to new version, we just need to change the version in one place. Also multiple functions targeting the same endpoint can refer to it through a shared constant, making the code DRY-er.
