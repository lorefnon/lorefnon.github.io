---
date: 2014-09-07
permalink: 2014/09/07/devise-multiple-emails.html
layout: post
title: "Allowing multiple emails for a user in Devise"
tags: [Ruby, Rails, Devise, Integration]
is_outdated: true

---

[Devise](https://github.com/plataformatec/devise) is an incredibly popular authorization gem for Rails. Unfortunately allowing a user to log in through multiple emails is not as straightforward as one might expect. This post outlines a way to do just that.

The code for this blog is available [here](https://github.com/lorefnon/devise_multi_email_demo.git). We start off with a rudimentary devise installation (you may want to checkout [Commit:3d5be26](https://github.com/lorefnon/devise_multi_email_demo/tree/3d5be26be7986aaf73c18497cffd67a9365e38cb) as a starting point - if you are not familiar with devise I suggest you take a look at the official documentation. As you may have noticed I am writing this post against Rails 4.2 Beta which Devise master does not support as of this writing. Luckily [lucasmazza](https://github.com/lucasmazza) has already submitted a pull request for 4.2 compatibility and we just need to use the branch `lm-rails-4-2`.

## Creating Email model

First step is creating an email model.

    rails g model email email:string user_id:integer

Next we setup the relationships between user and email:

{% codeblock lang:ruby%}
class Email < ActiveRecord::Base
  belongs_to :user
  validates :email, email: true, presence: true, uniqueness: true
end
{% endcodeblock%}

The email format validation comes from [email_validator](https://github.com/balexand/email_validator) gem.

{% codeblock lang:ruby %}
class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable

  has_many :emails
end
{% endcodeblock%}

Once we have done that, we can do away with the email field provided by devise. Instead of that, let us have a default email reference which may be used as a primary means of communication eg. for sending
newsletters, fetching gravatars etc. So here we go:

    rails g migration add_default_email_to_users default_email_id:integer

In `db/migrate/20140907091858_add_default_email_to_users.rb`

{% codeblock lang:ruby %}
class AddDefaultEmailToUsers < ActiveRecord::Migration
  def change
    remove_column :users, :email
    add_column :users, :default_email_id, :integer
  end
end
{% endcodeblock%}

In user model:

{% codeblock lang:ruby %}
belongs_to :default_email, class_name: "Email"
{% endcodeblock%}

## Setting up the registration flow:

At this point if we try visiting a devise sign up page, we will
get an obvious error because devise views expect an email field in
model.

<image src="/images/devise_email_not_found.png" />

We resort to a simple hack rather than put in a lot of effort in rewiring Devise. We add email accessors which (as far as devise is concerned) behave just like the email field devise had generated, but internally act as proxy to default email. Duck typing FTW.

{% codeblock lang:ruby %}
class User < ActiveRecord::Base

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable

  has_many :emails, dependent: :destroy
  after_commit :save_default_email, on: :create

  belongs_to :default_email, class_name: "Email"
  validates :default_email, presence: true
  default_scope { includes :default_email }

  def email
    default_email.email rescue nil
  end

  def email= email
    self.default_email = emails.where(email: email).first_or_initialize
  end

  private

  def save_default_email
    if default_email.user.blank?
      default_email.user = self
    elsif default_email.user != self
      raise Exceptions::EmailConflict
    end
    default_email.save!
  end

end
{% endcodeblock%}

Note that we have removed `:validatable` which is added by default
by devise. Also the after commit hook is required because when we are saving the user
for the first time, user id is nil when email is instantiated and hence will have to assign it once we have saved the user. An email conflict will be raised if the email
is already associated with another account. Handling that error gracefully is left as an exercise for the reader.

## Setting up the login flow:

While registration should work smoothly at this point, if we try to login we will run into trouble:

<img src="/images/devise_login_flow_fail.png"/>

The problem is obvious. Devise tries to search using email field which does not exist. So we need to
configure devise to find using the emails table we have created.

This can be done by overriding the class method `find_first_by_auth_conditions` :

{% codeblock lang:ruby %}
class User < ActiveRecord::Base
  ...

  def self.having_email email
    User
      .includes(:emails)
      .joins(emails: {
        email:  email
      })
      .first
  end

  def self.find_first_by_auth_conditions warden_conditions
    conditions = warden_conditions.dup
    if email = conditions.delete(:email)
      having_email email
    else
      super(warden_conditions)
    end
  end

  private

  ...
end
{% endcodeblock%}

Once we have done that, login flow should as intended.

## Interface for managing emails

At this point a user can login and signup but he can not manage the emails which are associated with his/her account. Let us take care of that.

The default edit account view of devise looks something like this:

<img src="/images/devise_default_edit.png"/>

Note that this form works perfectly well - thanks to our email accessor hack. But users don't have the ability to add new emails or delete existing emails.

We will to augment this form to accept nested attributes for emails. For nested forms probably the most popular solution is [nested_form](https://github.com/ryanb/nested_form) but it has been unmaintained for a while. So I resorted to [cocoon](https://github.com/nathanvda/cocoon) which is more actively maintained. Both of them work in a similar fashion - through unobstructive javascript.

First we have to configure our model to accept nested attributes for emails - this part is easy:

{% codeblock lang:ruby %}
class User < ActiveRecord::Base
  ...
  accepts_nested_attributes_for :emails, reject_if: :all_blank, allow_destroy: true
  ...
end
{% endcodeblock%}

Nest we need to generate devise views using `rails g devise:views` and edit the `app/views/devise/registrations/edit.html.erb`.

We edit the template to add nested form for emails:

{% codeblock lang:erb %}
<h2>Edit <%= resource_name.to_s.humanize %></h2>

<%= form_for(resource, as: resource_name, url: registration_path(resource_name), html: { method: :put }) do |f| %>
  <%= devise_error_messages! %>

  <div><%= f.label :email, "Default Email" %><br />
  <%= f.email_field :email, autofocus: true %></div>

  <div>
    <%= f.fields_for :emails do |email_f| %>
      <%= render 'email_fields', f: email_f %>
    <% end %>
    <div class="links">
      <%= link_to_add_association 'Add Email', f, :emails %>
    </div>
  </div>

  <% if devise_mapping.confirmable? && resource.pending_reconfirmation? %>
    <div>Currently waiting confirmation for: <%= resource.unconfirmed_email %></div>
  <% end %>

  <div><%= f.label :password %> <i>(leave blank if you don't want to change it)</i><br />
    <%= f.password_field :password, autocomplete: "off" %></div>

  <div><%= f.label :password_confirmation %><br />
    <%= f.password_field :password_confirmation, autocomplete: "off" %></div>

  <div><%= f.label :current_password %> <i>(we need your current password to confirm your changes)</i><br />
    <%= f.password_field :current_password, autocomplete: "off" %></div>

  <div><%= f.submit "Update" %></div>
<% end %>

<h3>Cancel my account</h3>

<p>Unhappy? <%= button_to "Cancel my account", registration_path(resource_name), data: { confirm: "Are you sure?" }, method: :delete %></p>

<%= link_to "Back", :back %>

{% endcodeblock%}

Cocoon mandates a separate partial for email fields, which in our case is very simple:

{% codeblock lang:erb %}
<div class="nested-fields">
  <div>
      <%= f.label :email %>
      <%= f.email_field :email %>
      <%= link_to_remove_association "remove email", f %>
  </div>
</div>
{% endcodeblock%}

At this point if we try saving the form, we will notice that email fields are not getting saved. The reason is that the strong parameters specified by devise does not include our email fields. Fortunately devise provides a way to configure that :

In `ApplicationController` :

{% codeblock lang:ruby %}
class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.

  protect_from_forgery with: :exception
  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.for(:account_update) do |u|
      u.permit :email, :password, :password_confirmation, :current_password, emails_attributes: [:email, :id, :_destroy]
    end
  end

end
{% endcodeblock%}

Note that `:_destroy` symbol in the attribute list. It is required because to destroy nested models, rails uses a virtual attribute called _destroy. When _destroy is set, the nested model will be deleted.

If we try adding, removing and editing emails now, everything should work smoothly.
<img src="/images/devise_nested_form_edit.png"/>

In a production setting we will most certainly need to send out confirmation mails before activating the emails. We skip the additional steps for the sake of brevity.

## Omniauth integration:

One of the things we all love about devise is that it integrates beautifully with
[omniauth](https://github.com/intridea/omniauth) making integration with a plethora of social services painless. However due to the fundamental changes we have made, omniauth integration requires jumping through a few extra hoops.

We use Facebook login as an example below:

Firstly, of course we need to create an application on [https://developers.facebook.com](https://developers.facebook.com). Once we have created an application, and have obtained the API key and secret, we configure devise omniauth parameters:

In Gemfile

{% codeblock lang:ruby %}
gem 'omniauth'
gem 'omniauth-facebook'
{% endcodeblock%}

In config/initializers/devise.rb

{% codeblock lang:ruby %}
Devise.setup do |config|
  ...
  config.omniauth :twitter, Rails.application.secrets.fb_app_id, Rails.application.secrets.fb_app_secret
  ...
end
{% endcodeblock%}

In config/secrets.yml

{% codeblock lang:yaml %}
development:
  fb_app_id: <add api key here>
  fb_app_secret: <add api secret here>
{% endcodeblock%}

In app/models/user.rb

{% codeblock lang:ruby %}
class User < ActiveRecord::Base
  ...
  devise :omniauthable, omniauth_providers: [:facebook]
  ...
end
{% endcodeblock%}

In config/routes.rb

{% codeblock lang:ruby %}
  devise_for :users, controllers: { omniauth_callbacks: "users/omniauth_callbacks" }
{% endcodeblock%}

where `users/omniauth_callbacks` is a controller we define to which facebook will redirect to after authenticating our application.

If you have used omniauth with devise before, there is nothing out of the ordinary so far.

Just like we wish to allow the user to sign up through multiple emails, we also wish to allow a user to sign up through multiple social networks. (s)he may be registered in different social networks with different emails. A simple and elegant way to represent a user's presence in multiple third party sites is through a separate `UserIdentity` model.

    rails g model UserIdentity user_id:integer email_id:integer uid:string provider:string

{% codeblock lang:ruby %}
class UserIdentity < ActiveRecord::Base
  belongs_to :user
  belongs_to :email
  validates :user, :email, :uid, :provider, presence: true
end
{% endcodeblock%}

Our callback controller is intentially very simple. Depending on your use case you may want to check if the user is newly created and direct him/her to a profile completion page. For the sake of simplicity, we just redirect any user to the profile page.

{% codeblock lang:ruby %}
class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def facebook
    @user = User.from_omniauth(request.env["omniauth.auth"])
    sign_in_and_redirect @user, :event => :authentication #this will throw if @user is not activated
  end
end
{% endcodeblock%}

In the `from_omniauth` class method of user we need to identify user based on the auth parameters passed.
Luckily facebook provides us with the email, so we can use that to identify a user.

Four scenarios are possible:

- **User is signing up for the first time through facebook.**
  In this case we just use the email obtained from facebook as the default email and register the user

- **User already has an account and has chosen to login through facebook for the first time**
  We can identify this situation if user's existing email is the same as the one he has used in Facebook. In this case we create a new UserIdentity for an existing user.

- **User had logged in using facebook before, using the same email**
  Nothing needs to be created. We just log the user in.

- **User had logged in using facebook before, using a different email**
  We keep the existing email, but associate the user identity with the new email.

Here is our implementation

{% codeblock lang:ruby %}
class User < ActiveRecord::Base

  ...

  def self.from_omniauth auth

    email = Email
      .includes(:user)
      .where(email: auth.info.email)
      .first_or_initialize

    ui = UserIdentity
      .where(provider: auth.provider, uid: auth.uid)
      .first_or_initialize

    if ui.persisted?
      # Existing user, Existing social identity
      if ! email.persisted?
        # Email changed on third party site
        email.user = ui.user
        email.save!
        ui.email = email
      elsif email.user == ui.user
        ui.user
      else
        raise Exceptions::EmailConflict.new
      end
    elsif email.persisted?
      # Existing User, new identity
      ui.user = email.user
      ui.save!
      ui.user
    else
      # New user new identity
      email.save!
      user = User.new(
        password: Devise.friendly_token[0,20],
        default_email: email
      )
      user.save!
      ui.user = user
      ui.email = email
      ui.save!
    end

    ui.user
  end

  ...

end
{% endcodeblock%}

The code above raises an `EmailConflict` exception if we end up in a scenario where an existing user is logging in and the email is associated with another account. Gracefully handling the error is left as an exercise for the reader. Also we assume that the social login provider will provide us with an email.
While this is true for many providers like Github, not all providers provide with emails. A prominent example is twitter. Since this is not intended to be a comprehensive tutorial on omniauth, for the sake of brevity we don't
elaborate on those scenarios. A good way to handle such a case would be to direct a user to a profile completion after login where he/she can enter the email and warn them if an account already exists for that email.

So we conclude the post with a functional setup that allows a user to have multiple emails associated with a devise account. Feel free to bug me if you face any issues. Any comments and suggestions are also welcome.
