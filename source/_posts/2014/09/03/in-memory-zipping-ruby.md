---
date: 2014-09-03
permalink: 2014/09/03/in-memory-zipping-ruby.html
layout: post
title: "In-Memory Zipping in Ruby"
description: ""
categories:
tags: [Ruby]
is_outdated: true

---

[Rubyzip](https://github.com/rubyzip/rubyzip) is pretty much the defacto solution for manipulating zip files in ruby. However an underdocumented feature of this library is that it allows for creating zip files in memory ie. without actually writing anything to a file.

There are many situations when this can come in handy. For example in a Web application it may be faster to zip a small number of files on the fly and deliver it to client without writing to disc. This is especially handy in cloud environments where direct disc access is prohibited.

This can be accomplished as follows:

{% codeblock lang:ruby %}
file_stream = Zip::ZipOutputStream.write_buffer do |zip|
  zip.put_next_entry "hello.txt"
  zip.print "Hello World"
end
{% endcodeblock%}

The above creates a zip file with a single file hello.txt containing the text "Hello World"

Creating directory structures is just as easy:

{% codeblock lang:ruby %}
file_stream = Zip::ZipOutputStream.write_buffer do |zip|
  zip.put_next_entry "dir1/hello.txt"
  zip.print "Hello"
  zip.put_next_entry "dir2/hello.txt"
  zip.print "World"
end
{% endcodeblock%}

Finally, before we can read from the stream we will have to rewind it first. As an illustrative example the following shows a typical Rails controller that renders a zipped file to client.

{% codeblock lang:ruby %}
class SomeController < ApplicationController
  def some_action
    file_stream = Zip::ZipOutputStream.write_buffer do |zip|
      zip.put_next_entry "dir1/hello.txt"
      zip.print "Hello"
      zip.put_next_entry "dir2/hello.txt"
      zip.print "World"
    end
    file_stream.rewind
    respond_to do |format|
      format.zip do
        send_data file_stream.read, filename: "zip_file.zip"
      end
    end
  end
end
{% endcodeblock%}

A user visiting this action will be downloading a file named zip_file.zip containing two files in their respective directories.

For `format.zip` to be available we will have to register `application/zip` mimetype. Add the following to an initializer:

{% codeblock lang:ruby %}
Mime::Type.register "application/zip", :zip
{% endcodeblock%}

This concludes this small article. Please feel free to leave your suggestions in the comments below.
