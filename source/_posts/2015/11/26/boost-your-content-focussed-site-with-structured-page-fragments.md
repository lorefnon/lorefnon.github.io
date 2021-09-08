---
date: 2015-11-26
permalink: 2015/11/26/boost-your-content-focussed-site-with-structured-page-fragments.html
layout: post
title: "Boost your content focussed site with Structured Page Fragments"
description: ""
category:
tags: [Rails, SPF, Javascript]
is_outdated: true

---

## The context

SPF.js a lightweight javascript library to incorporate dynamic page updates that dramatically reduces perceived page latency. Quoting from the Repo Homepage:

> Using progressive enhancement and HTML5, SPF integrates with your site to enable a faster, more fluid user experience by updating just the sections of the page that change during navigation, not the whole page. SPF provides a response format for sending document fragments, a robust system for script and style management, an in-memory cache, on-the-fly processing, and more.

While for complex dynamic sites which have a significant amount of client side logic, I still recommend adopting a client side javascript framework, but for content focussed sites, a nifty utility like SPF.js can be very useful.

<!-- more -->

## Why not good old js.erb templates ?

While Rails allows us to render server generated javascript templates, using them to generate dynamic page updates is a bit cumbersome for most scenarios. Especially you have to handle page url updates manually, scroll back the pages manually etc. None of them are very complex concerns, but having a library deal with such cross cutting concerns is much more elegant IMHO.

## What about turbolinks ?

While yes, turbolinks does enjoy being a part of the default Rails stack, but frankly, it has always seemed like a half baked product. While turbolinks does improve the experience over full page reloads, behind the scenes it still loads the full page content.

SPF.js allows you to just fetch the parts of the page that really need updating. The GIF below, also taken from the official site, explains this much better:

<table style="margin: auto">
  <thead>
    <tr>
      <th> Full page re-rerendering </th>
      <th> Partial section replacement with SPF.js </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td> <img src="/images/animation-static-340x178.gif"></td>
      <td> <img src="/images/animation-dynamic-340x178.gif"></td>
    </tr>
  </tbody>
</table>

## But doesn't the latest version of turbolinks include support for partial page replacement ?

