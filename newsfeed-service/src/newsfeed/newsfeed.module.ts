import { Module } from '@nestjs/common';
import { NewsfeedService } from './newsfeed.service';
import { NewsfeedController } from './newsfeed.controller';

@Module({
  providers: [NewsfeedService],
  controllers: [NewsfeedController]
})
export class NewsfeedModule {}
