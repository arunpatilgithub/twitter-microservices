import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NewsfeedModule } from './newsfeed/newsfeed.module';

@Module({
  imports: [NewsfeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