Yes, but there is a [lack of clarity](https://github.com/rails/turbolinks/issues/628) over when (and if) that feature will be officially released.

In a nutshell, the version of turbolinks that is scheduled to ship with Rails 5, significantly diverges from what has hitherto been considered as the [official turbolinks repo](https://github.com/rails/turbolinks/), and will probably not contain, among other features, support for partial page replacements. While the future is not set in stone, and as DHH has [put it](https://github.com/rails/turbolinks/issues/628#issuecomment-157376926):

> But, hey, it's just code. If the current state of this repo serves your
needs, you don't need any official blessing from anyone to use it. You can
use it as-is, you can fork, you can do whatever you want. MIT baby!

While I appreciate the freedom associated with open source licenses, I would rather bet on a well supported library that caters to the exact same use case and which is already being used in production in a wildly popular site - Youtube.

## Integrating SPF.js with Rails

The rest of the post outlines the steps required to integrate SPF.js with a rails application. The code for this tutorial is available in [Github](https://github.com/lorefnon/rails-spfjs-demo).

We will create a dummy blog application. But hey, since this is just a demo application, we can get away with a little [Forgery](https://github.com/sevenwire/forgery):

```ruby
class PostsController < ApplicationController

  def index
    @page = params[:page].to_i
    @num_pages = 1000
    @posts = 10.times.map { fake_post_summary }
  end

  def show
    @post = fake_post
  end

  private

  def fake_post
    OpenStruct.new fake_post_summary.to_h.merge!(
      id: params[:id],
      body: LoremIpsum.random(paragraphs: rand(20))
    )
  end

  def fake_post_summary
    OpenStruct.new(
      id: rand(1000),
      title: LoremIpsum.lorem_ipsum(words: rand(20)),
      summary: LoremIpsum.random(paragraphs: 1),
      author: OpenStruct.new(
        user_name: Forgery('internet').user_name,
        email: Forgery('internet').email_address
      )
    )
  end

end

```

So now that we have our dummy posts in place, we just need to show them:

```erb
<!-- posts/index.html.erb -->
<div class="blog-container">

  <h1 class="blog-title title"> Lorefnon's Awesome blog </h1>
  <h2 class="page-title title"> Posts </h2>

  <div class="posts-container">
    <%= render 'posts/posts' %>
  </div>

</div>
```

<br/>

```erb
<!-- posts/_posts.html.erb -->
<ul class="posts-list">

  <div class="posts">
    <% @posts.each do |post| %>
    <%= render 'posts/summary', post: post %>
    <% end %>
  </div>

</ul>

<div class="navigation-links">
  <%= render 'posts/navigation_links' %>
</div>
```

<br/>

```erb
<!-- posts/_summary.html.erb -->
<li data-post-id="<%= post.id %>">
  <h3 class="title post-title"> <%= link_to post.title, post_path(id: post.id) %> </h3>
  <p> <%= post.summary %> </p>
</li>
```

<br/>

```erb
<!-- posts/_navigation_links.html.erb -->
<% if @page > 0 %>
   <%= link_to 'Previous Page', posts_path(page: @page-1) %>
<% end %>
<% if @page < @num_pages -1 %>
   <%= link_to 'Next Page', posts_path(page: @page+1) %>
<% end %>
```

<br/>

```erb
<!-- posts/show.html.erb -->
<div class="blog-container">
  <h2 class="post-title title"> <%= link_to @post.title, post_path(id: @post.id) %> </h2>
  <div class="post-body"> <%= @post.body %> </div>
</div>
```

The above templates have nothing particularly characteristic. If you would have written them yourself, I guess you would have implemented something very similar. I have presented above to particularly highlight that the way you structure your views does not need to be drastically altered to use SPF.js. Hence it is easy to take your existing sites and start using SPF.js.

Our dummy blog looks something like this now:

<img src="/images/2015-11-26/blog_index.png">

## Including SPF

Next step for us is to include SPF.js in the page. For that we will just add the cdn link to our layout. Other methods of including are available [here](https://github.com/youtube/spfjs#download).

After this inclusion our template might look something like this:

```erb
<!DOCTYPE html>

<html>

  <head>
    <title>Rails Spfjs Demo</title>
    <%= javascript_include_tag '//ajax.googleapis.com/ajax/libs/spf/2.3.0/spf.js' %>
    <%= stylesheet_link_tag    'application', media: 'all' %>
    <%= javascript_include_tag 'application' %>
    <%= csrf_meta_tags %>
  </head>

  <body>

  <%= yield %>

  <script>
    spf.init();
  </script>

  </body>
</html>
```

## Making navigation links SPF aware

However just initializing SPF.js does not magically ajaxify all navigation links. In fact by so far SPF.js does not alter the navigation in any way. We need to explicitly enable SPFjs for links for which our server knows how to server partial content. For SPF to process a link, it should have the class 'spf-link'. Let us start with our navigation links:

```erb
<% if @page > 0 %>
   <%= link_to 'Previous Page', posts_path(page: @page-1), class: 'spf-link' %>
<% end %>
<% if @page < @num_pages -1 %>
   <%= link_to 'Next Page', posts_path(page: @page+1), class: 'spf-link' %>
<% end %>
```

One great feature of SPF.js is that it handles graceful degradation. So, since we haven't done anything on the server side to generate partial contents, SPF will try to make an ajax request to server (with the special query parameter spf=navigate) and once that response format does not match what SPF expects, it will allow a full page reload.

## Server side handling for SPF

Let us move on to server side handling:

As we have previously mentioned that SPF sends an ajax request using spf=navigate query parameter. We can detect that in our controller and send out a special response that only includes the parts of the page we need to update:

```ruby
class PostsController < ApplicationController

  def index
    @page = params[:page].to_i
    @num_pages = 1000
    @posts = 10.times.map { fake_post_summary }

    if params[:spf] == 'navigate'
      render 'posts/index.json'
    end
  end

...
```

Next we will have to designate the parts that can be dynamically replace using an id. In our modified `posts/_summary.html.erb` below, `spf-posts-container` serves that purpose:

```erb
<li data-post-id="<%= post.id %>">
  <h3 class="title post-title"> <%= link_to post.title, post_path(id: post.id) %> </h3>
  <p> <%= post.summary %> </p>
</li>
```


While SPF does not require DOM node IDs to begin with `spf-` prefix I think this is a good convention and makes the intent explict.

Finally here is our json template that contains the partial page update, in the format that SPF.js [can process](https://youtube.github.io/spfjs/documentation/responses/).

index.json.erb:

```erb
{
  "body": {
    "spf-posts-container": "<%= j render 'posts/posts' %>"
  }
}
```

While we are using a simple `json.erb` template, it should be noted that any generic approach that can generate json response in rails, works well. So if you are already using `rabl` or `jbuilder` in your APIs, you can continue using that.

Now when a navigation link is clicked, the json response is fetched via ajax and the page is dynamically updated - resulting in a much smoother user experience. Also note that browser url has been automatically updated and the page scrolls to the top. SPF tries to emulate the experience the experience of page change as much as possible to prevent uncanny surprises.

<img src="/images/2015-11-26/spf_response.png">

## (Optional) Leveraging rails magic for leaner controllers

While the above works, it is unweildy to handle the navigation link in each controller. We can alternatively make the `default_render` method that is used by rails to be SPF aware. The [default implementation](https://github.com/rails/rails/blob/7f18ea14c893cb5c9f04d4fda9661126758332b5/actionpack/lib/action_controller/metal/implicit_render.rb) looks like this:

```ruby
def default_render(*args)
  if template_exists?(action_name.to_s, _prefixes, variants: request.variant)
    render(*args)
  else
    if block_given?
      yield(*args)
    else
      logger.info "No template found for #{self.class.name}\##{action_name}, rendering head :no_content" if logger
      super
    end
  end
end
```

We can override this in our ApplicationController

```ruby
class ApplicationController < ActionController::Base

  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  def default_render(*args)
    if params[:spf] == 'navigate'
      render "#{controller_name}/spf_#{action_name}.json"
    else
      super
    end
  end

end
```

Now all we have to do is prefix the names of our SPF specific templates with `spf_` and we are done. Our `spf_index.json.erb` remains unchanged.

We can clean up the action and remove SPF specific code:

```ruby
class PostsController < ApplicationController

  def index
    @page = params[:page].to_i
    @num_pages = 1000
    @posts = 10.times.map { fake_post_summary }
  end

...
```

## Navigation hooks

While so far everything works pretty well, we may want to hook into navigation events for greater flexibility. This may be useful for sending events to analytics service or for highlighting specific parts of page. The latter is useful because in some cases when the part replaced is very small, user might not immediate notice a quick change in the page content.

For instance `spfdone` event is invoked after the asynchronous update has been applied to the page. We can attach handlers to this event just like any other event, and hook custom logic:

<img src="/images/2015-11-26/spfdone.png">

Let us highlight the listing of our posts using CSS 3 animations when loaded asynchronously:

```js
$(document).on('spfdone', function(event) {

  if (event.originalEvent.detail.response.body['spf-posts-container']) {
    $('#spf-posts-container').addClass('flash')

    setTimeout(function() {
      $('#spf-posts-container').removeClass('flash')
    }, 3000)

  }

});
```

<br/>

```css
.flash {
  -moz-animation: flash 1s ease-out;
  -moz-animation-iteration-count: 1;

  -webkit-animation: flash 1s ease-out;
  -webkit-animation-iteration-count: 1;

  -ms-animation: flash 1s ease-out;
  -ms-animation-iteration-count: 1;
}

@-webkit-keyframes flash {
    0% { background-color: none; }
    50% { background-color: #fbf8b2; }
    100% { background-color: none; }
}

@-moz-keyframes flash {
    0% { background-color: none; }
    50% { background-color: #fbf8b2; }
    100% { background-color: none; }
}

@-ms-keyframes flash {
    0% { background-color: none; }
    50% { background-color: #fbf8b2; }
    100% { background-color: none; }
}
```

Now you should see a subtle flash when page content has been replaced.

## Conclusion

This concludes our small post on SPF integration with Rails. SPF allows for a lot more customization options beyond what our small covers. In particular SPF allows us to inject new scripts and styles dynamically, sophisticated [cache management](https://youtube.github.io/spfjs/documentation/caching/) and [resource versioning](https://youtube.github.io/spfjs/documentation/versioning/) support, which are all very useful features.

The [official documentation](https://youtube.github.io/spfjs/documentation) is a great place to start exploring more.
