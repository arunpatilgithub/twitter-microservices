import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(createUserDto: { name: string; email: string }): Promise<User> {
    const newUser = this.userRepository.create(createUserDto);
    return this.userRepository.save(newUser);
  }

  async followUser(userId: number, followId: number): Promise<User> {
    const user = await this.findOne(userId);
    const userToFollow = await this.findOne(followId);

    if (!user || !userToFollow) {
      throw new Error('User not found');
    }

    if (!user.followedUsers) {
      user.followedUsers = [];
    }
    if (!user.followedUsers.includes(followId)) {
      user.followedUsers.push(followId);
    }

    return this.userRepository.save(user);
  }

  async unfollowUser(userId: number, followId: number): Promise<User> {
    const user = await this.findOne(userId);

    if (!user || !user.followedUsers) {
      throw new Error('User not found or not following anyone');
    }

    user.followedUsers = user.followedUsers.filter((id) => id !== followId);

    return this.userRepository.save(user);
  }

  async getFollowing(userId: number): Promise<number[]> {
    const user = await this.findOne(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user.followedUsers || [];
  }

  async delete(id: number): Promise<void> {
    await this.userRepository.delete({ id });
  }
}
