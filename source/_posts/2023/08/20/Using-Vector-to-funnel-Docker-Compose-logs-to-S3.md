---
title: Using Vector to funnel Docker Compose logs to S3
date: 2023-08-20 12:44:55
tags: [Docker, Docker-Compose, Vector, AWS, S3]
---

[Docker compose](https://docs.docker.com/compose/) is an easy-to-use utility for running multi-container applications. It is particularly suited for development and local testing, but is also useful for production development of low-traffic/personal-use application which neither need a full fledged cluster nor features like auto-scaling/failover-handling which come with more advanced container orchestration solutions.

This post is a quick recipe to funnel docker compose logs to AWS S3 for long term archival.

The utility we use for shipping the logs is [Vector](https://vector.dev/guides/). Vector is a full featured observability pipeline solution which supports not just shipping but also aggregating and transforming logs. However, in this post we just use it to ship logs to a bucket so that we can analyse them later if needed. Being a rust-based native utility, it has a very low footprint and is well suited to single server or homelab deployments.

In `docker-compose.yaml`:

```yaml
version: "3.9"

services:
  vector:
    image: timberio/vector:0.31.0-debian
    restart: always
    container_name: vector
    hostname: vector
    environment: 
      - DOCKER_HOST="unix:///var/run/docker.sock"
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
      - AWS_REGION
    ports:
      - '8383:8383'
    volumes:
      - ./vector-setup/vector.yaml:/etc/vector/vector.yaml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: --config /etc/vector/vector.yaml

  # Add any other services:
  caddy:
    image: caddy:latest
    volumes:
      - ./modules/caddy-setup/tmp/config:/config
      - ./modules/caddy-setup/tmp/data:/data
      - ./modules/caddy-setup/Caddyfile:/etc/caddy/Caddyfile
    ports:
      - "80:80"
      - "443:443"
```

Since vector needs to communicate with the docker daemon we need to mount the docker socket and make it available to the vector container.

In the vector.yaml config, we can specify which bucket we want to funnel our logs to and which services we want to track:

```yaml
data_dir: /var/lib/vector
sources:
  docker_logs_source:
    type: docker_logs
    docker_host: "unix:///var/run/docker.sock"

sinks:
  s3_sink:
    type: aws_s3
    inputs: [docker_logs_source]
    region: ap-south-1
    bucket: my-service-logs
    key_prefix: "container-logs/date=%Y-%m-%d"
    compression: gzip
    encoding:
      codec: json
```

And that is all we need. Once we run `docker compose up`, after a while we should see our logs getting dumped into the S3 bucket.
