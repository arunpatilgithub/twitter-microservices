import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { Kafka } from 'kafkajs';
import { Newsfeed } from './newsfeed.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class NewsfeedService implements OnModuleInit {
  constructor(
    @InjectModel('Newsfeed') private readonly newsfeedModel: Model<Newsfeed>,
  ) {}

  async onModuleInit() {
    await this.consumeTweetCreatedEvents();
  }

  private async consumeTweetCreatedEvents() {
    const kafka = new Kafka({
      clientId: 'newsfeed-service',
      brokers: ['kafka:9092'],
    });

    const consumer = kafka.consumer({ groupId: 'newsfeed' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'tweet-created', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          // Parse tweet data from Kafka message
          const tweetData = JSON.parse(message.value.toString());
          console.log('New Tweet received:', tweetData);

          // Validate tweetId
          if (!tweetData.tweetId) {
            throw new Error('tweetId is missing in the payload');
          }

          // Save to MongoDB
          const newsfeedEntry = new this.newsfeedModel({
            userId: tweetData.authorId, // The user ID that follows the author
            tweetId: tweetData.tweetId, // Correct field for Tweet ID
            content: tweetData.content, // Content of the tweet
            authorId: tweetData.authorId, // Author ID of the tweet
            createdAt: tweetData.createdAt, // Timestamp when the tweet was created
          });

          await newsfeedEntry.save();
          console.log(
            `Tweet saved to newsfeed for user: ${tweetData.authorId}`,
          );
        } catch (error) {
          console.error('Error processing tweet-created event:', error.message);
        }
      },
    });
  }

  async getNewsfeedForUser(userId: number) {
    return this.newsfeedModel.find({ userId }).exec();
  }

  async getNewsFeed(userId: string): Promise<any> {
    const followingUsers = await this.getFollowingUsers(userId);

    const tweets = await this.getTweetsFromFollowedUsers(followingUsers);

    return tweets.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async getFollowingUsers(userId: string): Promise<number[]> {
    try {
      const response = await axios.get(
        `http://user-service:3001/users/${userId}/following`,
      );
      return response.data;
    } catch (error) {
      return [];
    }
  }

  private async getTweetsFromFollowedUsers(userIds: number[]): Promise<any[]> {
    const tweets: any[] = [];

    for (const userId of userIds) {
      try {
        const response = await axios.get(
          `http://tweet-service:3000/tweets?authorId=${userId}`,
        );
        tweets.push(...response.data);
      } catch (error) {
        // Ignore error, proceed to the next user
      }
    }

    return tweets;
  }
}
