---
title: Using CDK to configure cloudfront as non-caching reverse proxy for API backend
tags: [cloudfront, AWS, CDK, typescript]
date: 2022-12-06
popular: true
permalink: 2022/12/06/using-cdk-to-configure-cloudfront-as-non-caching-reverse-proxy-for-api-backend/
---

Cloudfront is primarily a CDN, but it is often also convenient to use it as reverse proxy for a backend service. This is especially convenient when the entire frontend SPA (including HTML) is already hosted from Cloudfront and we don't want to support CORS in our backend API that this frontend talks to.

Reusing Cloudfront as a reverse proxy in such cases ensures that both our frontend and backend can be available from the same domain. However, in such case we must take special care to ensure that our backend responses do get unexpectedly cached by Cloudfront. This post outlines the CDK configuration to facilitate this.

A minimal Cloudfront setup for an SPA may look something like this: 

```ts
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";

export class FrontendStack extends cdk.Stack {
  publicAssetsS3Bucket = new s3.Bucket(this, 'PublicAssetsS3Bucket', {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    publicReadAccess: true,
    websiteIndexDocument: "index.html",
    versioned: false,
  })

  s3Origin = new origins.S3Origin(this.publicAssetsS3Bucket);

  cfDistribution = new cf.Distribution(this, 'CFDistribution', {
    defaultBehavior: {
      origin: s3Origin,
    },
    // Certificate and domain configuration omitted
  });
}
```

Here our CF Distribution is backed by an S3 bucket.

Now, to support reverse proxying to an API we need an additional origin. While adding this origin, we will also want to configure additional policies to ensure that the responses from this origin do not get cached: 

```ts
dist.addBehavior("/api/*", apiOrigin, {
    responseHeadersPolicy: cfAPIRespHeadersPolicy,
    allowedMethods: cf.AllowedMethods.ALLOW_ALL,
    cachePolicy: cfApiCachePolicy,
    originRequestPolicy: cfApiOriginReqPolicy,
});
```

It is important to explicitly allow all methods because CF by default permits only GET & HEAD requests, and other HTTP verbs will be rejected.

Let's next look at the associated policies: 

Following Response headers policy primary hints browsers to not cache the API responses:

```ts
cfAPIRespHeadersPolicy = new cf.ResponseHeadersPolicy(this, "CFAPIRespHeadersPolicy", {
    customHeadersBehavior: {
      customHeaders: [
        {
          header: "Cache-Control",
          override: true,
          value: "no-cache",
        },
      ],
    },
});
```

The Cache policy will ensure that cloudfront itself does not cache the responses from our API backend: 

```ts
cfApiCachePolicy = new cf.CachePolicy(this, "ApiCachePolicy", {
  defaultTtl: cdk.Duration.seconds(0),
  maxTtl: cdk.Duration.seconds(1),
  queryStringBehavior: cf.CacheQueryStringBehavior.all(),
  headerBehavior: cf.CacheHeaderBehavior.allowList('Authorization')
});
```

Note that we also need to explicitly allow the Authorization header otherwise it will be stripped by Cloudfront. 

Currently there appears to be a bug which prevents us from being able to specify a header behavior if all the ttls are 0, so we keep the maxTtl as 1s.

Lastly, we need an OriginRequestPolicy that instructs Cloudfront to forward all query params & cookies to the backend. In addition we can also specify any cloudfront specific headers here. In example below we add the `CloudFront-Viewer-Address` header which enables the backend to receive the actual IP of the user.

```ts
cfApiOriginReqPolicy = new cf.OriginRequestPolicy(this, "ApiOriginReqPolicy", {
    originRequestPolicyName: "SampleApiOriginReqPolicy",
    cookieBehavior: cf.OriginRequestCookieBehavior.all(),
    headerBehavior: cf.OriginRequestHeaderBehavior.all(
      "CloudFront-Viewer-Address"
    ),
    queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
});
```

Our final integration looks like this:

```ts
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class FrontendStack extends cdk.Stack {
  publicAssetsS3Bucket = new s3.Bucket(this, 'PublicAssetsS3Bucket', {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    publicReadAccess: true,
    websiteIndexDocument: "index.html",
    versioned: false,
  })

  cfApiCachePolicy = new cf.CachePolicy(this, "ApiCachePolicy", {
    defaultTtl: cdk.Duration.seconds(0),
    maxTtl: cdk.Duration.seconds(1),
    queryStringBehavior: cf.CacheQueryStringBehavior.all(),
    headerBehavior: cf.CacheHeaderBehavior.allowList('Authorization')
  });

  cfApiOriginReqPolicy = new cf.OriginRequestPolicy(
    this,
    "ApiOriginReqPolicy",
    {
      originRequestPolicyName: "SampleApiOriginReqPolicy",
      cookieBehavior: cf.OriginRequestCookieBehavior.all(),
      headerBehavior: cf.OriginRequestHeaderBehavior.all(
        "CloudFront-Viewer-Address",
        "CloudFront-Viewer-Country",
        "CloudFront-Viewer-City",
        "CloudFront-Viewer-Country-Region"
      ),
      queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
    }
  );

  s3Origin = new origins.S3Origin(this.publicAssetsS3Buckets[idx]);

  apiOrigin = new origins.HttpOrigin(serverHost!);
  
  cfAPIRespHeadersPolicy = new cf.ResponseHeadersPolicy(
    this,
    "cfHTMLRespHeadersPolicy",
    {
      customHeadersBehavior: {
        customHeaders: [
          {
            header: "Cache-Control",
            override: true,
            value: "no-cache",
          },
        ],
      },
    }
  );

  configureCFDistribution = (): cf.Distribution => {
      const dist = new cf.Distribution(this, 'CFDistribution', {
        defaultBehavior: {
          origin: s3Origin,
        },
        // Certificate and domain configuration omitted
      });

      dist.addBehavior("/api/*", apiOrigin, {
        responseHeadersPolicy: this.cfAPIRespHeadersPolicy,
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: this.cfApiCachePolicy,
        originRequestPolicy: this.cfApiOriginReqPolicy,
      });

      return dist;
  }

  cfDistribution = this.configureCFDistribution()
}
```
