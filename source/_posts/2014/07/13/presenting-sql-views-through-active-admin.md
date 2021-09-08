---
date: 2014-07-13
permalink: 2014/07/13/presenting-sql-views-through-active-admin.html
layout: post
title: "Presenting SQL views through ActiveAdmin"
tags: [Ruby, Rails, ActiveAdmin]
is_outdated: true

---
<a href="http://en.wikipedia.org/wiki/View_(SQL)"> SQL Views </a> are a handy feature that allow us to
save a query whose results are computed/collated dynamically whenever the view is requested.
Because the abstraction provided by a view is semantically close to a table we can leverage
ActiveRecord to interface with the view through a proxy model and use it to
present the result set through [ActiveAdmin](http://activeadmin.info) interface.

This can be very useful for reporting and visual inspection, especially by
non technical staff.

The rest of the post elaborates on a simple approach for doing this through
code examples. Please note that henceforth we use the term view
to refer to an SQL View rather than Rails view templates. Also the code is
written for Rails 4 but should be usable with Rails 3 as well.

For the sake of illustration we use an example database containing
geographical information of Indian cities. The full code is available [here](https://github.com/lorefnon/active_admin_view_demo).
For brevity we just mention the generator commands and
model classes here:

{% codeblock lang:sh %}
rails g model City name:string district_id:integer
rails g model District name:string state_id:integer
rails g model State name:string
{% endcodeblock%}

{% codeblock lang:ruby %}
# app/models/state.rb
class State < ActiveRecord::Base
  has_many :districts
  has_many :cities, through: :districts
end

# app/models/district.rb
class District < ActiveRecord::Base
  belongs_to :state
  has_many :cities
end

# app/models/city.rb
class City < ActiveRecord::Base
  belongs_to :district
  has_one :state, through: :district
end
{% endcodeblock%}

Note: Using the most recent Rails version, 4.1.4, will cause numerous dependency
conflicts, hence we use Rails 4.0.0 with ActiveAdmin edge.Since we don't plan
to use any cutting edge features in this example this should be an acceptable
compromise.

We stick to default Devise based AdminUser for authentication. Once we generate
active admin resources for our models, we have something like this:

<img src="/images/active_admin_states.png" />
<img src="/images/active_admin_districts.png" />
<img src="/images/active_admin_cities.png" />

The view that we intend to create combines the data in the three tables
joins.

    SELECT cities.id AS id, states.name AS state, districts.name AS district, cities.name AS city
    FROM states
    INNER JOIN districts ON districts.state_id = states.id
    INNER JOIN cities ON cities.district_id = districts.id

<img src="/images/joins_states.png" />

To create the view we generate a migration:

    rails g migration create_state_district_city_view

{% codeblock lang:ruby %}
class CreateStateDistrictCityView < ActiveRecord::Migration

  def up
    self.connection.execute %Q( CREATE OR REPLACE VIEW state_district_city_view AS
      SELECT cities.id AS id, states.name AS state, districts.name AS district, cities.name AS city
      FROM states
      INNER JOIN districts ON districts.state_id = states.id
      INNER JOIN cities ON cities.district_id = districts.id
    )
  end

  def down
    self.connection.execute "DROP VIEW IF EXISTS state_district_city_view;"
  end

end
{% endcodeblock%}

Now a view, as far as read access is concerned, behaves similar to a table, we
can just define a normal ActiveRecord model to access this view.

{% codeblock lang:ruby %}
class StateDistrictCityViewProxy < ActiveRecord::Base
    self.table_name = "state_district_city_view"
end
{% endcodeblock%}

We can take the proxy model for a test drive using IRB:

{% codeblock lang:ruby %}
> StateDistrictCityViewProxy.limit(10).to_a
  StateDistrictCityViewProxy Load (0.4ms)  SELECT `state_district_city_view`.* FROM `state_district_city_view` LIMIT 10
=> [#<StateDistrictCityViewProxy id: 1, state: "Andhra Pradesh", district: "Anantapur", city: "Agali">, #<StateDistrictCityViewProxy id: 2, state: "Andhra Pradesh", district: "Anantapur", city: "Amadagur">, #<StateDistrictCityViewProxy id: 3, state: "Andhra Pradesh", district: "Anantapur", city: "Amarapuram">, #<StateDistrictCityViewProxy id: 4, state: "Andhra Pradesh", district: "Anantapur", city: "Anantapur">, #<StateDistrictCityViewProxy id: 5, state: "Andhra Pradesh", district: "Anantapur", city: "Atmakur">, #<StateDistrictCityViewProxy id: 6, state: "Andhra Pradesh", district: "Anantapur", city: "Bathalapalle">, #<StateDistrictCityViewProxy id: 7, state: "Andhra Pradesh", district: "Anantapur", city: "Beluguppa">, #<StateDistrictCityViewProxy id: 8, state: "Andhra Pradesh", district: "Anantapur", city: "Bommanahal">, #<StateDistrictCityViewProxy id: 9, state: "Andhra Pradesh", district: "Anantapur", city: "Brahmasamudram">, #<StateDistrictCityViewProxy id: 10, state: "Andhra Pradesh", district: "Anantapur", city: "Bukkapatnam">]
{% endcodeblock%}

Now that we have a model, generating an ActiveAdmin resource is as simple as:

     rails g active_admin:resource StateDistrictCityViewProxy

At this point upon visiting the index page in ActiveAdmin we might have expected
a fancy paginated table but instead we are greeted with a not-so-helpful error:

<img src="/images/err1.png"/>

The problem is immediately obvious if we try to get the attributes of a model instance:

    > s1 = StateDistrictCityViewProxy.first
      StateDistrictCityViewProxy Load (0.3ms)  SELECT `state_district_city_view`.* FROM `state_district_city_view` LIMIT 1
    => #<StateDistrictCityViewProxy id: 1, state: "Andhra Pradesh", district: "Anantapur", city: "Agali">
    > s1.attributes
    => {"id"=>1, "state"=>"Andhra Pradesh", "district"=>"Anantapur", "city"=>"Agali", nil=>nil}

So the question is where is the nil coming from? The problem is that an SQL view doesn't have a primary key. Rails doesn't automatically
assume that our `id` field is a primary key.

    > StateDistrictCityViewProxy.primary_key
    => nil

We can not somehow add a primary key to an SQL view, that is utterly pointless. However we can force ActiveRecord to use the `id` attribute
as primary key.

{% codeblock lang:ruby %}
class StateDistrictCityViewProxy < ActiveRecord::Base
  self.table_name = "state_district_city_view"
  self.primary_key = "id"
end
{% endcodeblock%}

And voila. We have our fancy table:

<img src="/images/active_admin_view.png"/>

# Caveats:

While everything looks great at this point, our setup has a couple of issues that need to be resolved:

## schema.rb

If you take a look at schema.rb the problem immediately becomes obvious. Nothing about our view is to be found.
The problem is that Rails is blissfully oblivious of our SQL views and the sql statements
in our migrations have not introducted any changes in schema.rb. So when you regenerate the database from
schema.yml the view will not be created. This has multiple solutions. A simple one
is to get rid of schema.rb in favor of sql schema format.

In config/application.rb:

    config.active_record.schema_format = :sql

Next time we run `rake db:migrate` a `structure.sql` file will be generated that contains the SQL
for generating our views.

An alternative option is the gem [schema_plus](https://github.com/lomba/schema_plus) that augments ActiveRecord
with support for views among other advanced database features.

## Edit/Delete actions

Our ActiveAdmin view table has been blessed with `Edit` and `Delete` actions for every row, which
oviously trigger an error. For example, here is what we end up with when clicking on `Delete` :

<img src="/images/err2.png"/>

Let us declare the proxy model as readonly.

{% codeblock lang:ruby %}
class StateDistrictCityViewProxy < ActiveRecord::Base
  self.table_name = "state_district_city_view"
  self.primary_key = "id"

  def readonly?
    true
  end
end
{% endcodeblock%}

Next we simply remove the irrelevant actions from the ActiveAdmin view:

{% codeblock lang:ruby %}
ActiveAdmin.register StateDistrictCityViewProxy do

  actions :index, :show

end
{% endcodeblock%}

Now that the quirks of our setup have been ironed out, feel free to go ahead and try it out.
Of course SQL views are not the only solution for a problem like this and the aforementioned table could have been
built entirely through DSLs provided by ActiveAdmin. But nonetheless, SQL views are something that
most DBAs are already familiar with and is a hassle free setup. If you already have a legacy database
with views or need to use views for other auxiliary purposes, the aforementioned approach may make
things easy for you.

Any suggestion or criticism is welcome.
