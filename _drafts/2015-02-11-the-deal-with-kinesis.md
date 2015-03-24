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

In order to understand what's going on under the hood, it may be beneficial to understand the basic concepts.  Amazon does a pretty good job of laying them out for you in the [Getting Started documentation](http://aws.amazon.com/kinesis/getting-started/).

So, Records go into a Stream which is divided up into a numnber of Shards according to your estimated throughput capacity.  Kinesis uses the Partition Key you provide to assign each Record to a Shard. [sequence number]

All of that is done with a [Put Record Request](http://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecord.html).  

Now it's time to process those records. You're probably thinking "Ah, great, so I attach to some socket and wait for the records to come rolling in, right?" Erm, nope. Not exactly. Take a look at the [Kinesis API](http://docs.aws.amazon.com/kinesis/latest/APIReference/Welcome.html), specifically, the [GetRecords](http://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetRecords.html) action.

It takes 2 parameters:

<dl>
  <dt>Limit</dt>
  <dd style="margin-left: 1em"><p>The maximum number of records to return. Specify a value of up to 10,000. If you specify
            a value that is greater than 10,000, <code class="code">GetRecords</code> throws
                <code class="code">InvalidArgumentException</code>.</p><p>
            Type:
              Number</p><p>
                        Required: No
                    </p>
  </dd>
  <dt>ShardIterator</dt>
  <dd style="margin-left: 1em"><p>The position in the shard from which you want to start sequentially reading data records.
            A shard iterator specifies this position using the sequence number of a data record in
            the shard.</p><p>
            Type:
              String</p><p>
                            Length constraints:

                                Minimum length of
                                1.

                                Maximum length of
                                512.
                            </p><p>
                        Required: Yes
                    </p>
  </dd>
</dl>

Yep - this works exactly how you think.  You have to _request_ the records from Kinesis, and you have to tell it where to start[^1].  There's nothing "streaming" about this! It is very much a typical pull architecture.  However, Amazon provides the [Kinesis Client Library](https://github.com/awslabs/amazon-kinesis-client) (or KCL)[^2] which can _simulate_ a streaming API.  Even though this seems to be treated as an add-on or convenience library within the Kinesis product, it's really is the only way you want to consume records from a Stream.  

The [documentation](http://docs.aws.amazon.com/kinesis/latest/dev/developing-consumer-apps-with-kcl.html#kinesis-record-processor-kcl-role) specifies the role of the KCL, but I found it difficult to distill.  What it all means is, the library provides you with an [interface](https://github.com/awslabs/amazon-kinesis-client/blob/master/src/main/java/com/amazonaws/services/kinesis/clientlibrary/interfaces/IRecordProcessor.java) for processing records.  You implement that interface, launch your application, and the KCL will call your processRecords method periodcally after retrieving records from the stream.  It does this by creating a DynamoDB used to track its own state as well as communicate with other instances that are processing records from the same stream.

This is a good time to break down some of the KCL terminology:
<dl>
  <dt>Application</dt>
  <dd>A KCL application can be thought of just like a web application; it is the aggregation of computing resources running the same code, processing the same data.</dd>
  <dt>Worker</dt>
  <dd>An instance of the running application.  Usually, a single Worker runs in a single process on a single compute node (although it doesn't have to)</dd>
  <dt>Record Processor</dt>
  <dd>An instance of an class which implements the IRecordProcessor interface. Created by the Worker process.</dd>
</dl>

Still kinda fuzzy, right?  Let's try to walk-through a real world example[^3].

Let's say you are building a multitenant web analytics application.  You have an array of app servers collecting page view events and sending them to a Kinesis Stream named "Pageviews" with 4 shards.  You have chosen the ID of each client to be the Partition Key (you'll see why in a minute).

To process the records in this Stream, you create two different applications.  One of them logs each page view to an S3 bucket, but we'll forget about this one for now. The other counts the total page views for each client and writes them to a database periodically.  This application is named "Counter".

The Record Processor for the Counter app might look like this (in pseudocode):

~~~~~~ java
class CounterRecordProcessor implements IRecordProcessor {

  Map<String, Integer> pageviews = new HashMap<String, Integer>(); //a map of each client Id to the total number of pageviews

  void processRecords(List<Record> records, IRecordProcessorCheckpointer checkpointer) {
    for(Record record: records) {

      // the record is in a raw format, so you have to parse it into something useable
      PageView pv = parseKinesisData(record.getData());

      // now increment the count of pageviews for this client
      pageviews.set(pv.clientId) = pageviews.get(pv.clientId) + 1; //(Java Collections...SMH)
    }

    // all of the records in this batch have been processed so we can update the checkpoint
    checkpointer.checkpoint();

    if(shouldWriteToDB()) {

      // write all of the current counts to the DB
      for(String clientId: pageviews.keySet()) {
        DB.insert(clientId, pageviews.get(pv.clientId), System.currentTimeMillis());
      }

      //clear the accumulated mappings and start from scratch.
      pageViews = new HashMap<String, Integer>();
    }

  }

  void initialize(String shardId){
    // snip
  }

  void shutdown(IRecordProcessorCheckpointer checkpointer, ShutdownReason reason){
    //snip
  }

}
~~~~~~

A few notes:

* The pageviews Map is an instance variable of this class.  Each Shard gets one and only one Record Processor per application.  You are guaranteed that all records with the same partition key will be processed by the same Record Processor
* the checkpointer is stateful.  You don't have to checkpoint at the end of every batch.  In fact, it is common to only checkpoint after a certain time has elapsed.
* shouldWriteToDB may be time or size based, but it doesn't matter for this example.

You'd then write a main method as such:

~~~~~~ java
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.InitialPositionInStream;
import com.amazonaws.services.kinesis.clientlibrary.lib.worker.KinesisClientLibConfiguration;

public static void main(String[] args){
  KinesisClientLibConfiguration kinesisClientLibConfiguration =
    new KinesisClientLibConfiguration(
            "Counter",  // the application name
            "Pageviews", //the name of the stream we're connecting to
            credentialsProvider, //AWS fun
            "the_hostname_of_this_node"); // a unique identifier for this worker instance
  kinesisClientLibConfiguration.withInitialPositionInStream(InitialPositionInStream.LATEST);

  IRecordProcessorFactory recordProcessorFactory = new CounterRecordProcessorFactory();
  Worker worker = new Worker(recordProcessorFactory, kinesisClientLibConfiguration);
  worker.run()
}
~~~~~~

* InitialPositionInStream is just an enumeration that the library provides.  The setting on the configuraion is used to tell the KCL which kind of Shard Iterator to get - but only the first time this Application is ever run.
* for brevity, I left out the declaration of the CounterRecordProcessorFactory.  You'll just have to trust me that it creates an instance of CounterRecordProcessor

Alright so let's run through all of this and see how it would work:

1. You package up your application in a jar and deploy it to 2 different EC2 nodes.
2. You start one, then the other.  The first one creates a worker identified by its hostname. The worker sees that no DynamoDB table exists for this application yet, so it creates one and writes its state to it.  
3. It queries the stream and sees that there are four shards. It creates a CounterRecordProcesser for each of them and begins pulling records from the stream, calling your `processRecords` method with them.  It uses the  DynamoDB table to record which Sequence Numbers it has processed to provide to `GetShardIterator` requests.  Note that the very first time this runs, there are no processed records in the table, so it must call `GetShardIterator` with `InitialPositionInStream.LATEST`.
3. The second Worker starts.  It sees that there is an existing DynamoDB table for this application and stream.  It also registers itself by writing to the table.
4. Via the table, both workers discover each other and decide that since there are two of them, each should handle half of the shards.  The first worker shuts down two of its processors and the second process will create two to compensate.
5. Both workers run continually like this until one of them fails, in which case, the opposite of #4 happens.


[^1]: You must provide a ShardIterator, which is an encoded string representing a Sequence Number and some other metadata.  It's retreived via the [GetShardIterator](http://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html) API call which can return an iterator either at the exact Sequence Number you provide, or at the begining or end of the shard.

[^2]: also available for [Python](https://github.com/awslabs/amazon-kinesis-client-python) and [Ruby](https://github.com/awslabs/amazon-kinesis-client-ruby).

[^3]: Amazon provides a [sample Java application](https://github.com/aws/aws-sdk-java/tree/master/src/samples/AmazonKinesis) but it's diffucult to follow.  Lots of boilerplate, a mixture of configuration resources (external files and hard coding) etc.
