---
date: 2015-03-02
permalink: 2015/03/02/dealing-with-json-fields-in-active-admin.html
layout: post
title: "Dealing with JSON data in Active Admin"
tags: [Ruby, Rails, ActiveAdmin]
is_outdated: true

---

Many a times, depending on the requirements, it makes sense to store
unstructured json data in database fields. PostgreSQL recognizes this
requirement and provides a dedicated json field that automatically
handles JSON validation. As has been outlined in the
[RoR Guides](http://edgeguides.rubyonrails.org/active_record_postgresql.html)
, it is pretty simple to take advantage of this feature from Rails.
However if you also use [ActiveAdmin](https://github.com/activeadmin/activeadmin) to manage your admin interface,
you will quickly find out that library [Formtastic](https://github.com/justinfrench/formtastic) that ActiveAdmin
uses to manage its forms, leaves a lot to be desired when it comes to
JSON editing support.

In this post we outline a simple approach to improve JSON editing
support in ActiveAdmin using the excellent [JSON editor widget](https://github.com/josdejong/jsoneditor/)
by [Jos de Jong](https://github.com/josdejong). It is worth pointing
out that our implementation has very little to do with PostgreSQL
and may be used without modifications if you are storing JSON in say MySQL
text fields. Of course you will need to handle server side validation yourself in that case.

The source code for the post is available on [Github](https://github.com/lorefnon/activeadmin-jsoneditor-demo).

Let us have a simple product model with following schema:

{% codeblock lang:ruby %}
class CreateProducts < ActiveRecord::Migration
  def change
    create_table :products do |t|
      t.string :name
      t.text :description
      t.json :metadata
      t.timestamps
    end
  end
end
{% endcodeblock%}

You may expect providing admin support for this model will just be
a matter of adding a file `app/admin/product.rb`:

{% codeblock lang:ruby %}
ActiveAdmin.register Product do
  permit_params :name, :description, :metadata
end
{% endcodeblock%}

However the moment you try to create a new instance, you will be greeted
with an error message:

![Formtastic unknown input error](/images/formtastic_unknown_input.png)

So basically Formtastic has no input field pre-configured for json
field. A rudimentary workaround is fairly simple - We explicitly ask
it to use a textarea for metadata field

{% codeblock lang:ruby %}
ActiveAdmin.register Product do

  permit_params :name, :description, :metadata

  form do |f|
    f.inputs do
      f.input :name
      f.input :description
      f.input :metadata, as: :text
    end
    f.actions
  end

end
{% endcodeblock%}

This does the job:

![Form with explicitly specified textarea](/images/aa1.png)

But seriously, if you have to edit this json very frequently or manage
large json entries, a simple textarea is not an ideal solution. Plus
if you accidentally enter some invalid json, You will be provided with a
feedback only post submission:

![Error in JSON field](/images/aa2.png)
![JSON validation error](/images/aa3.png)

The [JSON editor widget](https://github.com/josdejong/jsoneditor/)
by [Jos de Jong](https://github.com/josdejong) provides a lot better json editing
interface. You can try it out [online](http://jsoneditoronline.org/).

If you like what you see, you will be pleased to find that the widget
is pretty easy to integrate right inside ActiveAdmin.

Let us first configure our form to add a class to the json field
so that we can handle json input fields in a generic fashion.

{% codeblock lang:ruby %}
ActiveAdmin.register Product do

  permit_params :name, :description, :metadata

  form do |f|
    f.inputs do
      f.input :name
      f.input :description
      f.input :metadata, as: :text, input_html: { class: 'jsoneditor-target' }
    end
    f.actions
  end

end
{% endcodeblock%}

Next we will need to download the [relevant files](http://jsoneditoronline.org/downloads/) and add to our vendor
directory. I have already changed the files to use sprockets urls, so you can
grab the files form the repo.

Next we modify the active_admin.js.coffee:

{% codeblock lang:coffeescript %}
#= require active_admin/base
#= require jsoneditor
#= require jsoneditor_activeadmin_integration
{% endcodeblock%}

Once we have the required files in place, integration is pretty simple -
`app/assets/javascripts/jsoneditor_activeadmin_integration`:

{% codeblock lang:coffeescript %}
$ ->

  $('.jsoneditor-target').each ->

    target = $ this

    container = $('<div class="jsoneditor-container">')
      .insertAfter target

    editor = new JSONEditor container[0],
      modes: ['code', 'form', 'text', 'tree', 'view']
      change: ->
        target.val editor.get()

    editor.set(
      try
        JSON.parse target.val()
    )

    target.hide()
{% endcodeblock%}

This simply hides the textarea for json field, and adds a json editor
widget. When the editor is updated, the hidden textarea is updated
with the new value - so our form continues to work just as expected,
without Formtastic having to be aware of the widget at all.

I had to explicitly override some of the conflicting styles from
ActiveAdmin which were messing up the Editor Widget css:

{% codeblock lang:scss %}
.jsoneditor-container, .jsoneditor-contextmenu {
    table {
        width: auto;
        margin: 0;
    }

    .jsoneditor {
        background: white;
    }

    button, button:hover, .menu button, .menu button:hover {
        background: none;
        text-shadow: none;
        box-shadow: none;
        border-radius: 0;
    }
}

.jsoneditor-container {
    margin-left: 20%;
    width: 80%;
}
{% endcodeblock%}

And we are pretty much done:
![Widget integrated with Active Admin](/images/aa4.png)

I realize that the default styling of the widget sticks out a bit against
 the default styling of ActiveAdmin page, but all that is needed to rectify is a few CSS
rules which I leave as an exercise for the reader.

As always, any feedback and suggestions are more than welcome.
