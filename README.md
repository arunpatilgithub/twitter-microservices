# Twitter Microservices Project

This project simulates a simplified Twitter-like application using a microservice architecture. Each microservice handles specific features of the application, such as user management, tweet creation, and newsfeed updates. The services communicate asynchronously using Kafka for event-driven messaging, and MongoDB is used for persistent data storage. Elasticsearch is used for searching tweets efficiently.

## Microservices Overview

### 1. **User Service**
   - Manages user profiles and follower relationships.
   - Allows users to follow/unfollow other users.
   - Provides endpoints to fetch user details and their following list.
   - Uses **PostgreSQL** for storing user information and follower data.

### 2. **Tweet Service**
   - Allows users to post new tweets.
   - Stores tweet data in **MongoDB**, which includes details like `tweetId`, `content`, `authorId`, and `createdAt`.
   - Publishes the `tweet-created` event to Kafka when a new tweet is created.
   - Performs user validation through an API call to the `User Service`.

### 3. **Newsfeed Service**
   - Listens to the `tweet-created` event from Kafka.
   - Updates the newsfeed for users who follow the author of the new tweet.
   - Stores the newsfeed data in **MongoDB**, associating each newsfeed entry with `userId`, `tweetId`, and `createdAt`.
   - Retrieves newsfeed data for a given user, showing tweets from users they follow.

### 4. **Search Service**
   - Indexes all new tweets in **Elasticsearch** for efficient searching.
   - Subscribes to the `tweet-created` topic from Kafka to index tweets as they are created.
   - Provides an API to search tweets based on content, author, or timestamp.
   - Uses **Elasticsearch** for full-text search, allowing users to search tweets quickly and effectively.

## Kafka in the Project

- When a tweet is created in the `Tweet Service`, the tweet details (such as `tweetId`, `authorId`, `content`, and `createdAt`) are published as a message to the `tweet-created` topic in Kafka.
- The `Newsfeed Service` consumes these `tweet-created` events from Kafka, processes the message, and updates the newsfeed of the users who follow the tweet's author.
- The `Search Service` also consumes `tweet-created` events to index the tweets into Elasticsearch for efficient searching.
- If Kafka message publishing or consumption fails, retries and circuit breakers are in place to handle temporary issues. Additionally, failed messages can be redirected to a Dead Letter Queue (DLQ) for future inspection or reprocessing.

## MongoDB in the Project

MongoDB is used as the primary database for storing tweet data and newsfeed entries. Here's how MongoDB is utilized:

- **Tweet Service**: 
   - Stores tweet information, including `tweetId`, `content`, `authorId`, and `createdAt` fields, in MongoDB.
   - Each new tweet is saved in the MongoDB collection before publishing the `tweet-created` event to Kafka.

- **Newsfeed Service**:
   - Stores newsfeed entries in MongoDB, which includes `userId` (the user receiving the newsfeed), `tweetId`, `authorId`, `content`, and `createdAt`.
   - When a new tweet is created, the service listens to the Kafka event and updates the MongoDB newsfeed collection with the new data.

## Elasticsearch in the Project

Elasticsearch is used for efficient, real-time searching of tweets. Here's how Elasticsearch is utilized:

- **Search Service**: 
   - Consumes `tweet-created` events from Kafka and indexes tweets into Elasticsearch.
   - The indexed data includes fields such as `tweetId`, `content`, `authorId`, and `createdAt`, allowing for full-text search and filtering based on specific attributes.
   - Provides a search API to allow users to search tweets by content, author, or time range.
