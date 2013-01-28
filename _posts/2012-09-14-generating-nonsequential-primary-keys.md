---
layout: post
title: Generating Nonsequential Primary Keys
---


There are certain situations when your database's Autoincrement primary key genererator is inadequte.  If you must do concurrent inserts into a multi-master cluster, or perhaps you simply don't want your primary keys to be predicatable.  Here's how to do it. 
<!--more-->
In order to guarantee that keys will be unique accross shards, databases, and tables, you'll have to generate them in your application.  We're going to use 3 components to construct each key:

1. A timestamp.
2. A 'generator id' - something that will uniquely identify the node creating the record.
3. A random number - to provide uniqueness beyond the precision of the timestamp.

Unfortunately, creating keys in an address space this large will require more than the standard 32-bits reserved for integer storage in most DBMSs.  This particluar scheme will fit in a 64-bit BIGINT.  Since space is at a premium, we're going to be using bit shifting to concatenate the key components. (bit shifting increases a number by a factor of 2, vs. "Shifting" a decimal integer which increases by a factor of 10)

First, let's start with a timestamp.  We'll be using standard UNIX timestamp to a precision level of milliseconds.  That is, the number of milliseconds since the Epoch:  January 1, 1970 12:00:00.  In Python, the time() function returns a float reperesenting the number of seconds since the Epoch, so to get the number of milliseconds:

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

This gives you until September 7th, 2039 before you run out of bits to store this timestamp.  That's good enough for me.  Now since we want the timestamp to represent the most significant portion of the number, we'll just shift it by 23 bits, completely to the left of the 64-bit number:

<pre><code class="python" style="font-size:.9em">>>> bin(1346472000000 << 23)
'0b1001110010111111111111100001110100000000000000000000000000000000'</code></pre>

Of course, now we're left with 23 bits for the other components of the number.  We'll do as follows:

* 10 bits for the generator ID.  This gives us 2<sup>10</sup>-1 (or 1023) possible IDs.  That should be plenty.  If you are running a cluster of more than 1023 nodes, I suspect you're not looking to the blogosphere for your key generation scheme.
* The remaining 13 bits for a random number - That's between 1 and 8191.  Again; if you are generating more than 8000 ids per millisecond, per node, you probably don't need _my_ help.

Of course, you could always tweak the number of bits you use for each component to suit your needs.  So, to pull it all together, we shift the generator ID left by 13 bits, generate a random number, and add them all together.  Of course, since we are specifically shifting bits out of the way of each other, you could perform a bitwise AND to get the same result.

First, lets just try it with some easy-to-test values:

<pre><code class="python" style="font-size:.9em">>>> bin((1346472000000 << 23) + (1 << 13) + 1)
'0b1001110010111111111111100001110100000000000000000010000000000001'
>>> bin((1346472000000 << 23) + (int(math.pow(2,9)) << 13) + int(math.pow(2,12)))
'0b1001110010111111111111100001110100000000010000000001000000000000'
>>> bin((1346472000000 << 23) + (int(math.pow(2,10)-1) << 13) + int(math.pow(2,13)-1))
'0b1001110010111111111111100001110100000000011111111111111111111111'</code></pre>

And the generator function:

<pre><code class="python" style="font-size:.9em">def unique_key(generator_id):
	now = int(time.time()*1000)
	rdm = random.randint(1, 8191)
	return ((now << 23) + (generator_id << 13) + rdm)</code></pre>


<pre><code class="python" style="font-size:.9em">>>> nskey.nonsequential_key(1)
11402993483053546203L
>>> nskey.nonsequential_key(1)
11402993501995022952L
>>> nskey.nonsequential_key(1)
11402993515760721961L</code></pre>

