---
layout:     post
title:      "ORM-like model objects with Slick"
subtitle:   "A familiar pattern for CRUD-like functionality."
date:       2013-08-03 12:00:00
author:     "Eric Mittelhammer"
header-img: "img/post-bg-01.jpg"
---

At Gawker Media, we've been making a hard push to convert the entirety of our data layer to use Slick - Typesafe's data access library.

One of the main challenges in working with an ORM is, well, the "M" therein: mapping database rows onto model objects you can use in your application. Since we store all of our model objects as serialized Protocol Buffers, we have an additional layer of conversion to perform.

Read the rest on <a href="http://tech.kinja.com/orm-like-model-objects-with-slick-1004286329">Kinja Technology</a>
