---
date: 2012-08-12
permalink: 2012/08/12/effectively-debugging-knockoutjs-applications.html
layout: post
title: "Effectively debugging KnockoutJS applications."
tags: [Javascript, KnockoutJS]
is_outdated: true
post_warnings: 
    - I no longer recommend using knockout.js for newer projects. You may be better served by MobX or Effector.

---
This post aims to provide some explanation about the lifecycle of dynamic data-bindings in KnockoutJS to  ease debugging of KO applications .

A developer can remain perfectly oblivious of all that is going on under the hood and let the magic of declarative bindings do all the heavy-lifting of data-synchronization and it all works fine untill something unexpected happens. What now ? While most of the bugs in code can be directly resolved by inspecting the data-bind attributes manually, but if the complexity of application grows beyond a level an understanding of what goes on under the sheets becomes necessary.

While UI does appear to be getting magically updated when the models change, in reality the code underneath is all plain javascript. So what happens when something doesn’t turn out to be as expected ? Where do we start debugging from ?

The first and most obvious point of commencement is the observable. While we can (and sometimes might need to) begin from the observable function and dig down, debugging process is much simplified if we have a bit of familiarity with the way KO works internally. At this point I would like to underline that KO code is written very well and in general is easy to understand.

This knowledge is also helpful for development of custom bindings.

KO relies on bindingHandlers to manage bindings. So corresponding to every built in binding (eg. visible, text, html, value etc.)  we have a bindingHandler which has the same name. The text  binding is handled by a function **ko.bindingHandlers.text**, the value binding by **ko.bindingHandlers.value** and likewise.

Let us checkout a simple example :

{% codeblock lang:html %}
<html>
  <head>
    <script src="jquery-1.7.1.min.js"></script>
    <script src="knockout-latest.debug.js"></script>
    <script src="index.js"></script>
  </head>
  <body>
    <div>
      Please Enter your name :
      <input type="text" data-bind="value:name"></input>
    </div>
    <div>
      Hello <span data-bind="text: name"></span>
    </div>
  </body>
</html>
{% endcodeblock%}

{% codeblock lang:javascript %}
$(function(){
    var vmodel = {
        name: ko.observable("Lorefnon")
    }
    ko.applyBindings(vmodel);
});
{% endcodeblock%}

There are two binders involved : text-binder and value-binder. Let us inspect the **ko.bindingHandlers.text**in javascript.   It has a single member : update function. Yes, you guessed it right – this is the function that is called when the span is to be updated. Let us checkout what it does :

{% codeblock lang:javascript %}
ko.bindingHandlers['text'] = {
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};
{% endcodeblock%}

The code is straightforward and self explanatory. You can just add a breakpoint to the update function and it will be triggered every time that particular DOM node is updated. As expected the actual DOM manipulation takes place in the **ko.utils.setTextContent**

{% codeblock lang:javascript %}
setTextContent: function (element, textContent) {
     var value = ko.utils.unwrapObservable(textContent);
     if ((value === null) || (value === undefined)) value = "";
     'innerText' in element ? element.innerText = value : element.textContent = value;
     if (ieVersion >= 9) {
         // Believe it or not, this actually fixes an IE9 rendering bug
         // (See https://github.com/SteveSanderson/knockout/issues/209)
         element.style.display = element.style.display;
     }
},

{% endcodeblock%}

What about the other side of the code : What do you do to intercept a change in a form element ? Let us checkout the **ko.bindingHandlers.value**

<img src="/images/ko.png" />

As you probably have already guessed, the init function creates the bindings to intercept any change in the form element. The actual handler that is called each time when the input element changes its value is the valueUpdateHandler function defined inside init :

{% codeblock lang:javascript %}
var valueUpdateHandler = function () {
     var modelValue = valueAccessor();
     var elementValue = ko.selectExtensions.readValue(element);
     ko.jsonExpressionRewriting.writeValueToProperty(modelValue, allBindingsAccessor, 'value', elementValue, /* checkIfDifferent: */ true);
}
{% endcodeblock%}

elementValue holds the changed value which is in the next line synced back.

So here is an overview of how bindings work : when you call **ko.applyBindings** the library traverses the DOM hunting for data-bind attributes. When it finds a data-bind attribute – it first of all figures out which bindingHandler is to be called from the part of data-bind attribute value that preceded the colon. The corresponding handler’s update method set to be called each time the value of corresponding view model attribute changes and it is the responsibility of the update method to alter the DOM node as directed by the data-bind specification.

For those nodes which are editable by user (ie. the form elements) the corresponding bindingHandlers also have an init method which sets up the bindings for reverse synchronization.

This summarizes the way data-bindings work under the hood. I hope that this post helps to improve your understanding of KO library.
