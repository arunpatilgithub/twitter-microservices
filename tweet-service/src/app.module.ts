import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TweetModule } from './tweet/tweet.module'; // Ensure TweetModule is correctly imported

// Add logs before each module to ensure they are imported correctly
console.log('MongooseModule:', MongooseModule); // This should log the MongooseModule object
console.log('TweetModule:', TweetModule); // This should log the TweetModule object (check for undefined)

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URL || 'mongodb://localhost:27017/tweetdb',
    ),
    TweetModule,
  ],
})
export class AppModule {}
