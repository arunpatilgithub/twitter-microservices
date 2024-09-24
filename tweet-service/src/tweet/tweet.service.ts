import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tweet } from './tweet.schema';
import axios from 'axios';
import { Kafka, logLevel } from 'kafkajs';
const CircuitBreaker = require('opossum'); // Updated import

@Injectable()
export class TweetService {
  private kafkaProducer;
  private breaker;

  constructor(@InjectModel(Tweet.name) private tweetModel: Model<Tweet>) {
    const kafka = new Kafka({
      clientId: 'twitter',
      brokers: ['kafka:9092'],
      retry: {
        retries: 5, // Number of retry attempts for Kafka message publishing
        initialRetryTime: 300, // Time in ms before first retry
        factor: 0.2, // Exponential backoff factor applied to retry times
      },
      logLevel: logLevel.ERROR, // Set the Kafka log level
    });

    this.kafkaProducer = kafka.producer();

    // Setting up Circuit Breaker for Kafka message publishing
    this.breaker = new CircuitBreaker(this.publishToKafka.bind(this), {
      timeout: 5000, // Time in ms before a request is considered failed
      errorThresholdPercentage: 50, // % of failures before the circuit opens
      resetTimeout: 10000, // Time in ms before the circuit breaker moves to HALF-OPEN state and allows a test request
    });

    this.breaker.on('open', () => console.log('Circuit breaker is OPEN'));
    this.breaker.on('halfOpen', () =>
      console.log('Circuit breaker is HALF-OPEN'),
    );
    this.breaker.on('close', () => console.log('Circuit breaker is CLOSED'));
  }

  /**
   * Find all tweets in the database.
   * @returns {Promise<Tweet[]>} List of tweets
   */
  async findAll(): Promise<Tweet[]> {
    return this.tweetModel.find().exec();
  }

  /**
   * Create a new tweet, validate the user, save the tweet, and publish the event to Kafka.
   * Uses Circuit Breaker for message publishing with retry logic and DLQ fallback.
   * @param createTweetDto { content: string; authorId: number } - Tweet data
   * @returns {Promise<Tweet>} The created tweet
   */
  async create(createTweetDto: {
    content: string;
    authorId: number;
  }): Promise<Tweet> {
    // Validate if the user exists in the system
    await this.validateUser(createTweetDto.authorId);

    // Create and save the tweet in MongoDB
    const newTweet = new this.tweetModel(createTweetDto);
    const tweet = await newTweet.save();

    // Publish tweet event to Kafka with retry and DLQ
    await this.publishTweetCreatedEvent(tweet);

    return tweet;
  }

  /**
   * Deletes a tweet by its ID.
   * @param id {string} - Tweet ID
   * @returns {Promise<void>}
   */
  async delete(id: string): Promise<void> {
    try {
      console.log(`Attempting to delete tweet with id: ${id}`);
      const result = await this.tweetModel.findByIdAndDelete(id);
      if (!result) {
        console.error(`Tweet with id ${id} not found`);
        throw new Error(`Tweet with id ${id} not found`);
      }
      console.log(`Successfully deleted tweet with id: ${id}`);
    } catch (error) {
      console.error('Error deleting tweet:', error.message);
      throw new Error('Internal server error while deleting tweet');
    }
  }

  /**
   * Validates whether the user exists by checking against the User Service.
   * Throws an HTTP exception if the user is not found or if the service is unavailable.
   * @param authorId {number} - The ID of the user (author of the tweet)
   * @returns {Promise<void>}
   */
  private async validateUser(authorId: number): Promise<void> {
    try {
      const response = await axios.get(
        `http://user-service:3000/users/${authorId}`,
      );
      if (response.status !== 200) {
        throw new HttpException(
          `User with ID ${authorId} not found`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new HttpException(
          `User with ID ${authorId} not found`,
          HttpStatus.NOT_FOUND,
        );
      } else if (error.response && error.response.data) {
        throw new HttpException(
          error.response.data.message,
          error.response.status,
        );
      } else {
        throw new HttpException(
          'Failed to connect to User Service',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Publishes a tweet-created event to Kafka.
   * It uses a Circuit Breaker to handle failures, and on failure, the message is sent to a Dead Letter Queue (DLQ).
   * @param tweet {Tweet} - The created tweet object
   * @returns {Promise<void>}
   */
  private async publishTweetCreatedEvent(tweet: Tweet) {
    try {
      // Fire the circuit breaker to attempt message publishing
      await this.breaker.fire({
        id: tweet._id,
        content: tweet.content,
        authorId: tweet.authorId,
        createdAt: tweet.createdAt,
      });
    } catch (error) {
      console.error('Failed to publish tweet event:', error.message);
    }
  }

  /**
   * Core logic to publish a message to Kafka.
   * This method is wrapped by the Circuit Breaker for handling failures.
   * @param message {any} - The message to be sent to Kafka
   * @returns {Promise<void>}
   */
  private async publishToKafka(message: any) {
    try {
      // Connect to Kafka
      await this.kafkaProducer.connect();

      // Send message to Kafka topic
      await this.kafkaProducer.send({
        topic: 'tweet-created',
        messages: [{ value: JSON.stringify(message) }],
      });

      console.log('Message sent to Kafka');
    } catch (error) {
      console.error('Error publishing to Kafka:', error.message);
      throw error; // Let Circuit Breaker know this attempt failed
    } finally {
      // Disconnect after sending
      await this.kafkaProducer.disconnect();
    }
  }

  /**
   * Handles Dead Letter Queue (DLQ) logic if the Circuit Breaker fails.
   * If message publishing repeatedly fails, the message is sent to a special 'DLQ' topic.
   * @param message {any} - The message that failed to be published to Kafka
   * @returns {Promise<void>}
   */
  private async handleDLQ(message: any) {
    try {
      console.log('Sending message to DLQ...');

      // Connect to Kafka
      await this.kafkaProducer.connect();

      // Send message to DLQ topic
      await this.kafkaProducer.send({
        topic: 'tweet-created-dlq',
        messages: [{ value: JSON.stringify(message) }],
      });

      console.log('Message sent to DLQ');
    } catch (dlqError) {
      console.error('Failed to send message to DLQ:', dlqError.message);
    } finally {
      // Disconnect after sending to DLQ
      await this.kafkaProducer.disconnect();
    }
  }
}
