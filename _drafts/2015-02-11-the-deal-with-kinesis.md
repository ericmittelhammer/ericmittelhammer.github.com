---
layout:     post
title:      "What's the Deal with Amazon Kinesis?"
subtitle:   "Stream your way to fun & profit!"
date:       2015-02-11 12:00:00
author:     "Eric Mittelhammer"
header-img: "img/tools.jpg"
---

The Amazonian marketing angle on Kinesis is pretty clear.  Just a glance at the product homepage
keywords "Streaming", "Real-Time", "Parallel", "Magic" (ok i threw that one in there myself).  The weird thing is - the actual Kinesis product is actually none of these things.  But that doesn't mean that you can't use it for yada yada ydada.

In order to understand what's going on under the hood, it may be beneficial to understand the basic concepts.  Amazon actually does a pretty good job of laying them out for you in the [Getting Started documentation](http://aws.amazon.com/kinesis/getting-started/).

This can be distilled as follows:

- Each Kineis stream is split into a specified number of shards.  They're analagous to shards in a typical datastore. But in this case, each shard serves as both a unit of throughput capacity as well as a logical unit of separation.
- You send Kinesis some data along with a partition key that you choose.  Kinesis will turn this into a "Record" and assign it a sequence id which will be returned to you.  All records with the same partition key are guaranteed to live on the same shard.  Note that you don't know _which_ shard.  This also means that you can have as many partitions as you need for your application and Kinesis will split them up however it sees fit amongst the shards you specify.

All of that is done with a [Put Record Request](http://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecord.html).  The documetion is pretty straightforward

At this point, you're probably thinking "Ah, great, so I attach to some socket and wait for the records to come rolling in, right?" Wrong. Take a look at the Kinesis API
