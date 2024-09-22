import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { Client, ApiResponse } from '@elastic/elasticsearch';

interface TweetSource {
  content: string;
  authorId: number;
  createdAt: string;
}

interface SearchHit {
  _source: TweetSource;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly elasticsearchClient: Client;

  constructor() {
    this.elasticsearchClient = new Client({
      node: process.env.ELASTICSEARCH_HOST,
    });
  }

  async onModuleInit() {
    await this.consumeTweetCreatedEvents();
  }

  private async consumeTweetCreatedEvents() {
    const kafka = new Kafka({
      clientId: 'search-service',
      brokers: [process.env.KAFKA_BROKER],
    });

    const consumer = kafka.consumer({ groupId: 'search-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'tweet-created', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const tweetData = JSON.parse(message.value.toString());
        console.log('Indexing new tweet:', tweetData);
        await this.indexTweet(tweetData);
      },
    });
  }

  private async indexTweet(tweet: any) {
    await this.elasticsearchClient.index({
      index: 'tweets',
      id: tweet.id,
      body: {
        content: tweet.content,
        authorId: tweet.authorId,
        createdAt: tweet.createdAt,
      },
    });
  }

  async searchTweets(query: string): Promise<TweetSource[]> {
    const result = (await this.elasticsearchClient.search({
      index: 'tweets',
      body: {
        query: {
          match: { content: query },
        },
      },
    })) as ApiResponse<{ hits: { hits: SearchHit[] } }>;

    // Check if hits are available before mapping
    if (result.body.hits && result.body.hits.hits) {
      // Return the array of _source directly, which is of type TweetSource[]
      return result.body.hits.hits.map((hit) => hit._source);
    }

    // Return an empty array if no hits are found
    return [];
  }
}
