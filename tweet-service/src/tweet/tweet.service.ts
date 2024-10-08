import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tweet } from './tweet.schema';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Kafka } from 'kafkajs';
import { RedisService } from '../redis/redis.service';
const CircuitBreaker = require('opossum');

@Injectable()
export class TweetService {
  private readonly kafkaProducer: any;
  private readonly breaker: any;
  private readonly followerThreshold = 10;

  constructor(
    @InjectModel(Tweet.name) private tweetModel: Model<Tweet>,
    private redisService: RedisService,
  ) {
    // Kafka client and producer setup
    const kafka = new Kafka({
      clientId: 'twitter',
      brokers: ['kafka:9092'],
      retry: {
        retries: 5, // Retry sending messages up to 5 times
        initialRetryTime: 300,
        factor: 0.2,
      },
    });

    this.kafkaProducer = kafka.producer();

    // Circuit breaker for publishing Kafka events
    this.breaker = new CircuitBreaker(this.publishWithRetry.bind(this), {
      timeout: 5000, // Time in ms after which the breaker times out
      errorThresholdPercentage: 50, // Trip if 50% of the requests fail
      resetTimeout: 10000, // Time before trying again after breaker opens
    });

    this.breaker.on('open', () => console.log('Kafka circuit breaker is OPEN'));
    this.breaker.on('halfOpen', () =>
      console.log('Kafka circuit breaker is HALF-OPEN'),
    );
    this.breaker.on('close', () =>
      console.log('Kafka circuit breaker is CLOSED'),
    );

    // Retry Axios setup
    axiosRetry(axios, { retries: 3 });
  }

  async findAll(): Promise<Tweet[]> {
    return this.tweetModel.find().exec();
  }

  async create(createTweetDto: {
    content: string;
    authorId: number;
  }): Promise<void> {
    // Validate the user using the circuit breaker
    await this.validateUserWithCircuitBreaker(createTweetDto.authorId);

    const followerCount = await this.getFollowerCount(createTweetDto.authorId);

    if (followerCount < this.followerThreshold) {
      // Push model: Save to both Redis and MongoDB
      await this.saveTweetToCacheAndDB(createTweetDto);
    } else {
      // Pull model: Save only to MongoDB
      await this.saveTweetToDB(createTweetDto);
    }

    // 1. Publish the tweet to Kafka first
    await this.publishTweetCreatedEvent(createTweetDto);

    console.log('Tweet published to Kafka successfully');
  }

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

  // Method to publish the tweet-created event, with DLQ handling on failure
  private async publishTweetCreatedEvent(createTweetDto: any) {
    try {
      // Use the circuit breaker to send the message
      await this.breaker.fire(createTweetDto);
    } catch (error) {
      console.error('Circuit breaker failed, sending to DLQ:', error.message);
      await this.handleDLQ(createTweetDto); // Send to DLQ on failure
    }
  }

  // Helper to persist in both Redis and MongoDB
  private async saveTweetToCacheAndDB(tweet: any) {
    try {
      // Save to MongoDB
      const newTweet = new this.tweetModel(tweet);
      await newTweet.save();

      // Save to Redis
      await this.redisService.set(
        `tweet:${newTweet._id}`,
        JSON.stringify(newTweet),
      );

      console.log('Tweet saved to both Redis and MongoDB');
    } catch (error) {
      console.error('Error saving tweet to Redis and MongoDB:', error.message);
      throw error;
    }
  }

  // Helper to persist only in MongoDB
  private async saveTweetToDB(tweet: any) {
    try {
      const newTweet = new this.tweetModel(tweet);
      await newTweet.save();
      console.log('Tweet saved to MongoDB');
    } catch (error) {
      console.error('Error saving tweet to MongoDB:', error.message);
      throw error;
    }
  }

  // DLQ handling when Kafka publishing fails
  private async handleDLQ(tweet: Tweet) {
    try {
      console.log('Sending message to DLQ...');
      await this.kafkaProducer.connect();
      await this.kafkaProducer.send({
        topic: 'tweet-created-dlq',
        messages: [
          {
            value: JSON.stringify({
              tweetId: tweet._id,
              content: tweet.content,
              authorId: tweet.authorId,
              createdAt: tweet.createdAt,
            }),
          },
        ],
      });
      console.log('Message sent to DLQ');
    } catch (dlqError) {
      console.error('Failed to send message to DLQ:', dlqError.message);
    } finally {
      await this.kafkaProducer.disconnect();
    }
  }

  // Main method to publish events to Kafka, using retry and circuit breaker
  private async publishWithRetry(createTweetDto: any) {
    try {
      await this.kafkaProducer.connect();
      await this.kafkaProducer.send({
        topic: 'tweet-created',
        messages: [
          {
            value: JSON.stringify(createTweetDto),
          },
        ],
      });
      console.log('Message sent to Kafka');
    } catch (error) {
      console.error('Error publishing to Kafka:', error.message);
      throw error;
    } finally {
      await this.kafkaProducer.disconnect();
    }
  }

  // Regular method for calling the user-service API
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
      throw this.handleAxiosError(error, authorId);
    }
  }

  // Helper method to handle Axios errors
  private handleAxiosError(error: any, authorId: number) {
    if (error.response && error.response.status === 404) {
      return new HttpException(
        `User with ID ${authorId} not found`,
        HttpStatus.NOT_FOUND,
      );
    } else if (error.response && error.response.data) {
      return new HttpException(
        error.response.data.message,
        error.response.status,
      );
    } else {
      return new HttpException(
        'Failed to connect to User Service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Create a Circuit Breaker for the validateUser method
  private async validateUserWithCircuitBreaker(
    authorId: number,
  ): Promise<void> {
    const circuitBreakerOptions = {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
    };

    const validateUserBreaker = new CircuitBreaker(
      this.validateUser.bind(this),
      circuitBreakerOptions,
    );

    validateUserBreaker.on('open', () =>
      console.log('Circuit breaker for validateUser is OPEN'),
    );
    validateUserBreaker.on('halfOpen', () =>
      console.log('Circuit breaker for validateUser is HALF-OPEN'),
    );
    validateUserBreaker.on('close', () =>
      console.log('Circuit breaker for validateUser is CLOSED'),
    );

    try {
      await validateUserBreaker.fire(authorId);
    } catch (error) {
      const detailedError =
        error instanceof HttpException ? error.getResponse() : error.message;
      throw new HttpException(
        `User validation failed: ${detailedError}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // Method to get follower count
  private async getFollowerCount(authorId: number): Promise<number> {
    try {
      const response = await axios.get(
        `http://user-service:3000/users/${authorId}/followers/count`,
      );
      return response.data.count;
    } catch (error) {
      console.error('Error getting follower count:', error.message);
      return 0; // Fallback to 0 if the API call fails
    }
  }
}
