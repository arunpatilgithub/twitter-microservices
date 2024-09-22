import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsfeedController } from './newsfeed.controller';
import { NewsfeedService } from './newsfeed.service';
import { NewsfeedSchema } from './newsfeed.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Newsfeed', schema: NewsfeedSchema }]),
  ],
  controllers: [NewsfeedController],
  providers: [NewsfeedService],
})
export class NewsfeedModule {}
