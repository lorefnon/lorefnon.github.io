---
date: 2014-10-12
permalink: 2014/10/12/decrypting-an-obfuscated-font-with-ocr.html
layout: post
title: "Decrypting an obfuscated font with OCR"
tags: [Ruby, OCR]
is_outdated: true

---

I recently came across [this site](the site http://protext.herokuapp.com/) which demostrates a strategy for copy protection using an obfuscated font. So basically if you copy the text in the header you will realize that text copied is not exactly what is visible on the screen. The text is presented through a font that maps the characters to glyphs of a different character and hence though the output is human readable the underlying text is not. This is presented as a means towards protecting the site from crawlers and scrapers. In the post below I intend to demonstrate that this is not as full-proof as non-technical folks would be led to believe.

<img src="/images/protext_site.png" style="border: 1px solid silver;"/>

The Achilles heel of such strategies is that the unecrypted text is visible to the user. So a decent [OCR](http://en.wikipedia.org/wiki/Optical_character_recognition) will be able to parse the output and generate the text to reasonable accuracy. So though this technique certainly presents hinderences to a scraper it is not a full proof solution. Through simple code snippets we see below how this can be accomplished in ruby.

We can directly get the screenshot of the entire site using a tool like phantomJS and pass it on to OCR but the approach below is much more accurate.

First of all download the font used for the text. The path should be clearly visible in the source of the site and can be scraped using conventional text parsing through regular expressions.

<img src="/images/protext_css_source.png"/>

Alternatively it can be manually downloaded through devtools:

<img src="/images/protext_devtools_font.png"/>

Now we need two gems:

- [Tesseract-OCR](https://www.ruby-toolbox.com/projects/tesseract-ocr) - Ruby bindings for Tesseract OCR
- [Magic Title](https://www.ruby-toolbox.com/projects/magick_title) - to convert the text to image using a specific font.

Quoting the [Tesseract OCR Website](http://code.google.com/p/tesseract-ocr/):

> Tesseract is probably the most accurate open source OCR engine available. Combined with the Leptonica Image Processing Library it can read a wide variety of image formats and convert them to text in over 60 languages. It was one of the top 3 engines in the 1995 UNLV Accuracy test. Between 1995 and 2006 it had little work done on it, but since then it has been improved extensively by Google. It is released under the Apache License 2.0.

Installing Tesseract on OS X is as simple as `brew install tesseract` and it is also available through several linux package managers.

The ruby gems can be installed by adding the following to your Gemfile:

    gem 'magick_title', '>= 0.2.0'
    gem 'tesseract-ocr'

Now in irb (or a ruby script) you can do:

{% codeblock lang:ruby %}
require 'magick_title'
MagickTitle.options[:font] = "font_dfcb813d6c003fb3e2fca9f5295e9f58.ttf"  # Font downloaded from the site
MagickTitle.options[:font_path] =  Proc.new{ '/tmp' }  # Directory where the font resides on our system
MagickTitle.options[:destination] =  Proc.new{ MagicTitle.root } # Defaults to current directory
{% endcodeblock%}

Now let us fetch the string from the site header. For the sake of keeping the example minimal we omit the actual scraping code here:

    str =  "1zb SN358 y6JBl HJL 7Nagq JRb6 kzb n2vP 9JV. F + h = t."

`MagickTitle.say(str)` will give us an image containing the text in exactly the same form as is visible to end user.

Now we pass the image to Tesseract engine:

{% codeblock lang:ruby %}
e = Tesseract::Engine.new {|e|
    e.language  = :eng
    e.blacklist = '|'
}
{% endcodeblock%}

We can get the string using:

    > e.text_for("./#{MagickTitle.say(str).filename}")
    => "The quick brown fox jumps over\nthe lazy dog 1 2 3\n\n"

As you can see that result is not perfect but quite accurate.

To further improve the performance of the solution we can create an image of every character through MagickTitle and pass it to Tesseract to generate a character by character map. Now large chunks of text can be translated using this map much more efficiently.
