---
date: 2012-09-08
permalink: 2012/09/08/creating-a-basic-command-line-based-todo-app-using-ruby-and-sqlite.html
layout: post
title: "Creating a basic command line based todo app using ruby and sqlite."
tags: [Ruby, SQLite]
is_outdated: true

---

This tutorial aims to demonstrate how Ruby can be used to create simple command line applications.  A basic familiarity with Ruby and SQLite is assumed. Also availability of a POSIX compliant system is assumed. Although it is quite possible to port this tutorial to other proprietary platforms, I will not make any effort in this regard because of sheer lack of interest. In the tutorial, we create a simple command line based Task management application which is persisted through a local sqlite database. Thanks to the awesome commander library for ruby, the usual legwork of dealing with command line arguments and managing flags is greatly simplified.

Hopefully you are already using RVM. So we begin by creating a new gemset :

    rvm gemset create task-trooper
    rvm gemset use task-trooper

Running gem list presents us with the following :

    *** LOCAL GEMS ***

    bundler (1.1.5)
    rake (0.9.2.2)
    rubygems-bundler (1.0.3)
    rvm (1.11.3.5)

If you are not using rvm (though I would highly recommend you to use it) you would have to manually install bundler at this point.

If you don’t already have SQLite, you will have to install it using your favourite package manager. Installation for ubuntu is as simple as :

    sudo apt-get install sqlite3 libsqlite3-dev

Let us create a project directory and a Gemfile for managing our ruby dependencies :

    mkdir task-trooper
    cd task-trooper
    touch Gemfile

Populate your gemfile with the following :

{% codeblock lang:ruby %}
source "http://rubygems.org"
gem "commander"
gem "sqlite3"
gem "sequel"
{% endcodeblock%}

and run **bundle install**.
Commander is a ruby library for managing command line arguments. sqlite3 is the ruby adapter for sqlite. And since we don’t want to dabble with SQL strings, we use a simple ruby ORM – Sequel.
If all goes well, the dependencies will be fetched and you should see something like this :

    Fetching gem metadata from http://rubygems.org/........
    Using highline (1.6.14)
    Using commander (4.1.2)
    Using sequel (3.39.0)
    Installing sqlite3 (1.3.6) with native extensions
    Using bundler (1.1.5)
    Your bundle is complete! Use `bundle show [gemname]` to see where a bundled gem is installed.

Now, let us begin with the actual application code.
We will eventually deploy it as a rubygem. For now let us just focus on the core essentials.
For now our application code resides in a single file : task-trooper.rb

{% codeblock lang:ruby %}
require 'rubygems'
require "bundler/setup"
require 'commander/import'

program :name, "Task Trooper"
program :version, '1.0.0'
program :description, 'A simple command line based task manager'
{% endcodeblock%}

The above code does not add a lot of functionality, it simply simply supplies the name of the application and some version related information. Nevertheless the commander DSL takes care of some bootstrapping for us. Try running the follwing :
    $ ruby task-trooper.rb

This was expected. Let us see what help has to offer:

    $ ruby task-trooper.rb --help

      NAME:

        Task Trooper

      DESCRIPTION:

        A simple command line based task manager

      COMMANDS:

        help                 Display global or [command] help documentation.

      GLOBAL OPTIONS:

        -h, --help
            Display help documentation

        -v, --version
            Display version information

        -t, --trace
            Display backtrace when an error occurs

Not so bad, huh ?

Now we extend our code to incorporate database features :

{% codeblock lang:ruby %}
require 'rubygems'
require "bundler/setup"
require 'commander/import'
require 'sequel'

program :name, "Task Trooper"
program :version, '1.0.0'
program :description, 'A simple command line based task manager'

DB = Sequel.sqlite('tasks_db.db')

unless DB.table_exists? :tasks
  DB.create_table(:tasks) do
      primary_key :id
  String :title
  String :description
  Boolean :completed
  end
end

ds = DB[:tasks]
{% endcodeblock%}

The above piece of code shows how easy it is to use the Sequel library to manage database. The above code simply checks for the existence of a database table. In case the table does not exist, it is created. For now we keep the schema simple. Please note that thanks to database-agonistic api of Sequel you can use any other database here instead of Sqlite and all that would require is the alteration of one single line of configuration. Its time now to implement our first command :

{% codeblock lang:ruby %}
command :new do |c|
  c.syntax = 'task-trooper new'
  c.description = 'Creates a new task'
  c.action do |args, options|
    puts 'Task created!'
  end
end
{% endcodeblock%}

The syntax and description methods simply provide the metadata which will be presented in the help text. As far as the actual action is concerned, it simply
prints ‘Task created!’ and exits.

Lets checkout if the command new is actually available.

    $ ruby task-trooper.rb new

    Task created!

    $ ruby task-trooper.rb new --help

      NAME:

        new

      SYNOPSIS:

        task-trooper new

      DESCRIPTION:

        Creates a new task

Great ! That works. Of course, at this point our task does not do anything. So let us add some functionality.

{% codeblock lang:ruby %}
command :new do |c|
  c.syntax = 'task-trooper new'
  c.description = 'Creates a new task'
  c.option '--title STRING', String, 'Title of the task'
  c.option '--description STRING', String, 'Task Description'
  c.action do |args, options|
    if options.title.nil?
      options.title = ask('Provide a title for the task :')
    end
    if options.description.nil?
      options.description = ask('Provide a description for the task :')
    end
    ds.insert(:title => options.title, :description => options.description, :completed => false)
    say 'Task added !'
  end
