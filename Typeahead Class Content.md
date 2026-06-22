# About Project

- Sir gave the “Solo Outside Dashboard Project”, we need to implement the TYPEAHEAD Service.
- Told we can use redis for KV DB, Postgres SQL / MYSQL for actual DB and our single System will behave like everything — App Servers, Multiple Redis Servers, DB servers — in order to run these thing smoothly we MUST use DOCKER such that when sir test our code then it should work in his machine too !
- Detailed DOC is present in the Syllabus Sheet.

---


# 🎯 Lecture Goal

From this lecture onwards, we begin solving complete High Level Design case studies.

Until now we have studied:

- Caching
- Sharding
- Replication
- CAP Theorem
- PACELC
- SQL vs NoSQL
- LSM Trees
- Bloom Filters
- Quorum
- Master-Slave Architecture

Now the goal is:

> Learn how to apply all these concepts together while solving real-world system design problems.
> 

This lecture starts with one of the most frequently asked HLD interview questions:

# Designing a Search Typeahead System

---

# Important Interview Mindset

Before discussing Typeahead itself, Sir emphasized one extremely important point.

## HLD Interviews are NOT DSA Interviews

In DSA:

```
Input:
[1,2,3,4]

Output:
10
```

Everything is clearly defined.

You know:

- Constraints
- Inputs
- Outputs
- Edge Cases

---

In HLD Interviews:

The interviewer may simply say:

```
Design Google Typeahead
```

or

```
Design Uber
```

or

```
Design WhatsApp
```

That's it.

No constraints.

No scale.

No requirements.

Nothing.

---

# First Rule of HLD Interviews

Never start solving immediately.

Always start with:

## Clarifying Questions

A good candidate first understands:

### Functional Requirements

What should the system do?

### Non-Functional Requirements

How should the system behave?

---

# Example

Suppose interviewer says:

```
Design Typeahead
```

Possible questions:

```
Should suggestions appear after 1 character?
or 3 characters?

Top 5 suggestions?
or Top 10?

Should suggestions be based on:
- popularity?
- recency?
- location?
```

Without clarification, you may design the wrong system.

---

# The Problem Statement

We are building:

# Google-like Search Typeahead

---

Not:

- Amazon Product Search
- Swiggy Search
- Zomato Search
- IDE Autocomplete

---

We are specifically building:

## Search Engine Typeahead

Example:

User types:

```
iph
```

System shows:

```
iphone
iphone 16
iphone 16 pro
iphone charger
iphone wallpaper
...
```

---

# What is Typeahead?

A Typeahead (Auto Suggest / Search-as-you-Type) is:

> A system that predicts and displays possible search queries while the user is typing.
> 

---

## Examples

When user types:

```
har
```

Suggestions:

```
har har mahadev
harry potter
harvard university
harry styles
harry potter cast
```

---

When user types:

```
jav
```

Suggestions:

```
java
java tutorial
java hashmap
java stream api
```

---

The user does not need to finish typing.

Suggestions appear dynamically.

---

# Functional Requirements

After discussion, we finalized the MVP.

---

## Requirement 1

Suggestions should appear after:

```
3 characters
```

Example:

```
ja
```

No suggestions.

---

```
jav
```

Suggestions appear.

---

## Requirement 2

Return:

```
Top 10 Suggestions
```

---

## Requirement 3

Suggestions must share the same prefix.

Example:

Input:

```
jav
```

Valid:

```
java
javascript
java tutorial
java hashmap
```

---

Invalid:

```
python
mongodb
```

---

## Requirement 4

Suggestions sorted by search frequency.

Example:

| Query | Count |
| --- | --- |
| java | 10M |
| javascript | 8M |
| java tutorial | 5M |

Return:

```
java
javascript
java tutorial
```

---

# Future Scope (Not MVP)

Sir emphasized:

> Do NOT design future features before solving the basic problem.
> 

---

Potential future features:

### Recency

Recent searches rank higher.

---

### Trending

Suddenly viral searches rank higher.

Example:

```
world cup final
```

---

### Geo-location

Users in Bangalore may see:

```
weather bangalore
```

while users in Delhi may see:

```
weather delhi
```

---

But:

### Ignore these initially.

