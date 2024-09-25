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
  async findAll(): Promise<Tweet[]> {
    try {
      return await this.tweetService.findAll();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve tweets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async create(
    @Body() createTweetDto: { content: string; authorId: number },
  ): Promise<Tweet> {
    try {
      // Handle tweet creation and hybrid push-pull logic in the service
      return await this.tweetService.create(createTweetDto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create tweet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    try {
      console.log(`Received delete request for tweet with id: ${id}`);
      await this.tweetService.delete(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete tweet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
