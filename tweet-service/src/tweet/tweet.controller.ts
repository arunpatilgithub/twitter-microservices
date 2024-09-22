import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Delete,
  Param,
} from '@nestjs/common';
import { TweetService } from './tweet.service';
import { Tweet } from './tweet.schema';

@Controller('tweets')
export class TweetController {
  constructor(private readonly tweetService: TweetService) {}

  @Get()
  findAll(): Promise<Tweet[]> {
    return this.tweetService.findAll();
  }

  @Post()
  async create(
    @Body() createTweetDto: { content: string; authorId: number },
  ): Promise<Tweet> {
    try {
      return await this.tweetService.create(createTweetDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    console.log(`Received delete request for tweet with id: ${id}`);
    await this.tweetService.delete(id);
  }
}