Build the MVP first.

---

# How to Think During HLD Interviews

Sir explained a structured approach.

---

# Step 1: Functional Requirements

Ask:

```
What features?
```

---

# Step 2: Non-Functional Requirements

Ask:

```
Latency?
Consistency?
Availability?
```

---

# Step 3: Scale Estimation

Ask:

```
How many users?
How many requests?
How much data?
```

---

# Step 4: Design Architecture

Only now start designing.

---

Most students incorrectly jump directly to:

```
Let's use Trie
```

which is wrong.

---

You must first understand:

```
What problem are we solving?
```

> And don’t focus on useless things like COSMETICS — How should the Typeahead box be designed and all, Frontend wali cheeze.
> 

---

# Non-Functional Requirements Analysis

Let's analyze our system using PACELC.

---

# Do We Need Strong Consistency?

We are storing:

```
Search Query
Count
```

Example:

```
iphone -> 1,000,000
```

---

Suppose actual count is:

```
1,000,000
```

but one server shows:

```
999,998
```

---

Will users notice?

No.

---

Will business suffer?

No.

---

Kya ye diff users ko pata chalega?

No.

---

Therefore:

```
Strong Consistency
NOT REQUIRED
```

---

# Partition Scenario (CAP Theorem)

Suppose network partition happens.

Should we prefer:

```
Consistency
or
Availability
```

?

---

Example:

Server A returns:

```
iphone
```

---

Server B returns:

```
iphone 16
```

---

Different users may see different suggestions.

Is that acceptable?

Yes.

---

Therefore:

# Availability > Consistency

---

We choose:

```
AP System
```

instead of:

```
CP System
```

---

# No Partition Scenario (PACELC)

When no partition exists:

Should we choose:

```
Consistency
or
Latency
```

?

---

Again:

Counts are not mission-critical.

---

We prefer:

# Low Latency

---

Final Decision:

```
Partition → Availability
Else → Low Latency
```

---

In PACELC terms:

# PA/EL System

---

# Scale Estimation

Now we estimate scale.

This is one of the most important parts of system design.

---

# Why Estimate?

Because:

```
Solution depends on scale.
```

---

Example:

For:

```
1000 users
```

a Trie in RAM may be enough.

---

For:

```
Google Scale
```

that approach completely breaks.

---

# User Estimation

World population:

```
~8 Billion
```

---

Internet users:

```
5-6 Billion
```

---

Google users:

```
~5 Billion Monthly Active Users
```

Assumption:

```
MAU = 5 Billion
```

---

Daily Active Users:

Approximately:

```
40%
```

---

Therefore:

```
DAU ≈ 2 Billion
```

---

# Active User Estimation

Among DAU:

```
~1 Billion
```

very active users.

---

These users continuously perform searches.

---

# Searches Per Day

Assume:

```
20 Searches
per active user
per day
```

---

Total:

```
1 Billion × 20
```

=

```
20 Billion Searches/Day
```

---

# Searches Per Second

Seconds/day:

```
86400
```

---

Therefore:

```
20 Billion / 86400
```

≈

```
231,000 Searches/Sec
```

---

Rounded:

```
200K Searches/Sec
```

---

# Cross Verification

Sir verified this estimate with publicly available Google search numbers.

Result:

```
Very close.
```

This is called:

# Back-of-the-Envelope Calculation

---

# Typeahead Request Estimation

Now comes the interesting part.

We are NOT building Search.

We are building:

```
Typeahead
```

---

Suppose average search length:

```
10 Characters
```

Example:

```
java course
```

---

Each character generates:

```
Typeahead Request
```

---

So:

```
1 Search
=
10 Typeahead Requests
```

---

Therefore:

```
200K × 10
```

=

```
2 Million Requests/Sec
```

---

# Important Observation

Typeahead traffic is much larger than Search traffic.

---

Because:

```
1 Search
=
Multiple Suggestions
```

---

# Timezone Discussion

Students asked:

```
Won't traffic decrease at night?
```

---

Sir gave an important insight.

For a local application:

```
YES
```

traffic follows a daily curve.

---

Example:

```
India
```

Morning: Low

Afternoon: Medium

Night: High

Late Night: Low

