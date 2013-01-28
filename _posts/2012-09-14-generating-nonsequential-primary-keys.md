---
layout: post
title: Generating Nonsequential Primary Keys
---


Auto-incremented primary keys are nearly ubiquitous in DBMSs.  But for multi-master or sharded systems, they introduce the possibility (certainty?) of collision.   They are also sequential, and therefore, guessable - which is not always ideal.  Here's a pretty simple way to create nonsequential unique keys accross your entire system.
<!--more-->
In order to guarantee that keys will be unique, you have to either generate them all in the same place, or rely on the client creating each record to supply a unique ID.  With the former, you run the risk of creating a performance bottleneck while introducing a single point of failure.  Neither of these is desireable, so we'll use the latter.  I should mention, however, that this level of redundancy does not come without cost.  Relying on the client to provide a unique ID requires the use of a much larger address space than you'd normally use for an autoincrement column.  In this example, we'll be using 64-bit BIGINTs.  This requires double the amount of storage space typically reserved for INTEGER types.  Keep in mind this will be multiplied in every table which you use this column as a foreign key.

We're going to compose our key from three components:

1. A timestamp.
2. A 'generator id' - something that will uniquely identify the node creating the record.
3. A random number - to provide uniqueness beyond the precision of the timestamp.

First, let's start with a timestamp.  We'll be using standard UNIX timestamp to a precision level of milliseconds.  That is, the number of milliseconds since the Unix Epoch:  January 1, 1970 12:00:00.  In order to compose a single integer from these various components, we'll bit-shift the time stamp all the way to the left of the 64-bit integer.  This has a few advantages:

* A creation timestamp is probably something you'd want to have anyway - which lessens the hit of having such a large key if you can eliminate a timestamp column.  This number is easily extracted from the ID by right-shifting the key.
* By making the timestamp the most significant part of the number, it guarantees that the rows can be ordered by their creation time.  This will also allow any indexes to be added sequentially, rather than having to insert them in-place.

In Python, the time() function returns a float reperesenting the number of seconds since the Epoch, so to get the number of milliseconds as an integer:

<pre><code class="python" style="font-size:.9em">>>> int(time.time()*1000)
1347927116156</code></pre>

Of course, YMMV...

Now let's take a look at the timestamp and how we're going to store it.  1346472000000 is the number of milliseconds between the Epoch and September 1st, 2012.  If we convert that to binary:

<pre><code class="python" style="font-size:.9em">>>> bin(1346472000000)
'0b10011100101111111111111000011101000000000'</code></pre>

That's a 41-bit integer.  The largest number we can store in the same space is 2199023255552, or 2<sup>41</sup>-1.  
See:

<pre><code class="python" style="font-size:.9em">>>> bin(int(math.pow(2, 41))-1)
'0b11111111111111111111111111111111111111111'</code></pre>

This gives you until September 7th, 2039 before you run out of bits to store this timestamp.  That's good enough for me.  Now since we want the timestamp to represent the most significant portion of the number, we'll just shift it by 23 bits:

<pre><code class="python" style="font-size:.9em">>>> bin(1346472000000 << 23)
'0b1001110010111111111111100001110100000000000000000000000000000000'</code></pre>

That leaves 23 bits for the other components of the number.  We'll do as follows:

* 10 bits for the generator ID.  This gives us 2<sup>10</sup>-1 (or 1023) possible IDs.  That should be plenty.  If you are running a cluster of more than 1023 nodes, I suspect you're not looking to the blogosphere for your key generation scheme.
* The remaining 13 bits for a random number - That's between 1 and 8191.  Again; if you are generating more than 8000 ids per millisecond, per node, you probably don't need _my_ help.

Of course, you could always tweak the number of bits you use for each component to suit your needs.  So, our componets are: 

* A 41-bit timestamp shifted left by 23 bits 
* A 10-bit (maximum) generator ID shifted left by 13 bits
* A 13-bit (maximum) random number.  

In order to combine these into a single integer, we can simply add them together. Since we specifically shifted bits out of the way of each other, you could alo perform a bitwise AND to get the same result.

First, lets try it with some easy-to-test values:

<pre><code class="python" style="font-size:.9em">>>> bin((1346472000000 << 23) + (1 << 13) + 1)
'0b1001110010111111111111100001110100000000000000000010000000000001'
>>> bin((1346472000000 << 23) + (int(math.pow(2,9)) << 13) + int(math.pow(2,12)))
'0b1001110010111111111111100001110100000000010000000001000000000000'
>>> bin((1346472000000 << 23) + (int(math.pow(2,10)-1) << 13) + int(math.pow(2,13)-1))
'0b1001110010111111111111100001110100000000011111111111111111111111'</code></pre>

As you can see, the number is correctly divided at the 23 and 13 bit places.

So let's put this into a single function:

<pre><code class="python" style="font-size:.9em">def nonsequential_key(generator_id):
	now = int(time.time()*1000)
	rdm = random.randint(1, 8191)
	return ((now << 23) + (generator_id << 13) + rdm)</code></pre>

Here it is in action (showing the returned decimal integer values):
<pre><code class="python" style="font-size:.9em">>>> nskey.nonsequential_key(1)
11402993483053546203L
>>> nskey.nonsequential_key(1)
11402993501995022952L
>>> nskey.nonsequential_key(1)
11402993515760721961L</code></pre>

