---
title: Being explicit about implementing interfaces in Golang
tags: [Go]
---

Go embraces structural typing, so struct types don't need to explicitly implement interfaces in order to be used a concrete instance of the interface. This offers more flexibility over nominative typing (as in Java, C# etc.) esp. when integrating libraries that are unaware of each other. 

However, unlike typescript etc. go also does not offer a way to explicitly declare that a struct type is **intended** to satisfy an interface. 

The result of this is that if someone later refactors a method of the struct such that it no longer implements the interface it used to before, then a type error is not immediately visible in the same file. Rather the location of error is the use site where an instance of the interface is expected. This is more problematic if such a use site does not even exist in the current repo.

I found this to be a periodic annoyance when implementing gRPC API specs where the service structs are always intended to implement the interfaces generated from the API spec, and any breakage should be immediately noticed and preferrably identified close to the service implementation.

Fortunately, the solution is pretty simple: just add a struct method that returns an instance of the interface. 

```go
type UserQueryService struct {
    // Members omitted
}

func (s *UserQueryService) ASUserQueryServiceHandler() pbconnect.UserQueryServiceHandler {
	return s
}
```

Now if we introduce any error that makes UserQueryService incompatible with `pbconnect.UserQueryServiceHandler` interface, a compile time error will be reported in the above method.