---

But Google is global.

---

When India sleeps:

```
USA wakes up
```

---

When USA sleeps:

```
Europe wakes up
```

---

Combining all time zones:

Traffic becomes approximately flat.

---

Therefore:

Assume:

```
2 Million Requests/Sec
```

continuously.

---

# Understanding Existing Architecture

Before designing our service:

Understand where data comes from.

---

Google already has multiple MICROSERVICES like :

```
Search Service
Ads Service
```

---

User Flow:

```
User
  |
  v
Load Balancer
  |
  v
Search Service
```

---

Search Service already receives:

```
All Search Queries
```

---

Example:

```
iphone
java
world cup
```

---

Question:

Should Typeahead depend directly on Search Team, kya hume QUERY and COUNT unn se mangna chaiye ? ?

---

# Naive Idea

Ask Search Team:

```
Please maintain counts for us.
```

---

Why This Is Bad

In large companies:

Teams are independent.

---

Search Team's responsibility:

```
Search Results
```

Not:

```
Typeahead Counts
```

---

If our requirements change:

We must not disturb another team.

---

Therefore:

# Own Your Data

A very important engineering principle.

---

# Correct Approach

We maintain our own data.

---

But:

We still need search queries.

---

# Solution: Messaging Queue

Whenever Search Service receives:

```
iphone
```

it publishes event:

```
SearchQueryCreated("iphone")
```

into a Message Queue.

---

Architecture:

```
User
  |
  v
Search Service
  |
  v
Message Queue
  |
  v
Typeahead Service
```

---

Benefits:

### Decoupling

Search Team and Typeahead Team become independent.

---

### Scalability

Multiple services can consume same data w/o building separate infrastructure for them.

---

Example:

Future teams:

```
Analytics
Ads
Recommendations
Typeahead
```

can all consume from the same queue.

---

# Data Model

Our service maintains:

| Query | Count |
| --- | --- |
| iPhone | 1000000 |
| java | 800000 |
| world cup | 500000 |

---

Simple schema:

```sql
QueryCount
(
    query STRING,
    count LONG
)
```

---

# Data Estimation

Average Query Length:

```
10 Bytes
```

---

Count:

```
8 Bytes
```

---

Total:

```
18 Bytes
```

Rounded:

```
20 Bytes
```

per row.

---

# Unique Query Estimation

Out of:

```
20 Billion Searches/Day
```

many are duplicates.

---

Assume:

```
10%
```

are unique.

---

Therefore:

```
2 Billion Unique Queries/Day
```

---

# Daily Storage

```
2 Billion × 20 Bytes
```

=

```
40 GB/Day
```

---

# 20 Year Storage

```
40 GB × 365 × 20
```

≈

```
292 TB
```

---

Rounded:

```
320 TB
```

---

# Do We Need Sharding?

Absolutely.

---

Even if:

```
320 TB
```

could somehow fit into one machine,

one machine cannot handle:

```
2 Million Requests/Sec
```

---

Therefore:

# Sharding Is Mandatory

---

# Read Heavy or Write Heavy?

Important interview question.

---

Searches:

```
200K/sec
```

---

Each search generates:

```
1 write
```

(count update)

---

Thus:

```
200K Writes/Sec
```

---

Typeahead requests:

```
2 Million Reads/Sec
```

---

Ratio:

```
10 Reads : 1 Write
```

---

Therefore:

System characteristics:

```
Read Heavy
AND
Write Heavy
```

---

Not purely read-heavy.

Not purely write-heavy.

---

# Final Understanding Before Designing

At the end of this lecture we only understood the problem.

We intentionally did NOT discuss:

- Trie
- Cache
- Redis
- Elasticsearch
- Database Design

yet.

---

This is exactly how a strong HLD candidate behaves.

---

# Final Architecture Understanding

```
                +----------------+
                | Search Service |
                +----------------+
                        |
                        v
                +----------------+
                | Message Queue  |
                +----------------+
                        |
                        v
                +----------------+
                | Typeahead      |
                | Service        |
                +----------------+
                        |
                        v
                +----------------+
                | Sharded DB     |
                +----------------+
```

---

# Key Takeaways

### HLD Interview Flow

