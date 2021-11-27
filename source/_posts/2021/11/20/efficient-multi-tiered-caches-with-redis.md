---
title: Simple and efficient multi-tiered caches with Redis & lua
date: 2021-11-20
tags: [Redis]
---

[Redis](https://redis.io/) is one of the most popular in-memory stores currently. It has a minimal footprint, is blazing fast and has managed solutions available in most cloud platforms.

However, people using redis as a cache often use it as a simple key-value store. It is not uncommon to see usages like `users:by-id:1` pointing to a serialized User entity with id 1, and `users:by-email:jon@example.com` pointing to a serialized User entity with a specific email. In case they are the same user, we end up storing the same entity twice, with different keys.

In this post, we outline that it is rather straightforward to avoid this by having a secondary index for this. 

In above scenario, this translates to `users:by-email:*` being a secondary index, pointing to user id which can be looked up from primary index. So `GET users:by-email:joe@example.com` returns `1`, and then we can lookup user by `GET users:by-id:1`. This can help us reduce memory usage through deduplication, but the caveat is that we now need multiple lookups. 

However, these multiple lookups don't need to be multiple tcp roundtrips between the application and cache server. We can utilize lua script support to use the value of first lookup in second lookup within the same request.

In practice, this looks something like this:

```
EVAL "local user_id = redis.call('GET', KEYS[1]); if (user_id == false) then return false else return redis.call('GET', 'users:by-id:' .. user_id); end" 1 'users:by-email:joe@example.com1'
```

Here the first arg to eval is a lua script, here is a better formatted snippet: 

```lua
local user_id = redis.call('GET', KEYS[1]);

if (user_id == false) then -- GET returns false if primary lookup fails
    return false           -- will translate to a nil reply from redis
else 
    return redis.call('GET', 'users:by-id:' .. user_id); 
end
```

The second arg is number of arguments to be passed to the script, and in this case the only arg is the secondary index key, which we access in the above script as `KEYS[1]`. Quick reminder that lua array indices start from 1 :)

The redis guide has [more pointers](https://redis.io/commands/eval#conversion-between-lua-and-redis-data-types) on the redis <-> Lua type conversions, which you might want to glance through before venturing deeper into lua scripting with redis.
