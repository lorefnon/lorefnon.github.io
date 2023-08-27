---
title: Conditional Queries in Postgres with help from JSON Operators
date: 2023-08-27 11:16:20
tags: [Postgres,JSON]
---

For many mainstream languages we have query builder libraries that enable us to easily create `select` queries with complex `where` conditions that conditionally filter by multiple columns based on incoming input. These are often useful for things like a filter panel in product catalogue where user may specify one or more of several possible criteria.

This post outlines an alternative solution. If we structure our input parameter as json (or any other compound data type for that matter), we can handle the conditional clauses within SQL with some creativity.

For example, to find users by id or email, we can do something like this: 

```sql
select * 
from "user" u 
left join user_email ue 
    on ue.user_id = u.id
where 
    (
        -- Filter conditions
        ($1::jsonb #>> '{id,eq}' is null or u.id = ($1::jsonb #>> '{id,eq}')::bigint ) or
        ($1::jsonb #>> '{email,eq}' is null or ue.email = ($1::jsonb #>> '{email,eq}'))
    ) and

    -- Fallback to ensure that nothing is selected if no filters are passed
    ($1::jsonb #>> '{id,eq}' is not null or $1::jsonb #>> '{email,eq}' is not null)
```

We can pass input parameters like: `{ "id": { "eq": 1 } }` or `{ "email": { "eq": "lorefnon@tutanota.com" } }` and it will filter appropriately.

We can skip the jsonb cast if our client library allows us to cast parameters while passing to database

```sql
select * 
from "user" u 
left join user_email ue 
    on ue.user_id = u.id
where 
    (
        -- Filter conditions
        (($1 #>> '{id,eq}') is null or u.id = ($1 #>> '{id,eq}')::bigint ) or
        (($1 #>> '{email,eq}') is null or ue.email = ($1 #>> '{email,eq}'))
    ) and

    -- Fallback to ensure that nothing is selected if no filters are passed
    ($1 #>> '{id,eq}' is not null or $1 #>> '{email,eq}' is not null)
```

While this is arguably more verbose and less readable (due to the use of non-intuitive json operators), there are a few benefits to this approach.

One is that we don't need a complex query builder library, which may be a plus if we are working with a niche language and/or a restricted runtime like openresty. 

Other is that this approach pairs well with prepared statements and the query can be parsed and analyzed just once - if we use a query builder to create slightly differing SELECT statements for various use cases, they would need to be parsed separately each time. Of course, we are trading off per-execution query parsing with per-execution json parsing, but if our json is not very complex, the parsing overhead is lower.

One apparent limitation is that we can not perform conditional joins. However, that can often be alleviated with usage of unions:

```sql
select * 
from "user" u
where 
    ($1 #>> '{id,eq}') is not null and u.id = ($1 #>> '{id,eq}')::bigint

union all 

select u.* 
from "user" u
join user_email ue
    on ue.user_id = u.id
where
    ($1 #>> '{email,eq}') is not null and ue.email = ($1 #>> '{email, eq}')
```

or, by building up subselections for individual filters in CTE steps and then combining them in the final select:

```sql
-- CTE Steps for each possible criteria
with user_fby_email as (
    select ue.user_id 
    from user_email ue
    where ($1::json #>> '{email,eq}') is not null and ue.email = ($1::json #>> '{email,eq}')
)

-- Directly handle the criteria for user table (for which an additional subquery is unnecessary)
select u.*
from "user" u
where (($1 #>> '{id,eq}' is not null and u.id = ($1::jsonb #>> '{id,eq}')::bigint ))

union all

-- Merge users for each criteria
select u.*
from "user" u
where u.id in (select user_id from user_fby_email)
```

The latter tends to be more readable when there are many possible filter criteria.

When using multiple tables, these approaches are likely to enable better index utilization.

We do need to analyze EXPLAIN queries with all possible combinations of inputs to ensure that indexes are properly utilized - but that is something we would have needed when using query builders or ORMs too.
