---
date: 2015-01-03
permalink: 2015/01/03/leveraging-strategy-pattern-in-rails.html
layout: post
title: "Leveraging the strategy pattern in Rails - I"
tags: [Ruby, Rails, Design Patterns]
is_outdated: true

---

# To begin with, what is strategy pattern ?

Quoting from [Wikipedia](http://en.wikipedia.org/wiki/Strategy_pattern),

> the strategy pattern (also known as the policy pattern) is a software design
> pattern that enables an algorithm's behavior to be selected at runtime.

# So how does this help us ?

Strategy pattern just helps us escape the soup of complex nested conditionals
and model behavior selection in an object oriented fashion. To understand why this is
required let us explore a fictional example:

# An adventure

Suppose that we are developing a social network for book lovers. To encourage users
to read more we decide to show a recommendations panel which highlights books that
are trending in the community.

Our (over-simplified) implementation might be something like:

{% codeblock lang:ruby %}
class Book < ActiveRecord::Base

  has_many :recommendations
  has_many :tags

  scope :popular, -> {  where 'recommendations_count > 100' }

  # Return a random subset of recommended books
  #
  # Yes, this approach is sub-optimal for large number of popular books. Better
  # approaches are outlined here:
  # http://stackoverflow.com/questions/4329396/mysql-select-10-random-rows-from-600k-rows-fast
  #
  def self.recommended
    popular.order('RAND()').limit(5)
  end

end

class Recommendation
  belongs_to :user, counter_cache: true
  belongs_to :book, counter_cache: true
end
{% endcodeblock%}

In home/index.html.erb
{% codeblock lang:erb %}
<ul id='recommended-book-list'>
  <% Book.recommended.each do %>
    <li> <%= book.title %> </li>
  <% end %>
</ul>
{% endcodeblock%}

So far so good, however we realize that for users who have been using our service
for a while, it makes more sense to show recommendations based on their intersts. So we do a
shotgun surgery and modify our code to the following:

{% codeblock lang:ruby %}
class Book < ActiveRecord::Base
  ...
  def self.recommended_for user
    if user.blank? || (user.recommendations_count < 5)
      popular
    else
      not_recommended_by(user).where(tags: user.recommended_tags)
    end.order('RAND()').limit(5)
  end

end

class User < ActiveRecord::Base
  ...
  has_many :recommendations
  has_many :recommended_books,
    through: :recommendations,
    source: :book
  has_many :recommended_tags,
    through: :recommended_books,
    source: :tags

end

class Book < ActiveRecord::Base
  ...
  scope :not_recommended_by, -> (user) do
    joins(:recommendations)
      .where('recommendations.user_id != ?', user.id)
  end

end
{% endcodeblock%}

And our template becomes something like:

{% codeblock lang:erb %}
<ul id='recommended-book-list'>
  <% Book.recommended_for(current_user).each do %>
    <li> <%= book.title %> </li>
  <% end %>
</ul>
{% endcodeblock%}

We see that at this point our `recommended_for` method is burdened with multiple
responsibilities - the decision for the approach to be used as well as the logic
for multiple approaches all reside in the same method, which is not very ideal.

Let us push this further. Say, after a couple of months our social networks gains
a lot of traction and we strike a very profitable deal with a major publishing
firm 'Jackass Kangaroo Publications' and as a part of the deal we need to ensure
that the recommended books include only those which have been published by this
publication.

No problem, we just need add a few lines of code:

{% codeblock lang:ruby %}
class Book < ActiveRecord::Base
  ...
  def self.recommended_for user
    query = Book

    # Comment this out when deal with Jackass Kangaroo Publication is over.
    query = query.where(publisher: Publisher.where(name: 'Jackass Kangaroo Publication').first)

    if user.blank? || (user.recommendations_count < 5)
      query.popular
    else
      query.not_recommended_by(user).where(tags: user.recommended_tags)
    end.order('RAND()').limit(5)
  end
end
{% endcodeblock%}

No words are needed to describe the ugliness of the code above. Our eyes bleed but we
choose to look away and carry on with our buisness.

Of course, the journey of our social network is not all rosy. We get hit by a
lawsuit making our deal with `Jackass Kangaroo Publications` illegal in a specific country.
But why bother backing off from this insanity when all problems can be resolved
by adding just another condition:

{% codeblock lang:ruby %}
class Book < ActiveRecord::Base
  ...
  def self.recommended_for user
    query = Book

    # Comment this out when deal with Jackass Kangaroo Publication is over.
    unless user.located_in? DISPUTED_DEMOGRAPHY
      query = query.where(publisher: Publisher.where(name: 'Jackass Kangaroo Publication').first)
    end

    ...
  end
end
{% endcodeblock%}

# A downhill slope

So requirements keep stacking up and we keep adding conditions. Fast forward a few years, and
a sincere programmer who is new to the project, unfamiliar with our rocky history and now is responsible
for maintenance of the project is staring
blankly at the entangled mess of conditional statements. Of course the crutial details of the deal
and the subsequent lawsuits are now lost in sands of time, and none of the present team members
have any idea what is going on.

# Retrospection

The question now is, what could be done to avoid a situation like this ? As you might have guessed
at this point, burdening the Book class with responsibility to determine various aspects of
application that affect our recommendation policy as well as the complete implementation of all these policies
is cumbersome. What we can do is that we can refactor out the specific strategies into dedicated
classes that encapsulate the actual implementation details. This is exactly what the strategy pattern
encourages us to embrace.

{% codeblock lang:ruby %}
module Strategies
  class RecommendationGeneration < Struct.new(user, scoped_collection)
    def scoped_collection
      super || Book
    end

    def applicable?
      false
    end

    def execute
    end

  end
end
{% endcodeblock%}
<br>
{% codeblock lang:ruby %}
module Strategies
  class DefaultRecommendationGeneration < RecommendationGeneration

    def applicable?
          true
    end

        def scoped_collection
          super || popular
        end

    def execute
          scoped_collection.order('RAND()').limit(5)
    end

  end
end
{% endcodeblock%}
<br>
{% codeblock lang:ruby %}

module Strategies
  class UserAdaptedRecommendationGeneration < RecommendationGeneration

    def applicable?
      user.present?
    end

    def scoped_collection
      if user.present?
        not_recommended_by(user).where(tags: user.recommended_tags)
      else
            super
          end
        end

        def execute
          Strategies::DefaultRecommendation
            .new(user, scoped_collection)
                .execute
        end

  end
end
{% endcodeblock%}
<br>
{% codeblock lang:ruby %}

module Strategies
  class PartnershipAdaptedRecommendationGeneration < RecommendationGeneration

    # It is better to model buisness constraints in the persistance layer
        # rather than relying on implicit assumptions.
        #
        def applicable?
          ! partner_publisher.blank?
        end

        def partner_publisher
          Partnership
            .legal_in(user.demography)
        .having_recommendation_priviledge
                .active
                .first
                .publisher
        end

        def scoped_collection
          Book.where(publisher: partner_publisher)
        end

        def execute
          Strategies::UserAdaptedRecommendationGeneration
                .new(user, scoped_collection)
                .execute
        end

  end
end
{% endcodeblock%}

Now our `recommended_for` method just has to decide which is the applicable strategy and execute
it:
{% codeblock lang:ruby %}

class Book < ActiveRecord::Base
  ...

  RECOMMENDATION_STRATEGIES = [
    PartnershipAdaptedRecommendationGeneration
        UserAdaptedRecommendationGeneration
        DefaultRecommendationGeneration
  ]

  def self.recommended_for user
    RECOMMENDATION_STRATEGIES.each do |strategy_class|
          strategy = strategy_class.new(user)
          if strategy.applicable?
            strategy.execute
                break
          end
        end
  end

end

{% endcodeblock%}

This is signficantly better than our prior approach and aligns well with the tenets of
[SOLID](http://en.wikipedia.org/wiki/SOLID_(object-oriented_design)) principles. Apart from
explaining the use of strategy pattern it also illustrates how strategies can reuse existing
strategies by means of composition thus keeping our code DRY.

So we see that, the strategy pattern is especially helpful when it comes to applications where
requirements are rapidly changing all the time. Since the core logic is encapsulated
into interchangeable concrete implementations, strategy implementations can be
introduced or switched with relative ease at a later phase.

While this post focussed on use of strategy pattern to simply complex logic in model layer, in
subsequent posts we will cover how this pattern can simplify our implementations in controller
and view layers as well.

This concludes the post. Please feel free to let me know about your suggestions for improvements, or
mistakes that I might have made in the post above.