```
Requirements
→ FRs
→ NFRs
→ Scale Estimation
→ Architecture
→ Optimizations
```

Never jump directly to solution.

---

### Typeahead Requirements

- Suggestions after 3 characters
- Top 10 results
- Sorted by count
- Same prefix

---

### Non-Functional Choices

- Availability over Consistency
- Low Latency over Strong Consistency
- Eventual Consistency acceptable

---

### Scale

- 2 Billion DAU
- 20 Billion Searches/Day
- 200K Searches/Sec
- 2 Million Typeahead Requests/Sec

---

### Storage

- 40 GB/day
- ~320 TB over 20 years

---

### Architecture Principle

Own your own data.

Use Message Queues instead of tightly coupling services.

---

# 🎤 Top 5 Interview Viva Questions

## 1. Why is Typeahead an AP system instead of a CP system?

### Answer

Users do not care about exact counts. Slightly stale suggestions are acceptable. During a partition, serving suggestions is more important than waiting for perfect consistency.

---

## 2. Why shouldn't the Typeahead team depend directly on the Search team?

### Answer

It creates tight coupling. Any future change would require coordination with another team. Using a message queue allows independent scaling and ownership.

---

## 3. Why is Typeahead traffic much higher than Search traffic?

### Answer

One search query generates multiple keystrokes. If the average query length is 10 characters, one search can create roughly 10 Typeahead requests.

---

## 4. Why do we perform scale estimation before designing the system?

### Answer

The correct architecture depends on scale. A solution suitable for 10,000 users may completely fail for billions of users.

---

## 5. Why is sharding necessary even if storage fits on one machine?

### Answer

Storage is not the only concern. A single machine cannot handle millions of requests per second. Sharding distributes both storage and traffic load.

---

# End of Lecture 12

In the next lecture, we will start solving the actual problem and evaluate:

- Trie-based solutions
- Why naive Trie fails at Google scale
- How counts are maintained
- Database design choices
- Sharding strategy for Typeahead
- Caching requirements
- Real-world optimizations used in large-scale search systems.

---

# Recap of Previous Lecture

In the previous lecture, we spent the entire time understanding the problem before jumping into solutions.

We finalized:

### Functional Requirements

- Show suggestions after 3 characters
- Return Top 10 suggestions
- Suggestions sorted by popularity/count

### Non-Functional Requirements

- Extremely low latency
- High availability
- Eventual consistency is acceptable

### Scale

```
Daily Active Users ≈ 2 Billion

Searches / Day ≈ 20 Billion

Searches / Sec ≈ 200K

Typeahead Requests / Sec ≈ 2 Million

Data Size ≈ 320 TB
```

---

# Important Lesson Before Starting

Sir emphasized something very important.

In HLD:

```
Never marry your first solution.
```

Many students hear:

```
Prefix Search
```

and immediately think:

```
Trie
```

---

A good system designer asks:

```
Will Trie still work at Google Scale?
```

Only then proceed.

---

# Solution 1: Trie-Based Architecture

---

## Why Trie Comes First?

Because Typeahead fundamentally looks like:

```
Prefix Search
```

Example:

```
wh
```

Possible results:

```
what
where
why
when
which
```

---

Trie is naturally designed for this.

---

# Basic Trie Refresher

Suppose we store:

```
what
when
where
why
```

Trie:

```
          root
            |
            w
            |
            h
         / / |  \
        a e  y   e
        | |  |   |
        t n  end r
```

Searching:

```
wh
```

takes:

```
O(length)
```

which is excellent.

---

# But There Is A Huge Problem

We estimated:

```
320 TB Data
```

Can we store a single Trie?

No.

Impossible.

---

We need:

# Sharding

---

# How To Shard A Trie?

First idea:

```
Shard by First Character
```

---

Example:

```
Shard-A → all words starting with a
Shard-B → all words starting with b
...
Shard-Z → all words starting with z
```

---

Total shards:

```
26
```

---

Problem:

```
320 TB / 26
≈ 12 TB per shard
```

Still huge.

---

Not scalable.

---

# Sharding by First 3 Characters

Second idea:

```
abc
abd
abe
...
```

Total possibilities:

```
26³
=
17576 shards
```

