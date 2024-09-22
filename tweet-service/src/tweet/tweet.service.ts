import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tweet } from './tweet.schema';
import axios from 'axios';
import { Kafka } from 'kafkajs';

@Injectable()
export class TweetService {
  constructor(@InjectModel(Tweet.name) private tweetModel: Model<Tweet>) {}

  async findAll(): Promise<Tweet[]> {
    return this.tweetModel.find().exec();
  }

  async create(createTweetDto: {
    content: string;
    authorId: number;
  }): Promise<Tweet> {
    await this.validateUser(createTweetDto.authorId);

    const newTweet = new this.tweetModel(createTweetDto);
    const tweet = await newTweet.save();

    await this.publishTweetCreatedEvent(tweet);

    return tweet;
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

  private async publishTweetCreatedEvent(tweet: Tweet) {
    const kafka = new Kafka({
      clientId: 'twitter',
      brokers: ['kafka:9092'],
    });

    const producer = kafka.producer();
    await producer.connect();

    await producer.send({
      topic: 'tweet-created',
      messages: [
        {
          value: JSON.stringify({
            id: tweet._id,
            content: tweet.content,
            authorId: tweet.authorId,
            createdAt: tweet.createdAt,
          }),
        },
      ],
    });

    await producer.disconnect();
  }
}
