import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { GetFollowingDto } from '../dto/get-following.dto';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  createUser({ authId, username, email }: CreateUserDto) {
    const user = new this.userModel({
      authId,
      username,
      email,
    });

    return user.save();
  }

  followUser({
    user,
    targetUser,
  }: {
    user: UserDocument;
    targetUser: UserDocument;
  }) {
    return Promise.all([
      // Add to current user's following list
      this.userModel.findOneAndUpdate(user._id, {
        $push: { following: targetUser._id },
        $inc: { followingCount: 1 },
      }),
      // Add to target user's followers list
      this.userModel.findOneAndUpdate(targetUser._id, {
        $push: { followers: user._id },
        $inc: { followersCount: 1 },
      }),
    ]);
  }

  unfollowUser({
    user,
    targetUser,
  }: {
    user: UserDocument;
    targetUser: UserDocument;
  }) {
    return Promise.all([
      // Remove from current user's following list
      this.userModel.findOneAndUpdate(user._id, {
        $pull: { following: targetUser._id },
        $inc: { followingCount: -1 },
      }),
      // Remove from target user's followers list
      this.userModel.findOneAndUpdate(targetUser._id, {
        $pull: { followers: user._id },
        $inc: { followersCount: -1 },
      }),
    ]);
  }

  getFollowing({ authId, page = 1, limit = 20 }: GetFollowingDto) {
    return this.userModel
      .findOne({ authId })
      .populate({
        path: 'following',
        select: 'username email followersCount',
        options: {
          skip: (page - 1) * limit,
          limit: limit,
        },
      })
      .exec();
  }

  findAll() {
    return this.userModel
      .find()
      .select('username email followersCount followingCount')
      .exec();
  }

  findByAuthId(authId: string) {
    return this.userModel.findOne({ authId }).exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findByUsername(username: string) {
    return this.userModel.findOne({ username }).exec();
  }
}
