import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NewsfeedService {
  async getNewsFeed(userId: string): Promise<any> {
    // Step 1: Get the list of users the current user follows from the User Service
    const followingUsers = await this.getFollowingUsers(userId);

    // Step 2: Fetch tweets from those users using the Tweet Service
    const tweets = await this.getTweetsFromFollowedUsers(followingUsers);

    // Step 3: Sort the tweets by timestamp and return the result
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

    // Fetch tweets from each followed user (for now, dummy call to the Tweet Service)
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