end
{% endcodeblock%}

So, in the above code we specified the options that this command will expect.
if the title and description are not provided, the user will be prompted for
these options. Once both title and description are available, a record will be
inserted in the database.

Next, we need some way to show to the list of tasks. That’s not difficult either.

{% codeblock lang:ruby %}
command :list do |c|
  c.syntax = 'task-trooper list'
  c.description = 'Lists the tasks.'
  c.action do |args, options|
    ds.each do |task|
      status = if task[:completed] then "completed" else "pending" end
      puts "Task [#{task[:id]}] - <#{status}> : #{task[:title]}"
    end
    pending_count = ds.where(:completed => false).count
    count = ds.count
    completed_count = count - pending_count
    puts "\n"
    puts "Out of #{count} Total Tasks : #{pending_count} pending, #{completed_count} completed."
  end
end
{% endcodeblock%}

So, at this point basic creation and listing of tasks is available to us.

    $ ruby task-trooper.rb new --title "Water plants" --description "The plants in the garden have to be watered before sundown."
    Task added !

    $ ruby task-trooper.rb new
    Provide a title for the task :
    Add fertilizer
    Provide a description for the task :
    Add some fertilizer to the pot of roses.
    Task added !

    $ ruby task-trooper.rb list
    Task [1] - <pending> : Water plants
    Task [2] - <pending> : Add fertilizer

    Out of 2 Total Tasks : 2 pending, 0 completed.

Next, we need a way to mark a task as completed :

{% codeblock lang:ruby %}
command :done do |c|
  c.syntax = 'task-trooper done <id>'
  c.description = 'Mark a task as done'
  c.action do |args, options|
    if args.first.nil?
      puts 'Please specify the task to be marked as complete'
    else
      items = ds.where(:id => args.first)
      if items.count > 0
        items.update(:completed => true)
        puts "Updated"
      else
        puts 'No item found'
      end
    end
  end
end
{% endcodeblock%}

Try running **ruby task-trooper.rb done 1** follwed by **ruby task-trooper.rb list**
to make sure that the task has indeed been marked as done.

After this, we add facility to show details for a task and delete a task :

{% codeblock lang:ruby %}
command :show do |c|
  c.syntax = 'task-trooper show <id>'
  c.description = 'Shows the description of a task'
  c.action do |args, options|
    if args.first.nil?
      puts "Please specify the task to be shown."
    else
      ds.where(:id => args.first).each do |task|
        puts "Title : #{task[:title]}"
        puts "Description : "
        puts task[:description]
        puts "Completed : #{task[:completed]}"
      end
    end
  end
end

command :delete do |c|
  c.syntax = 'task-trooper delete <id>'
  c.description = 'Delete a task'
  c.action do |args, options|
    if args.first.nil?
      puts "Please specify the task to be deleted"
    else
      items = ds.where(:id => args.first)
      if items.count > 0
        items.delete
        puts "Deleted"
      else
        puts "No task found"
      end
    end
  end
end
{% endcodeblock%}

Now that we have all the basic facilities up and running, lets us proceed to
create a ruby gem so we can make the application available to other users.

We create a bin director, move our script to it and make it executable.

    mkdir bin
    mv task-trooper.rb bin/task-trooper
    chmod a+x bin/task-trooper

Also, we need to add a shebang to direct the shell to run it with ruby.
    #!/usr/bin/env ruby

Next, we need to add a gemspec to specify the required metadata for the
gem.

{% codeblock lang:ruby %}
Gem::Specification.new do |s|
  s.name = 'task-trooper'
  s.version = '1.0.0'
  s.date = '2012-09-09'
  s.summary = "Task Trooper"
  s.description = "Simple command line based task manager"
  s.authors = [ "Lorefnon" ]
  s.email = 'lorefnon@gmail.com'
  s.executables << 'task-trooper'

  ['commander', 'sqlite3', 'sequel'].each do |dep|
    s.add_dependency dep
  end
end
{% endcodeblock%}

We might also want to have our sqlite database in a hidden folder in user’s
home directory. This is easily accomplished :

{% codeblock lang:ruby %}
config_dir = File.expand_path('~/.task-trooper')
unless Dir[config_dir].length > 0
  Dir::mkdir(config_dir)
end

DB = Sequel.sqlite("#{config_dir}/tasks.db")

unless DB.table_exists? :tasks
  DB.create_table(:tasks) do
    primary_key :id
    String :title
    String :description
    Boolean :completed
  end
end
{% endcodeblock%}

Having done that, we can build our gem :
    gem build task-trooper.gemset

We can test our gem in a fresh rvm gemset
    rvm gemset create test
    rvm gemset use test
    gem install ./task-trooper-1.0.0.gem

Hold your breath while the dependencies are auto-matically fetched and installed. Now you can use task-trooper as you would use any other command line executable.
Here is an obligatory screenshot :

<img src="/images/task_trooper.png" />

So in less than an hour we were able to create a simple but functional todo app which is persisted in an Sqlite database. We can easily see that creating simple command line applications is not at all cumbersome in ruby. I do really hope that you can expand upon the material presented above to create some nifty CLI-apps. For some inspiration do check out : cli-apps.org .

Also, as usual feel free to provide your suggestions, criticism or details regarding any problems that you faced.
