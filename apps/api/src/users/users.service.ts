import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  // Create user
  async create({
    clerkId,
    username,
    email,
  }: {
    clerkId: string;
    username: string;
    email: string;
  }) {
    const user = new this.userModel({
      clerkId,
      username,
      email,
    });

    const savedUser = await user.save();

    return {
      id: savedUser._id.toString(),
      username: savedUser.username,
      email: savedUser.email,
    };
  }

  // Get user by Clerk ID with basic info
  async findById(clerkId: string) {
    const user = await this.userModel.findOne({ clerkId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Follow a user
  async followUser({
    clerkId,
    targetUserId,
  }: {
    clerkId: string;
    targetUserId: string;
  }) {
    if (clerkId === targetUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const [user, targetUser] = await Promise.all([
      this.userModel.findOne({ clerkId }),
      this.userModel.findOne({ clerkId: targetUserId }),
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    if (user.following.includes(targetUser._id)) {
      throw new BadRequestException('Already following this user');
    }

    // Update both users atomically
    await Promise.all([
      // Add to current user's following list
      this.userModel.findOneAndUpdate(
        { clerkId },
        {
          $push: { following: targetUser._id },
          $inc: { followingCount: 1 },
        },
      ),
      // Add to target user's followers list
      this.userModel.findOneAndUpdate(
        { clerkId: targetUserId },
        {
          $push: { followers: user._id },
          $inc: { followersCount: 1 },
        },
      ),
    ]);

    return { message: 'Successfully followed user' };
  }

  // Unfollow a user
  async unfollowUser({
    clerkId,
    targetUserId,
  }: {
    clerkId: string;
    targetUserId: string;
  }) {
    if (clerkId === targetUserId) {
      throw new BadRequestException('Cannot unfollow yourself');
    }

    const [user, targetUser] = await Promise.all([
      this.userModel.findOne({ clerkId }),
      this.userModel.findOne({ clerkId: targetUserId }),
    ]);

    if (!user || !targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if actually following
    if (!user.following.includes(targetUser._id)) {
      throw new BadRequestException('Not following this user');
    }

    // Update both users atomically
    await Promise.all([
      // Remove from current user's following list
      this.userModel.findOneAndUpdate(
        { clerkId },
        {
          $pull: { following: targetUser._id },
          $inc: { followingCount: -1 },
        },
      ),
      // Remove from target user's followers list
      this.userModel.findOneAndUpdate(
        { clerkId: targetUserId },
        {
          $pull: { followers: user._id },
          $inc: { followersCount: -1 },
        },
      ),
    ]);

    return { message: 'Successfully unfollowed user' };
  }

  // Get following list
  async getFollowing({
    clerkId,
    page = 1,
    limit = 20,
  }: {
    clerkId: string;
    page: number;
    limit: number;
  }) {
    const user = await this.userModel
      .findOne({ clerkId })
      .populate({
        path: 'following',
        select: 'username email followersCount',
        options: {
          skip: (page - 1) * limit,
          limit: limit,
        },
      })
      .exec();

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

  // Get user profile with follow stats
  async getUserProfile({
    clerkId,
    targetUserId,
  }: {
    clerkId: string;
    targetUserId: string;
  }) {
    const targetUser = await this.findById(targetUserId);
    const currentUser = await this.userModel.findOne({ clerkId }).exec();

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

  // Get all users (for testing)
  async findAll() {
    return this.userModel
      .find()
      .select('username email followersCount followingCount')
      .exec();
  }
}
