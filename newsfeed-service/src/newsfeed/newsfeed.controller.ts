import { Controller, Get, Param } from '@nestjs/common';
import { NewsfeedService } from './newsfeed.service';

@Controller('newsfeed')
export class NewsfeedController {
  constructor(private readonly newsfeedService: NewsfeedService) {}

  @Get(':userId')
  getNewsFeed(@Param('userId') userId: string) {
    return this.newsfeedService.getNewsFeed(userId);
  }
}
