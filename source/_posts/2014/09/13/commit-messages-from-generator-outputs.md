---
date: 2014-09-13
permalink: 2014/09/13/commit-messages-from-generator-outputs.html
layout: post
title: "Commit messages from generator outputs"
tags: [ZSH, Productivity Hacks]
is_outdated: true

---

A practise I always follow while working with tools that generate code is that any code that is generated and not written by me is committed in isolation. This makes skimming through commit logs later easier because generators often generate many files upfront that wouldn't be edited until much later. So the subsequent commit wouldn't be littered with changes that aren't directly related to the actual operation mentioned in the commit message. Also while browsing through commit diffs keeping generated code in their own commits speeds up the reviewing process - because in most cases we already have an idea of what the generated could be, so it can be skipped.

Now, if you use well designed frameworks with elegant command line interfaces, like Rails then the actual command typed along with the command output eg.

    rails generate model post title:string body:text

    invoke  active_record
    create    db/migrate/20140913191020_create_posts.rb
    create    app/models/post.rb
    invoke    rspec
    create      spec/models/post_spec.rb

is expressive enough for a commit message. A person familiar enough with the framework can instantly see the above and know what happened there. In such case, spending time writing an explanatory commit message for a auto-generated code is pretty much a waste of time.

So I have created a simple zsh function which does exactly the above:

    GC ()
    {
      cmd="$@"
      output=$("$@")
      git add .
      git commit -m "$cmd" -m "$output"
    }

Add it to your zshrc, and next time you can simply type :

    GC rails g model comment body:text commenter:string

GC will add all the generated code (please ensure you have a clean state before running the generator - GC will not help you that) and committing it with the message as the command combined with the output of generator in separate paragraphs.

    commit 029cb2e60187a196d918a08563d95775d73f5100
    Author: Lorefnon <lorefnon@gmail.com>
    Date:   Sun Sep 14 00:58:03 2014 +0530

        rails g model comment body:text commenter:string

              invoke  active_record
              create    db/migrate/20140913192803_create_comments.rb
              create    app/models/comment.rb
              invoke    rspec
              create      spec/models/comment_spec.rb
