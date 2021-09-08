---
title: Exporing HAR (HTTP Archive) logs with Jq
date: 2020-11-27
tags: ["HAR", "Jq"]
---

[Jq](https://stedolan.github.io/jq/) is a versatile utility for quickly exploring/filtering/transforming JSON on the command line. It is similar to grep/sed/awk utilities in that it is standalone, portable and composable. If you are not familiar with basics of jq yet, I recommend skimming through the well written [official manual](https://stedolan.github.io/jq/manual). 

The HTTP Archive format, or HAR, is a JSON-formatted archive file format for logging of a web browser's interaction with a site (Source: [Wikipedia](https://en.wikipedia.org/wiki/HAR_(file_format)). Both Chrome and Firefox provide a [convenient option](https://knowledge.vidyard.com/hc/en-us/articles/360009996213-Download-a-HAR-file-from-your-browser) to download information about all the http requests when visiting a particular site as a HAR file which makes it a very useful format in practice. 

One simple way to analyze HAR files is to import them back into dev-tools and explore them manually. But for many common scenarios it is more efficient to analyze these files through CLI using a tool like jq to zero into the exact information we need.

The rest of this post is basically a cheatsheet of one-liners for using jq to analyze HAR logs. It mostly covers scenarios that I have found useful in day-to-day exploration as a web developer. 

For the examples here I'll be using the HAR exported from twitter.com (I am [@lorefnon](https://twitter.com/lorefnon) on twitter as well BTW).

You may or may not have familiar with the structure of HAR file. Let's see how we can explore some JSON of unfamiliar structure. 

For starters, jq can be used a simple JSON formatter or syntax highligher. 

So something like this gives us properly formatted syntax highlighted json: 

```sh
$ jq '.' twitter.com.har
```

Or we can feed in json through STDIN which is quite useful with curl etc.: 

```sh
$ cat twitter.com.har | jq '.'
```

This essentially applies an identity filter (`.`) to input (incoming stream) that returns it unchanged, and lets jq pretty-prints the output. 

However, HAR files are often fairly large, and thus this is unweildy when you have several MBs of content. 

So let us just find out the top level keys to begin with: 

```sh
$ jq '. | keys' twitter.com.har

[
  "log"
]
```

Pipe (|) similar to unix pipes is jq's syntax for forward application. In this case the output of identity filter to the `keys` builtin function which returns us an array of keys in the object.

And now we can drill down from there and explore the subtree: 

```sh
$ jq '.log | keys' twitter.com.har

[
  "creator",
  "entries",
  "pages",
  "version"
]
```

```sh
$ jq '.log.pages[0] | keys' twitter.com.har

[
  "id",
  "pageTimings",
  "startedDateTime",
  "title"
]
```

We will not go into an exploration of the complete format. Besides interactive exploration through jq it may also be useful to consult the [HAR specification](http://www.softwareishard.com/blog/har-12-spec/) on how this file is structured. 

## Enumerating accessed resources

As part of our exploration we'd usually want to narrow down our selection by the HTTP resources which were accessed. 

We can find all the urls that were accessed as a part of this browsing session: 

```sh
jq '.log.entries[] | .request.url' twitter.com.har

"https://twitter.com/home"
"https://abs.twimg.com/responsive-web/client-web/polyfills.18a65025.js"
"https://abs.twimg.com/responsive-web/client-web/vendors~main.d0d6d775.js"
"https://abs.twimg.com/responsive-web/client-web/i18n/en.96bbaf75.js"
"https://abs.twimg.com/responsive-web/client-web/main.a3119725.js"
"https://abs.twimg.com/responsive-web/client-web/ondemand.Dropdown.fa0fef85.js"
"https://abs.twimg.com/responsive-web/client-web/sharedCore.c5e0a615.js"
"https://abs.twimg.com/responsive-web/client-web/ondemand.Dropdown.fa0fef85.js"
"https://abs.twimg.com/favicons/twitter.ico"
...
```

We would often be interested in a subset of these resources. We can filter by HTTP method: 

```sh
jq '.log.entries[] | select(.request.method == "GET") | .request.url' twitter.com.har
```

(Note use of select function to select by a predicate)

Or by extension: 

```sh
jq '.log.entries[] | select(.request.url | test(".js$")) | .request.url' twitter.com.har
```

(Note use of `test` to create a predicate based on regular expression)

A better alternative (for well behaved services anyways) for filtering with type of content is to filter by mime type: 

```sh
$ jq '.log.entries[] | select(.response.content.mimeType == "text/html") | .request.url' twitter.com.har

"https://twitter.com/home"

$ jq '.log.entries[] | select(.response.content.mimeType == "application/javascript") | .request.url' twitter.com.har

"https://abs.twimg.com/responsive-web/client-web/polyfills.18a65025.js"
"https://abs.twimg.com/responsive-web/client-web/vendors~main.d0d6d775.js"
"https://abs.twimg.com/responsive-web/client-web/i18n/en.96bbaf75.js"
"https://abs.twimg.com/responsive-web/client-web/main.a3119725.js"
"https://abs.twimg.com/responsive-web/client-web/ondemand.Dropdown.fa0fef85.js"
..
```

If we want to get the first item, we can collect all the results into an array and apply the first filter on it

```sh
$ jq '[.log.entries[] | select(.request.url | test("home\\.json"))] | first' twitter.com.har  | less
``` 

(Note the use of `[...]` to collect the resultset into an array so that we can apply functions (in this case `first`) that operate on arrays). 

This gives us the first request to home.json

## Exploring response

jq is useful primarily for json. 

So for services returning json we can just use jq to further explore the server response as well. 

```sh
$ jq '[.log.entries[] | select(.request.url | test("home\\.json"))] | first | .response.content.text' twitter.com.har
```

However this gives us a string containing json, so before can apply further filters we'll have to unwrap this content. 

```sh
$ jq '[.log.entries[] | select(.request.url | test("home\\.json"))] | first | .response.content.text | fromjson | .' twitter.com.har
```

(Note the use of `fromjson` to extract the JSON content embedded in the string).

But for other formats we can forward the result of jq to something else that deal with that format. 

So for instance, if you have [bat](https://github.com/sharkdp/bat) installed, we can do something like this to get syntax highlighted HTML content. 

```sh
$ jq -r '[.log.entries[] | select(.response.content.mimeType == "text/html") ] | first | .response.content.text | @base64d' twitter.com.har  | bat
```

Remember our mention above about jq being composable ? jq fits in well with unix philosophy - doing one thing well and making it easy to use with other tools.

Before we go further, a couple of things to note here: 

In case of twitter, the response from the server is base64 encoded. So we had to use `@base64d` to decode it. Also we had to pass the `-r` flag to jq to remove the quotes around the output so that the output is proper HTML. 

We can't however use the `@base64d` when the input is not utf8. But fortunately we have a base64 cli utility available for OS X (pre-installed) and most major linux variants which works well with arbitrary content including binary data. 

So we can save some images fetched during the HTTP session to a image files which can then be viewed through any image viewer:

```sh
$ jq -r '[ .log.entries[] | select(.response.content.mimeType == "image/png") ] | first | .response.content.text' twitter.com.har | base64 --decode > file.png
```

You can now, for instance, use something like [odiff](https://github.com/dmtrKovalenko/odiff) to compare images from multiple HAR archives and see if they have changed. 

Also, if you are using [iterm2](https://iterm2.com/) and have [imgcat](https://iterm2.com/documentation-images.html) installed, we can display the images right in the terminal: 

```sh
$ jq -r '[ .log.entries[] | select(.response.content.mimeType == "image/png") ] | first | .response.content.text' twitter.com.har | base64 --decode | imgcat
```


![image.png](/images/Uw4uhn_mK.png)

## Summarizing stats

If you are analyzing HAR files you probably care about size of the paylodas. 

Let's sort the responses by download size and take the top 10: 

```sh
jq -r '[.log.entries[]] | sort_by(.response.content.size) | reverse | .[0:10] | map([.request.url, .response.content.size])' twitter.com.har
```

Couple of things here: 

- Note the use of `sort_by` operator to sort results
- This function operates on arrays, so we constructed one using `[.log.entries[]]` similar to before.
- We use `reverse` to reverse the array and `.[0:10]` slice operator to take a slice of first 10 results
- Finally we are not interested in the whole data - just the size and url so we use `map` to map over the results and extract exactly what we needed.

We can also generate a CSV from this resultset which you can then preview in your favorite spreadsheet software: 

```sh
jq -r '[.log.entries[]] | sort_by(.response.content.size) | reverse | .[0:10] | map([.request.url, .response.content.size]) | ["url", "size"],  .[] | @csv' twitter.com.har
```

Personally I prefer using [miller](https://github.com/johnkerl/miller) for exploring tabular data but that is a topic for another post.  

One thing to note here is that in all of the above examples, we didn't (need to) use any variables, loops etc. We just applied functional transformations over a stream of json - resulting in succinct and easy to grok code. 

This is one of the things that makes jq such an elegant choice for this kind of work. We do have functions, variables, foreach etc. but for most simple use cases like the ones above we don't need them. 

This brings us to end of our post. Hope this serves as a quick reference for common one-liners when dealing with jq & har files and points you to the right direction for use-cases not covered above.
