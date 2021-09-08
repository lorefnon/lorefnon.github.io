---
date: 2014-07-27
permalink: 2014/07/27/optimizing-sti-columns.html
layout: post
title: "Optimizing space taken by type column in Rails STI"
tags: [Ruby, Rails, ActiveRecord]
is_outdated: true

---

The [Single Table Inheritance](http://api.rubyonrails.org/classes/ActiveRecord/Base.html#label-Single+table+inheritance)
facility in Rails is quite awesome in that it is simple, minimal and easy to understand.
However that simplicity comes with a small price - the type column stores the full name of the relevant class as a string.
This becomes especially unweildy if you scope your models inside a module.

Let us illustrate this with an example:

Let us say, we have a database of institutions. For non profit and commercial institutions we have two subclasses of `Institution::Base` namely, `Institution::NonProfit`, `Institution::Commercial`.

{% codeblock lang:ruby %}
#app/models/institution.rb
module Institution
  def self.table_name_prefix
    'institution_'
  end
end

# app/models/institution/base.rb
class Institution::Base < ActiveRecord::Base
end

#app/models/institution/non_profit.rb
class Institution::NonProfit < Institution::Base
end

#app/models/institution/commercial.rb
class Institution::Commercial < Institution::Base
end
{% endcodeblock%}

We deliberately keep the schema simple:

{% codeblock lang:ruby %}
create_table "institution_bases", force: true do |t|
    t.string   "name"
    t.string   "type"
    t.datetime "created_at"
    t.datetime "updated_at"
 end
 {% endcodeblock%}

The subclasses simply reuse the table and Rails distinguishes between them using the type column. If we  try to store some sample entries, we would notice that the value stored in type field contains the fully namespaces class name: `Institution::NonProfit`, `Institution::Commercial` etc.

Since we know that our application will not store models from other namespace in this table, the extra space taken by the module name is wasteful. In fact storing the name in its entirety is wasteful. So this post highlights a simple approach to minimise the space taken by type column without sacrificing the ease of use of STI in rails.

It turns out we can override the methods Rails uses to convert the table name to class name and vice versa:

The relevant methods are `find_sti_class` which is responsible for the translating the value stored in the type column to the respective ActiveRecord model and `sti_name` which is responsible for retriving the value stored in type column given an ActiveRecord subclass.

So we override the default implementations to the following:

{% codeblock lang:ruby %}
class Institution::Base < ActiveRecord::Base

  ALLOWED_CLASSES = %w[Institution::NonProfit Institution::Commercial]

  class << self

    def find_sti_class type_name
      idx = type_name.to_i
      super if idx == 0
      ALLOWED_CLASSES[idx-1].constantize
    rescue NameError, TypeError
      super
    end

    def sti_name
      idx = ALLOWED_CLASSES.index(self.name)
      if idx.nil?
        super
      else
        idx + 1
      end
    end

  end

end
{% endcodeblock%}

Once we have done this the STI subsystem of ActiveRecord will the use the `ALLOWED_CLASSES` to infer the name Institution classes using the index stored in the database column.

What is particularly nice is that if have any existing data, we don't end up getting
any errors when trying to save or retrieve them since we delegate to default implementations. Although it would be a better option to write a migration to change the type column to integer.

The eagle eyed among us might have noticed we are offsetting the index in the `ALLOWED_CLASSES` index by 1. This is a basic precaution because calling `to_i` on a string that is not a numeric string returns `0` instead of raising an error. So delegating to default implementation incase of zero value allows us to retain legacy compatibility.

You might want to ask why the array ALLOWED_CLASS_NAMES is a string array rather than an actual array of classes. Having an array of classes leads to RecursiveDependency errors while autoloading when fetching the entries from databases.

While this is nice and good, this functionality is generic and doesn't really belong to the `Institution::Base` class. What if we need another module tomorrow which is unreleated but needs the same functionality?

So in the spirit of reusability and separation of concerns we create a `concern` for this:

{% codeblock lang:ruby %}
module OptimallyInheritable
  extend ActiveSupport::Concern

  module ClassMethods
    def support_sti_for cls_list
      @sti_cls_list = []
      @sti_cls_list += cls_list
    end

    def sti_cls_list
      @sti_cls_list
    end

    def find_sti_class type_name
      idx = type_name.to_i
      super if idx == 0
      sti_cls_list[type_name.to_i-1].constantize
    rescue NameError, TypeError
      super
    end

    def sti_name
      idx = sti_cls_list.index(self.name)
      if idx.nil?
        super
      else
        idx + 1
      end
    end

  end
end
{% endcodeblock%}

And our `Institution::Base` class just reduces to:

{% codeblock lang:ruby %}
class Institution::Base < ActiveRecord::Base
  include OptimallyInheritable
  support_sti_for %w[Institution::NonProfit Institution::Commercial]
end
{% endcodeblock%}

All seems kosher, so we take our implementation for a test drive:

    > Institution::Base.all
    Institution::Base Load (0.4ms)  SELECT `institution_bases`.* FROM `institution_bases`
    => #<ActiveRecord::Relation [#<Institution::Commercial id: 3, name: "loremipsum", type: "2", created_at: "2014-07-17 12:27:26", updated_at: "2014-07-17 12:27:26">]>

While laoding instances of base class works well, we run into issues when we try to load all commercial
institutions:


    2.1.2 :005 > Institution::Commercial.all
    NoMethodError: undefined method `index' for nil:NilClass
                   from /Users/lorefnon/Workspace/sample/app/models/concerns/optimally_inheritable.rb:24:in `sti_name'
                   from /Users/lorefnon/.rvm/gems/ruby-2.1.2@sample/gems/activerecord-4.1.4/lib/active_record/inheritance.rb:170:in `block in type_condition'
                   from /Users/lorefnon/.rvm/gems/ruby-2.1.2@sample/gems/activerecord-4.1.4/lib/active_record/inheritance.rb:170:in `map'
                   from /Users/lorefnon/.rvm/gems/ruby-2.1.2@sample/gems/activerecord-4.1.4/lib/active_record/inheritance.rb:170:in `type_condition'
                   from /Users/lorefnon/.rvm/gems/ruby-2.1.2@sample/gems/activerecord-4.1.4/lib/active_record/core.rb:170:in `relation'

The problem is obvious : the variable `sti_class_list` is not available in subclasses.

So we rectify our solution:
{% codeblock lang:ruby %}
def sti_cls_list
  if superclass.respond_to? :sti_cls_list
    superclass.sti_cls_list
  else
    @sti_cls_list
  end
end
{% endcodeblock%}

This resolves the aforementioned issues.

Now that we have reached the end of the post, it would be a good time to highlight the drawbacks of our approach:

1. Firstly, The array passed to `support_sti_for` function will have to be kept in sync with the class names, if the name of any model class changes in future.
2. Secondly, While it is safe to add new entries to supported classes, their order can not be arbitrarily changed without running a data correction script first.

This concludes our post. The full source code is available at [Github](https://github.com/lorefnon/sti_optimization_demo.git). As always, any criticism or feedback is welcome.