---

Looks much better.

---

# New Problem: Hotspots

Not all prefixes are equally popular.

Example:

```
why
what
when
how
ipl
```

receive enormous traffic.

---

While:

```
zzz
qqx
xyz
```

receive almost none.

---

Therefore:

```
Data Distribution
≠ Uniform
```

---

Some shards become overloaded.

Others remain idle.

---

# Real-World Fix

Companies may:

### Vertical Scale Hot Shards

```
More RAM
More CPU
```

for:

```
why
what
how
```

---

and combine cold prefixes:

```
zzz
qqq
zqx
```

into a shared shard.

---

But in interviews:

This is usually considered an incomplete solution.

---

# Student Suggestion: Replicas

Someone suggested:

```
Create replicas
```

---

Sir pointed out:

Replicas improve:

```
Read Throughput
```

---

But replicas do NOT solve:

```
Data Distribution
```

---

Because Trie structure itself remains concentrated.

---

# Another Idea: Distributed Trie

Imagine:

```
Root → Server A

'w' → Server B

'wh' → Server C

'wha' → Server D
```

Each node becomes a server.

---

Diagram:

```
Root
 |
Server A
 |
Server B (w)
 |
Server C (wh)
 |
Server D (wha)
```

---

At first glance:

```
Looks scalable
```

---

Actually:

```
Terrible idea
```

---

# Doubt Resolution

## D: "Did we literally create one server for every Trie node?"

No.

Sir was explaining a conceptual distributed Trie.

The goal was to demonstrate:

```
Trie nodes depend on each other.
```

Not that every node becomes an actual machine.

---

The takeaway was:

### Trie introduces hierarchical dependencies.

---

To answer:

```
wha
```

you must first know:

```
w
→ wh
→ wha
```

---

This dependency becomes painful at scale.

---

# Another Major Problem

Suppose user searches:

```
wh
```

Need:

```
Top 10 Suggestions
```

---

A normal Trie only tells:

```
Which words exist.
```

It does NOT directly tell:

```
Top 10 most popular words.
```

---

To find Top 10:

We may need to traverse:

```
Entire subtree
```

---

Extremely expensive.

To answer Q queries it will take : Q x N

---

# Augmented Trie

Solution:

Store Top-K Suggestions at every node.

Example:

Node:

```
wh
```

stores:

```
what is HLD 
why is Sky Blue
when will HLD class end
where is my marks
which is the best Anime
```

along with counts.

---

Now:

```
search("wh")
```

becomes:

```
O(1)
```

lookup after reaching node.

---

This is called:

# Augmented Data Structure

Because we augmented the Trie with **extra precomputed data**.

---

# Example

Node:

```
wh
```

Stores:

```
[
 what (10M),
 why (8M),
 when (6M),
 where (5M)
]
```

---

User types:

```
wh
```

Immediately return stored list.

---

Very fast reads.

---

# New Problem: Updates

Now comes the killer issue.

---

Every search increases counts.

Example:

```
what
```

searched again.

Count:

```
10,000,000
→
10,000,001
```

---

Which nodes need updates?

```
w
wh
wha
what
```

All of them.

---

Then Top-K ordering must be recalculated.

---

Remember our scale:

```
200K Searches/sec
```

and

```
2 Million Typeahead Reads/sec
```

---

Updating Trie continuously becomes extremely expensive.

---

# What Are We Actually Storing?

Sir asked a brilliant question.

---

Inside Trie Node:

```
wh
```

What are we storing?

---

Answer:

```
Top K Suggestions
```

---

Example:

```
Key:
wh

Value:
[
 what,
 why,
 where
]
```

---

Wait...

Isn't this simply:

```
Key → Value
```

?

---

Exactly.

> Another reason Augmented Trie approach was bad due to uneven load distribution, it’s highly possible that most of the data goes to HOT PREFIXES like “why”, “what”, and due to Hard Dependency we are unable to shard their respective data.
> 

---

# Fundamental Observation

The augmented Trie is secretly behaving like:

```
HashMap
```

---

Therefore:

Instead of:

```
Trie Node
```

store:

```
Prefix → Top K Suggestions
```

directly.

---

# Solution 2: Key-Value Store

---

