---
title: Using chi router and connect-go together
tags: [go, chi, connect]
date: 2022-10-01
---

[connect-go](https://github.com/bufbuild/connect-go) is a protobuf RPC implementation, touted as a better gRPC. I have been using it for few weeks and have found it to be quite enjoyable.

This post is a quick recipe on how to use it alongside chi router. The [official docs](https://github.com/bufbuild/connect-go#a-small-example) already illustrate using connect with net/http2 directly. But if you are incrementally adopting connect in a project, or need a few REST style endpoints for backward compatibility, or for file uploads or serving server generated templates, it is easy to use connect alongside the [chi router](https://go-chi.io/). 

{% hlcode lang:go %}
mux := chi.NewRouter()

// Middlewares
mux.Use(middleware.Logger)

// HTTP Endpoints
mux.Post("/upload", handleFileUpload)

// Connect API Endpoints
// Associate the Handlers generated from the protobuf file
path, handler := pbconnect.SampleServiceHandler(
    // Pass service implementation here:
    &SampleServiceImpl{},
)
mux.Handle(path+"*", handler) // <----- Note The "*" wildcard suffix here

// Use h2c so we can serve HTTP/2 without TLS.
handler := h2c.NewHandler(mux, &http2.Server{})

err := http.ListenAndServe("localhost:8080", handler)
if err != nil {
	panic("Failed to init http server")
}
{% endhlcode %}
