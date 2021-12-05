---
title: Extending Exposed with new function expressions
date: 2021-12-05
tags: [Database, Exposed]
excerpt: An overview of adding support for unsupported database functions in the Exposed ORM
---

[Exposed](https://github.com/JetBrains/Exposed) is a nice ORM for Kotlin by [Andrey Tarashevskiy](https://github.com/Tapac) from [Jetbrains](https://www.jetbrains.com/). Though, not an offically supported product by Jetbrains it has a good following in the Kotlin community. 

I recently got involved in a project using Exposed and discovered that the set of database level functions that are mapped by Exposed is quite small. However, the library makes it easy to add support for the missing functions, which is what this post outlines. 

Let's say we want to support product of two columns. We can support this by extending the `ExpressionWithColumnType` class.

```kotlin
class Product<T>(
    private val expr1: ExpressionWithColumnType<T>,
    private val expr2: ExpressionWithColumnType<T>
): ExpressionWithColumnType<T>() {
    override val columnType: IColumnType
        get() = expr1.columnType

    override fun toQueryBuilder(queryBuilder: QueryBuilder) {
        queryBuilder.append("(", expr1, "*", expr2, ")")
    }
}
```

This accepts two columns (Column class extends ExpressionWithColumnType too) of same type, and constructs the expression for multiplying these column values. 

While this class can be used directly, it is often convenient to also write an extension method that enables us to chain the operations similar to other exposed functions. 

```kotlin
fun <T> ExpressionWithColumnType<T>.product(expr: ExpressionWithColumnType<T>) =
    Product(this, expr)
```

So now, we can easily use this in our code as: 

```kotlin
DesginationTable
    .slice(
        DesignationTable.name,
        DesginationTable.employeeCount.product(DesginationTable.salary)
    )
    .groupBy(DesignationTable.name)
    .toList()
```

It is usually also convenient to use an alias to retrieve aggregated values: 

```kotlin
data class DesignationSalaryDTO(
    val name: String,
    val totalSalary: Double
)

val totalSalary = DesginationTable.employeeCount.product(DesginationTable.salary).alias("total_salary")

val salaryRow DesginationTable
    .slice(
        DesignationTable.name, 
        // We can use the alias in our slice
        totalSalary
    )
    .groupBy(DesignationTable.name)
    .map { resultRow ->
        // Map results to a DTO
        DesignationSalaryDTO(
            name = DesignationTable.name,
            // We can use the same alias when retrieving the column value
            totalSalary = resultRow[totalSalary]
        )
    }
```

This illustrates how we can nicely add our extension functions for operations that the library does not support, and use them in pretty much the same way as built in expression composition functions. 