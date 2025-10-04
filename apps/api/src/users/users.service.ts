import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { FollowUserDto } from './dto/follow-user.dto';
import { GetProfileDto } from './dto/get-profile.dto';
import { UnfollowUserDto } from './dto/unfollow-user.dto';
import { GetFollowingDto } from './dto/get-following.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(createUserDto: CreateUserDto) {
    const savedUser = await this.usersRepository.createUser(createUserDto);

    return {
      id: savedUser._id.toString(),
      username: savedUser.username,
      email: savedUser.email,
    };
  }

  async followUser({ authId, targetUserId }: FollowUserDto) {
    if (authId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const [user, targetUser] = await Promise.all([
      this.usersRepository.findByAuthId(authId),
      this.usersRepository.findById(targetUserId),
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    if (user.following.includes(targetUser._id)) {
      throw new BadRequestException('Already following this user');
    }

    // Update both users atomically
    await this.usersRepository.followUser({ user, targetUser });

    return { message: 'Successfully followed user' };
  }

  async unfollowUser({ authId, targetUserId }: UnfollowUserDto) {
    if (authId === targetUserId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    const [user, targetUser] = await Promise.all([
      this.usersRepository.findByAuthId(authId),
      this.usersRepository.findById(targetUserId),
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if actually following
    if (!user.following.includes(targetUser._id)) {
      throw new BadRequestException('Not following this user');
    }

    // Update both users atomically
    await this.usersRepository.unfollowUser({ user, targetUser });

    return { message: 'Successfully unfollowed user' };
  }

  async getFollowing({ authId, page = 1, limit = 20 }: GetFollowingDto) {
    const user = await this.usersRepository.getFollowing({
      authId,
      page,
      limit,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      following: user.following,
      total: user.followingCount,
      page,
      limit,
    };
  }

  async getProfile({ authId, targetUserId }: GetProfileDto) {
    const targetUser = await this.usersRepository.findById(targetUserId);
    const currentUser = await this.usersRepository.findByAuthId(authId);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    return {
      id: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      followersCount: targetUser.followersCount,
      isFollowing: currentUser
        ? targetUser.followers.some(
            (id) => id.toString() === currentUser._id.toString(),
          )
        : false,
    };
  }

  findAll() {
    return this.usersRepository.findAll();
  }
}