Instead of:

```
Trie
```

Store:

```
Key = Prefix

Value = Top K Suggestions
```

---

Example:

```
"w"
→
[
 what,
 when,
 why
]
```

---

```
"wh"
→
[
 what,
 why,
 where
]
```

---

```
"wha"
→
[
 what is ai,
 what is java,
 what is ipl
]
```

---

Now everything becomes:

```
HashMap Lookup
```

---

# Huge Advantage

Now:

```
w
wh
wha
what
```

are independent.

---

They no longer need hierarchical links.

---

Therefore:

### Consistent Hashing becomes possible.

Earlier they all need to be present in one single shard, now we can put them in different shards !

---

# Hard Dependency Explained

## D: What did Sir mean by "Hard Dependency"?

In Trie:

```
w
↓
wh
↓
wha
↓
what
```

Every node depends on parent nodes.

---

You cannot randomly place them.

---

They are structurally connected.

---

This is called:

# Hard Dependency

---

In Key-Value Design:

```
w
wh
wha
what
```

are independent keys.

---

Now:

```
w
→ Shard 1

wh
→ Shard 19

wha
→ Shard 72

what
→ Shard 4
```

Perfectly valid.

---

Therefore:

```
Better Distribution
Better Scalability
```

---

# Doubt Resolution

## D: Doesn't Trie also store Top-K? Why is HashMap better?

Excellent question.

---

The issue is NOT storage size.

The issue is:

```
Data Distribution
```

---

Trie forces related prefixes together.

HashMap does not.

---

HashMap enables:

```
Consistent Hashing
Uniform Distribution
Independent Scaling
```

---

Trie makes sharding difficult.

---

# Read Complexity Doubt

## D: Trie is O(L). HashMap is O(L × logN)?

Not here.

Because:

```
Prefix itself is the key.
```

---

Example:

User typed:

```
wha
```

---

Key:

```
"wha"
```

---

Hash:

```
hash("wha")
```

---

Direct lookup:

```
O(1)
```

Average.

---

Therefore:

Reads remain extremely fast.

---

# New Problem: Writes

Even in KV Store:

Every count update causes:

```
Prefix updates
```

---

Example:

Query:

```
what is IPL
```

updates:

```
w
wh
wha
what
what
...
```

---

Still expensive.

---

# Optimization #1: Batching

---

Instead of updating cache every time:

Update only after threshold.

---

Example:

```
count++
```

every search in our actual DB.

---

But update KV Store only when:

```
count % 1000 == 0
```

---

Example:

```
1000
2000
3000
4000
```

---

Now:

```
1000 writes
↓
1 cache update
```

---

Write reduction:

```
1000x
```

---

Massive improvement.

---

# Important Architecture Insight

We now have:

## Source of Truth

Actual Database

Stores:

```
Query
Count
```

---

## Fast Read Layer

KV Store

Stores:

```
Prefix
Top-K Suggestions
```

---

Users read ONLY from KV Store.

---

Users never read actual database.

---

# Doubt Resolution

## D: What is the architecture right now?

Architecture:

```
                User
                  |
                  v
           Load Balancer
                  |
                  v
          Stateless App
              Servers
                  |
                  v
       Key-Value Cache Cluster
                  |
                  |
         (read requests)
```

---

And separately:

```
Search Service
      |
      v
Message Queue
      |
      v
Typeahead Workers
      |
      v
Actual Database
(Query, Count)
```

---

Whenever threshold reached:

```
   App Server
      |
      v
Update KV Store
```

---

Therefore:

KV Store acts like:

```
Precomputed Read Cache
```

---

# Optimization #2: Sampling

---

Can we reduce writes even further with trade off with data loss ??

---

Suppose:

```
200K Writes/sec
```

---

Do we really need every event?

Maybe not.

---

Instead:

Process:

```
10%
```

of events.

Ignore:

```
90%
```

---

This is called:

# Sampling

---

Example

Actual searches:

```
100000
```

---

Process only:

```
10000
```

randomly.

---

Trends still remain visible.

---

Because of:

# Law of Large Numbers

---

# Law of Large Numbers

If dataset is ***huge*** :

A random sample behaves similarly to the whole population.

---

Example:

