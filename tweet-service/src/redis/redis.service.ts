import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client;

  async onModuleInit() {
    this.client = createClient({
      url: 'redis://redis:6379',
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
    console.log('Connected to Redis');
  }

  async set(key: string, value: any, ttlInSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttlInSeconds) {
      await this.client.set(key, serializedValue, { EX: ttlInSeconds });
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
