import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Ensure this path is correct
import { NewsfeedModule } from './newsfeed/newsfeed.module'; // Ensure this path is correct

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://mongo:27017/newsfeeddb'),
    NewsfeedModule,
  ],
})
export class AppModule {}
