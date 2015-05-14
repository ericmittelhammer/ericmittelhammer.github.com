---
layout:     post
title:      "Actors don't play nice with value classes"
subtitle:   "And you can blame reflection"
date:       2014-02-21 12:00:00
author:     "Eric Mittelhammer"
header-img: "img/tools.jpg"
tags:
- scala
- akka
- actors
---

Scala value classes are a sugary-sweet convenience, but they can introduce some low-level conflicts due to their compilation magic.

First, what are they? There's a thorough explanation in the Scala documentation, but in some useful terms: you use value classes to "wrap" a single primitive in an object. With that, you can add member methods as well as reap the benefits of the type system such as type-checking and polymorphism. How this differs from regular-old OO is that the Scala compiler will convert these types to the underlying primitive and will be allocated as such on the heap.

See these classes:

{% highlight scala %}
    class Wrapper(i: Int)

    class ValueWrapper(val i: Int) extends AnyVal

    class MyClass1(i: Wrapper)

    class MyClass2(i: ValueWrapper)
{% endhighlight %}

Here's how they are compiled:

{% highlight bash %}
    $ javap ./target/scala-2.10/classes/MyClass1.class
    Compiled from "Wrappers.scala"
    public class MyClass1 {
    public MyClass1(Wrapper);
    }
    $ javap ./target/scala-2.10/classes/MyClass2.class
    Compiled from "Wrappers.scala"
    public class MyClass2 {
    public MyClass2(int);
    }
{% endhighlight %}

The Scala compiler will ensure that MyClass2 always takes a ValueWrapper, but will convert it to an int in the bytecode. What does this mean? Usually, not much - it all works seamlessly under the hood while saving you memory. Until you need to use reflection. Which you never, ever use, right? Unless, of course, you are trying to get a reference to an Akka actor.

This code will compile:

{% highlight scala %}
    class MyActor(i: ValueWrapper) extends Actor {

        override def receive = {
          case _ => Unit
        }

    }

    object App {

        val system = ActorSystem("testsystem")

        val vw = new ValueWrapper(1)

        val actor = system.actorOf(Props(classOf[MyActor], vw))

    }
{% endhighlight %}

But it will fail at runtime:

{% highlight bash %}
    [error] (run-main) java.lang.IllegalArgumentException: no matching constructor found on class MyActor for arguments [class ValueWrapper]
    java.lang.IllegalArgumentException: no matching constructor found on class MyActor for arguments [class ValueWrapper]
    {% endhighlight %}
This is frustrating because there obviously is a matching constructor, at compile time at least.

This is what happens when we try to get a reference to MyActor:

{% highlight bash %}
    scala> classOf[MyActor].getConstructor(classOf[ValueWrapper])
    java.lang.NoSuchMethodException: MyActor.<init>(ValueWrapper)
    at java.lang.Class.getConstructor0(Class.java:2810)
    at java.lang.Class.getConstructor(Class.java:1718)
{% endhighlight %}

Since the compiler has optimized the costructor to take the underlying primitive type, the relefctive call fails.

There really is no solid workaround, but since you know all references of your value classes will be converted to their primitive types, you can just accept the primitive in the constructor and handle any conversions manually.
