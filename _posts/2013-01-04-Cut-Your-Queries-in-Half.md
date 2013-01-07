---
layout: post
title: Cut Your Queries in Half
---


Here's a 
<!--more-->
This is some more text

(.virtualenv):~/repos/self-join-example$ time python scripts/load.py

real	0m33.849s
user	0m4.408s
sys	0m1.428s



self_join_example=# select * from posts limit 10;
 id |      content      | create_time_milliseconds 
----+-------------------+--------------------------
  1 | Some Post Content |            1357527443514
  2 | Some Post Content |            1357527443516
  3 | Some Post Content |            1357527443517
  4 | Some Post Content |            1357527443518
  5 | Some Post Content |            1357527443519
  6 | Some Post Content |            1357527443519
  7 | Some Post Content |            1357527443520
  8 | Some Post Content |            1357527443521
  9 | Some Post Content |            1357527443521
 10 | Some Post Content |            1357527443522
