---
date: 2016-11-26
title: Reducing BEM boilerplate through HAML extensions
is_outdated: true
exceprt: A hack which makes the HAML parser BEM aware and helps reduce some of the repetitive boilerplate associated with specifying BEM compliant class names in templates.
permalink: 2016/11/26/reducing-bem-boilerplate-through-haml-extensions.html
---

[BEM](http://getbem.com/introduction/) is a nice pattern with the primary caveat being having to repetitively specify long class name prefixes in html.

In Sass this problem is significantly alleviated because the parent operator `&` allows for extending of parent class name:

```scss
    .Button {
      &__label {
        &--primary {
          font-weight: bold
        }
      }
      &__icon {
        opacity: 0.5;
      }
    }
```

compiles to:

```css
    .Button__label--primary {
      font-weight: bold;
    }
    .Button__icon {
      opacity: 0.5;
    }
```

But usage in HTML is quite verbose:

```html
    <label class="Button__label Button__label--primary">
    </label>
```

Fortunately, if we are using [HAML](http://haml.info/), then we can extend the HAML parser to reduce some of this verbosity. HAML has a method `Haml::Parser.parse_class_and_id` to expand expressions like `.hello.world#some-id`. We can monkey-patch this method to make it bem aware.

```ruby
    Haml::Parser.class_eval do
      class << self
    
        CLASS_KEY = 'class'.freeze
        ID_KEY = 'id'.freeze
    
        def parse_class_and_id(list)
          attributes = {}
          return attributes if list.empty?
    
          list.scan(/([#.])([-:_a-zA-Z0-9]+)/) do |type, property|
            case type
            when '.'
              if attributes[CLASS_KEY]
                attributes[CLASS_KEY] += " "
              else
                attributes[CLASS_KEY] = ""
              end
              if match = property.match(/^bem:(.*)$/)
                property = expand_bem_class match[1]
              end
              attributes[CLASS_KEY] += property
            when '#'
              attributes[ID_KEY] = property
            end
          end
          attributes
        end
    
        def expand_bem_class(property)
          convert_to_classes(parse_bem_shorthand(property)).join(" ")
        end
    
        def parse_bem_shorthand(property)
          breakdown = [{}]
          previous_char = nil
          current_part = :block
          property.each_char do |char|
            breakdown.last[current_part] ||= ''
            if char == '_'
              if previous_char == '_'
                previous_char = nil
                unless current_part == :block
                  breakdown.push(block: breakdown.last[:block])
                end
                current_part = :element
              else
                previous_char = char
              end
            elsif char == '-'
              if previous_char == '-'
                previous_char = nil
                unless current_part == :block || current_part == :element
                  breakdown.push(
                    block: breakdown.last[:block],
                    element: breakdown.last[:element]
                  )
                end
                current_part = :modifier
              else
                previous_char = char
              end
            else
              if previous_char == '_' || previous_char == '-'
                breakdown.last[current_part] += previous_char
              end
              breakdown.last[current_part] += char
            end
          end
          breakdown
        end
    
        def convert_to_classes(bem_breakdown)
          classes = []
          bem_breakdown.each do |item|
            current_class = ''
            if item[:block].blank?
              raise "BEM Block missing"
            else
              current_class += item[:block]
            end
            unless item[:element].blank?
              current_class += "__#{item[:element]}"
            end
            classes.push(current_class)
            unless item[:modifier].blank?
              current_class += "--#{item[:modifier]}"
              classes.push(current_class)
            end
          end
          classes.uniq
        end
    
      end
    
    end
```

Now classes prefixed with `bem:` will receive special treatment:

```haml
    .bem:Header__row--secondary--dark
      %a Hello
```

will compile to:

```html
    <div class="Header__row Header__row--secondary Header__row--dark">
    </div>
```

Note that we were able to chain multiple modifiers in single expression. We can also use multiple elements in single expression:

```haml
.bem:Header__row--secondary--dark__bar--clear
    %a Hello
```

will compile to:

```html
<div class="Header__row Header__row--secondary Header__row--dark Header__bar Header__bar--clear">
</div>
```

Of course this works with arbitrary selectors:

```haml
%header.bem:Header__row--secondary--dark
    %a Hello
```

will compile to:

```html
<header class="Header__row Header__row--secondary Header__row--dark">
</header>
```

What about cases when we want to use ruby helpers ? We can define two helper methods that expose this functionality:

```ruby
    def expand_bem_class(name)
      Haml::Parser.expand_bem_class(name)
    end
    
    def expand_bem_classes(name)
      name.split(".").map{|name| expand_bem_class name }.join(" ")
    end
```

Of course, the usual caveats of tinkering with internals of vendor libraries apply. If tommorrow HAML changes the compiler API, then the monkey patch would have to updated to accomodate for that.