Election Exit Polls.

They don't ask:

```
1.4 Billion Indians
```

---

They ask:

```
Few thousand people
```

---

Yet predictions remain accurate.

---

Same concept.

---

# Batching vs Sampling

| Feature | Batching | Sampling |
| --- | --- | --- |
| Data Loss | No | Yes |
| Accuracy | High | Approximate |
| Write Reduction | Moderate | Huge |
| Complexity | Easy | Easy |

---

# Final Typeahead Architecture

## Read Path

```
User
  |
  v
 LB
  |
  v
Stateless App Server
  |
  v
KV Store Cluster
  |
  v
Top 10 Suggestions
```

---

## Write Path

```
Search Service
      |
      v
Message Queue
      |
      v
Typeahead Worker
      |
      v
Primary Database
(Query, Count)
      |
      v
Threshold Reached?
      |
     Yes
      |
      v
KV Store Update by App Server
```

---

# Why SQL For Count Storage?

Table:

```sql
QueryCount
(
    query VARCHAR,
    count BIGINT
)
```

---

Structured data.

Simple updates.

Simple indexing.

Strong durability.

No updates to stored query.

---

Therefore:

```
SQL is perfectly fine.
```

---

# Fan-Out Concern

Question:

When:

```
what is IPL
```

count changes,

don't we update:

```
w
wh
wha
what
...
```

?

---

Yes.

---

This is Fan-Out.

---

But average query length:

```
≈ 10
```

---

So only:

```
~10 updates
```

---

Compared to:

```
Thousands of shards
```

this is acceptable.

---

# Doubt Resolution

## D: How many keys exist in KV Store?

Suppose query:

```
what is IPL
```

---

Generated prefixes:

```
w
wh
wha
what
what
what i
what is
what is i
what is ip
what is ipl
```

---

Every prefix becomes a key.

---

Example:

```
Key:
"wh"

Value:
Top 10 queries starting with "wh"
```

---

Another:

```
Key:
"what"
```

Value:

```
Top 10 queries starting with "what"
```

---

So yes,

potentially millions/billions of prefixes exist.

---

But each key stores only:

```
Top-K Suggestions
```

not the entire dataset.

---

# Adding Trending & Recency

Current problem:

Historical popularity dominates.

---

Example:

```
iPhone 7
```

searched heavily for years.

---

New query:

```
iPhone 17
```

searched massively today.

---

Yet:

```
iPhone 7
```

may still rank higher.

as iska Decades long count will be much higher than iPhone 17.

---

Bad user experience.

---

# Solution 1: Decay

Every night:

```
count = count × 0.9
```

---

Example:

Day 1:

```
1000
```

---

Day 2:

```
900
```

---

Day 3:

```
810
```

---

Day 4:

```
729
```

---

Old queries naturally disappear.

---

# Linear Decay

```
count = count - 100
```

---

# Exponential Decay

```
count = count × 0.9
```

Usually preferred.

---

# Solution 2: Weekly Counter

Store:

```
Total Count
Current Week Count
```

---

Reset:

```
Current Week Count
```

every week.

---

Rank based on:

```
Current Week Count
```

---

# Solution 3: Sliding Window

Store counts only for:

```
Last 7 Days
```

or

```
Last 30 Days
```

---

Old data automatically expires.

---

# Solution 4: Exponential Moving Average (EMA)

Most advanced option.

---

Formula:

```
EMA =
(Current_Value × α)
+
(Previous_EMA × (1-α))
```

---

Example:

```
α = 0.8
```

---

Recent searches get more weight.

Older searches fade naturally.

---

Used heavily in:

- Trending systems
- Recommendation systems
- Analytics systems

---

# Key Lessons From This Case Study

### Never blindly choose Trie

Trie is theoretically perfect.

But scalability matters.

---

### Augmented Structures Are Powerful

Precompute expensive operations.

Trade writes for reads.

---

### Read Path and Write Path Can Be Different

Users:

```
Read KV Store
```

Workers:

```
Update Primary DB
```

---

### Batching Is Extremely Common

Used in:

- Search
- Analytics
- Recommendation Systems
- Ad Systems

---

### Sampling Is Also Common

When exact counts are not critical.