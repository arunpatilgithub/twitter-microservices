import {
  Controller,
  Get,
  Post,
  Param,
  NotFoundException,
  Body,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Post()
  create(
    @Body() createUserDto: { name: string; email: string },
  ): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: number): Promise<User> {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  @Post(':id/follow/:followId')
  followUser(
    @Param('id') id: number,
    @Param('followId') followId: number,
  ): Promise<User> {
    return this.userService.followUser(id, followId);
  }

  @Delete(':id/follow/:followId')
  unfollowUser(
    @Param('id') id: number,
    @Param('followId') followId: number,
  ): Promise<User> {
    return this.userService.unfollowUser(id, followId);
  }

  @Get(':id/following')
  getFollowing(@Param('id') id: number): Promise<number[]> {
    return this.userService.getFollowing(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.userService.delete(id);
  }
}
