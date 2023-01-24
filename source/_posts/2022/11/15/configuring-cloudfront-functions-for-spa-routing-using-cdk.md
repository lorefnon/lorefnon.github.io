---
title: Configuring cloudfront functions for SPA routing with CDK
tags: [cloudfront, AWS, CDK]
date: 2022-11-15
popular: true
---

When building [single page applications](https://en.wikipedia.org/wiki/Single-page_application), it is convenient to serve the complete website including the HTML files from a CDN like AWS cloudfront. All the assets can then be potentially served from a location close to the user. This works particularly well for PWAs and dynamic client rendered websites. 

It is also common to use [push based](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API) routing in single page applications. However the first request would always go the server so we need to setup some server side routing as well to route these requests to an appropriate HTML file. In the simplest case we'd route all incoming requests to our domain to a single index.html file, and the javascript referenced in the HTML file will take over once the browser renders it.

This is easily accomplished via [cloudfront functions](https://docs.amazonaws.cn/en_us/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html), which are a [recently introduced](https://aws.amazon.com/blogs/aws/introducing-cloudfront-functions-run-your-code-at-the-edge-with-low-latency-at-any-scale/) cost effective alternative to [lambda@edge](https://docs.amazonaws.cn/en_us/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html). 

lambda@edge may be more suitable if you need to execute complex logic and need access to a more full-fledged execution environment like node.js (For example if you are doing server side rendering). However for simpler use cases like changing routes, adapting headers etc. cloudfront functions offer a simpler and more cost effective alternative.

Here is a simple function to route all requests which don't have an extension in the url to index.html: 

```js
// path-redir-rule.js
function handler(event) {
    var request = event.request
    var hasExtension = request.uri.includes('.')
    if (!hasExtension) {
        request.uri = '/app/index.html'
    }
    return request;
}
```

Because we love [IaC](https://en.wikipedia.org/wiki/Infrastructure_as_code), we will use [CDK](https://aws.amazon.com/cdk/) to wire up our cloudfront. This post is not intended to be a good first intro to CDK, but here are a few if you are using it for first time: [[1]](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-cdk-getting-started.html), [[2]](https://dev.to/kevin_odongo35/getting-started-with-aws-cdk-2k19).

It should not surprise anyone that AWS CDK has good support for AWS Cloudfront. 

Here is a simple stack that uses CDK with typescript to wire up a cloudfront stack backed by an S3 bucket. 

```ts
import path from "node:path"
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class FrontendStack extends cdk.Stack {
  publicAssetsS3Bucket = new s3.Bucket(this, "PublicAssetsBucket", {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    publicReadAccess: true,
    websiteIndexDocument: "index.html",
    versioned: false,
  });

  this.cfOrigin = new origins.S3Origin(this.publicAssetsS3Bucket);

  this.cfDistribution = new cf.Distribution(this, "CFDistribution", {
    defaultBehavior: {
      origin: this.cfOrigin
    }
  });
}
```

In a production application we will also configure certifications and domains for the distribution, which I have omited to keep the post focussed, but here is [another post](https://blog.dennisokeeffe.com/blog/2021-08-08-building-a-cdn-with-s3-cloudfront-and-the-aws-cdk) that convers those things too.

We can now update this CF distribution configuration to use our function.

{% hlcode lang:ts highlight:9-16,23-28 %}
export class FrontendStack extends cdk.Stack {
  publicAssetsS3Bucket = new s3.Bucket(this, "PublicAssetsBucket", {
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    publicReadAccess: true,
    websiteIndexDocument: "index.html",
    versioned: false,
  })

  cfPathRedirFunction = new cf.Function(this, "PathRedirFunction", {
      code: cf.FunctionCode.fromFile({
        filePath: path.join(
          __dirname,
          "./cf-functions/path-redir-rule.js"
        ),
      }),
    });

  this.cfOrigin = new origins.S3Origin(this.publicAssetsS3Bucket);

  this.cfDistribution = new cf.Distribution(this, "CFDistribution", {
    defaultBehavior: {
      origin: this.cfOrigin,
      functionAssociations: [
        {
          function: this.cfPathRedirFunction,
          eventType: cf.FunctionEventType.VIEWER_REQUEST,
        }
      ],
    }
  });
}
{% endhlcode %}

Since this function will need to be run before the target is selected, we needed to use `VIEWER_REQUEST` event type.

We can also consider adding a response function which adds headers to prevent the browser from caching our html pages, as we can expect it to frequently change.


```ts
// prevent-html-caching.js

function handler(event) {
    var request = event.request
    var parts = request.uri.split('/')
    var lastPart = parts[parts.length-1]
    var response = event.response;
    var headers = response.headers;
    if (lastPart.match(/\.html$/) || lastPart.match(/^[^.]*$/)) {
        headers['cache-control'] = { value: 'no-cache' }
    }
    return response
}
```

Because this function needs access to the response being sent, the function event type needs to be `VIEWER_RESPONSE`.

{% hlcode lang:ts highlight:4-11,23-26 %}
export class FrontendStack extends cdk.Stack {
  // ...

  cfHtmlRespFunction = new cf.Function(this, "HTMLRespFunction", {
    code: cf.FunctionCode.fromFile({
      filePath: path.join(
        __dirname,
        "./cf-functions/prevent-html-caching.js"
      ),
    }),
  });

  this.cfOrigin = new origins.S3Origin(this.publicAssetsS3Bucket);

  this.cfDistribution = new cf.Distribution(this, "CFDistribution", {
    defaultBehavior: {
      origin: this.cfDistribution,
      functionAssociations: [
        {
          function: this.cfPathRedirFunction,
          eventType: cf.FunctionEventType.VIEWER_REQUEST,
        },
        {
          function: this.cfHtmlRespFunction,
          eventType: cf.FunctionEventType.VIEWER_RESPONSE,
        },
      ],
    }
  });
}
{% endhlcode %}

And that is it. Run `cdk synth` and `cdk deploy` to deploy or update your cloudfront setup.
