import { Test, TestingModule } from '@nestjs/testing';
import { NewsfeedService } from './newsfeed.service';

describe('NewsfeedService', () => {
  let service: NewsfeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsfeedService],
    }).compile();

    service = module.get<NewsfeedService>(NewsfeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
