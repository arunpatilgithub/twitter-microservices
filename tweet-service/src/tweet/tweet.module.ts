import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TweetService } from './tweet.service';
import { TweetController } from './tweet.controller';
import { Tweet, TweetSchema } from './tweet.schema';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tweet.name, schema: TweetSchema }]),
    RedisModule,
  ],
  providers: [TweetService],
  controllers: [TweetController],
})
export class TweetModule {}
