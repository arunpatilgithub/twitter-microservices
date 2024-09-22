import { Test, TestingModule } from '@nestjs/testing';
import { NewsfeedController } from './newsfeed.controller';

describe('NewsfeedController', () => {
  let controller: NewsfeedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsfeedController],
    }).compile();

    controller = module.get<NewsfeedController>(NewsfeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
