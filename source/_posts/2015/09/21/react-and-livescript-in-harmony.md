---
date: 2015-09-21
permalink: 2015/09/21/react-and-livescript-in-harmony.html
layout: post
title: React and Livescript in harmony
tags: [Javascript, React, Functional Programming]
is_outdated: true

---

# Overview

[Livescript](http://livescript.net/) is a programming language that compiles to readable javascript (similar to coffeescript) and provides language level facilities to [encourage](http://livescript.net/#inspiration) functional programming. [React.js](https://facebook.github.io/react/) is a user interface library from [facebook](https://facebook.com) that uses [intelligent heuristics](http://calendar.perfplanet.com/2013/diff/) for efficient DOM updates, simplifying the process of building data driven applications. This post outlines how the two can play well together, and tries to demostrate how livescript allows us write much more compact and succinct code. Basic familiarity with both of them is assumed.

To begin with let us see what a basic component looks like:

```html
<body>
  <div id='application-container'></div>
</body>
```

<br>

```livescript
ContactList = React.create-class do
  render: ->
    React.create-element \ul, null, @props.contacts.map (contact)->
      React.create-element \li, null, contact.name

el = React.create-element ContactList, contacts: [
  * name: 'Harry Potter'
  * name: 'Albus Dumbledore'
]

React.render el, document.get-element-by-id \application-container
```

<img src="/images/Screen Shot 2015-09-21 at 12.42.18 pm.png">

This is very similar to what we would have written if we were using vanilla javascript. The only primary advantages are indentation based nesting, elimination of a lot of superfluous syntax - braces and parenthesis and implicit returns. However we can do much better than this.

Because Livescript was forked from Coffeescript, it inherits Coffeescript's class syntax which we can use to extend `React.Component`. However the benefits of doing so are pretty-much marginal.

```livescript
class ContactList extends React.Component

  render: ->
    React.create-element \ul, null, @props.contacts.map (contact)->
      React.create-element \li, null, contact.name
```

One thing that we may notice is that the above code does not use [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html). While yes, it is [possible](https://github.com/facebook/react/issues/47#issuecomment-18877423) to use JSX with livescript using backticks to escape xml constructs and then passing the generated js to babel, it is a hack we better forgo. As we will see soon, livescript native constructs allow for much more succinct expressions than the xml boilerplate that comes JSX.

Livescript's feature that almost everything is a expression is particularly helpful when we have conditional logic in our dom generation code.

```livescript
element = React~create-element

ContactList = React.create-class do

  render: ->
    element \ul, null, @props.contacts.map (contact)->
      element \li, null,
        if contact.email
          element \a, href: "mailto:#{contact.email}", contact.name
        else
          contact.name

el = element ContactList, contacts: [
  * name: 'Harry Potter'
  * name: 'Albus Dumbledore'
    email: 'albus@hogwarts.magic'
]

React.render el, document.get-element-by-id \application-container
```

<img src="/images/Screen Shot 2015-09-21 at 12.42.05 pm.png">

When the render function becomes complex, it is often more readable to use livescript's pipe operator to chain the operations. This is particularly handy in conjugation with utility libraries geared towards functional programming - the example below uses [Ramda](http://ramdajs.com/). Other alternatives include [underscore](http://underscorejs.org/), [lodash](https://lodash.com/), [prelude.ls](http://www.preludels.com/) etc.

```livescript
element = React~create-element

ContactList = React.create-class do

  render-avatar: (contact)->
    if contact.avatar
    then element \img, src: contact.avatar, height: 100, width: 100
    else element \span, null, 'N/A'

  render-label: (contact)->
    if contact.email
    then element \a, href: "mailto:#{contact.email}", contact.name
    else element \span, null, contact.name

  render-contact-row: (contact)->
    element \tr, key: contact.id, [
      element \td, null, @render-avatar contact
      element \td, null, @render-label contact
    ]

  render-head: ->
    element \thead, null, [
      element \tr, null, [
        element \th, null, 'Avatar'
        element \th, null, 'Name'
      ]
    ]

  render: ->
    @props.contacts
    |> R.map @~render-contact-row
    |> ~> element \tbody, null, it
    |> ~> element \table, class-name: \contacts , [ @render-head!, it ]

el = element ContactList, contacts: [
  * id: 1
    name: 'Harry Potter'
    avatar: 'http://cdn.playbuzz.com/cdn/8de88741-d729-4319-aa46-e8a544a20439/f7cade9d-8daf-42b3-8839-3e0e1f3db283.jpeg'
  * id: 2,
    name: 'Albus Dumbledore'
    email: 'albus@hogwarts.magic'
]


React.render el, document.get-element-by-id \application-container
```

<img src="/images/Screen Shot 2015-09-21 at 2.15.15 pm.png">

It may be tempting to further shorten the functions taking advantage of livescript's default argument `it`:

```livescript
  render-avatar: ->
    if it.avatar
    then element \img, src: it.avatar, height: 100, width: 100
    else element \span, null, 'N/A'

  render-label: ->
    if it.email
    then element \a, href: "mailto:#{it.email}", it.name
    else element \span, null, it.name

  render-contact-row: ->
    element \tr, key: it.id, [
      element \td, null, @render-avatar it
      element \td, null, @render-label it
    ]
```

But I strongly recommend against doing that, because having the arguments specified in the function signature upfront enhances readability.

Also note that the top down construction flow composition can also be realized in javascript using Ramda's `pipe` but livescript just makes it simpler by providing a language level operator.

For simpler components (which are just responsible for presenting something passed as props, and do not need lifecycle methods etc.) it may be useful to define a micro-component builder:

```livescript
micro-component = (render)-> React.create-factory React.create-class { render }
```

Once we have that, it makes it a lot more easier for us to follow React's recommendation of having lightweight modular components which can be easily composed:

```livescript
ContactAvatar = micro-component ->
  { contact } = @props
  if contact.avatar
  then element \img, src: contact.avatar, height: 100, width: 100
  else element \span, null, 'N/A'

ContactLabel = micro-component ->
  { contact } = @props
  if contact.email
  then element \a, href: "mailto:#{contact.email}", contact.name
  else element \span, null, contact.name

ContactListRow = micro-component ->
  element \tr, key: @props.contact.id, [
    element \td, null, ContactAvatar @props
    element \td, null, ContactLabel @props
  ]

ContactList = micro-component ->
  element \table, class-name: \contacts, [
    element \thead, null, [
      element \tr, null, [
        element \th, null, 'Avatar'
        element \th, null, 'Name'
      ]
    ]
    element \tbody, null, @props.contacts.map -> ContactListRow do
      contact: it
      key: it.id
  ]

el = ContactList contacts: [
  * id: 1
    name: 'Harry Potter'
    avatar: 'http://cdn.playbuzz.com/cdn/8de88741-d729-4319-aa46-e8a544a20439/f7cade9d-8daf-42b3-8839-3e0e1f3db283.jpeg'
  * id: 2,
    name: 'Albus Dumbledore'
    email: 'albus@hogwarts.magic'
]
React.render el, document.get-element-by-id \application-container

```

Libraries like [`react-hyperscript`](https://github.com/mlmorg/react-hyperscript) may be used to further reduce the dom construction boilerplate :


```livescript

require! { react-hyperscript: h, react: React }

ContactAvatar = micro-component ->
  { contact } = @props
  if contact.avatar
  then h \img, src: contact.avatar, height: 100, width: 100
  else h \span, 'N/A'

ContactLabel = micro-component ->
  { contact } = @props
  if contact.email
  then h \a, href: "mailto:#{contact.email}", contact.name
  else h \span, contact.name

ContactListRow = micro-component ->
  h \tr, key: @props.contact.id, [
    h \td, ContactAvatar @props
    h \td, ContactLabel @props
  ]

ContactList = micro-component ->
  h \table.contacts, [
    h \thead, [
      h \tr, [
        h \th, 'Avatar'
        h \th, 'Name'
      ]
    ]
    h \tbody, @props.contacts.map -> ContactListRow do
      contact: it
      key: it.id
  ]

el = ContactList contacts: [
  * id: 1
    name: 'Harry Potter'
    avatar: 'http://cdn.playbuzz.com/cdn/8de88741-d729-4319-aa46-e8a544a20439/f7cade9d-8daf-42b3-8839-3e0e1f3db283.jpeg'
  * id: 2,
    name: 'Albus Dumbledore'
    email: 'albus@hogwarts.magic'
]
React.render el, document.get-element-by-id \application-container

```

Apart from getting rid of null for attribute hashes, hyperscript is particularly useful for shorter syntax for class names and ids. Also it insulates our codebase against changes in the DOM builder API, which have happened in past.
