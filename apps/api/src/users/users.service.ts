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
import { UploadService } from '../upload/upload.service';
import { ProfilePicture } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly uploadService: UploadService,
  ) {}

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
      id: targetUser._id?.toString() || '',
      username: targetUser.username,
      email: targetUser.email,
      profilePictures: targetUser.profilePictures || [],
      followersCount: targetUser.followersCount,
      isFollowing: currentUser
        ? targetUser.followers.some(
            (id) => id.toString() === currentUser._id.toString(),
          )
        : false,
    };
  }

  async findAll(authId: string) {
    const [allUsers, currentUser] = await Promise.all([
      this.usersRepository.findAll(),
      this.usersRepository.findByAuthId(authId),
    ]);

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    return allUsers.map((user) => ({
      _id: user._id?.toString() || '',
      authId: user.authId,
      username: user.username,
      email: user.email,
      profilePictures: user.profilePictures || [],
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      isFollowing: currentUser.following.some(
        (followingId) => followingId.toString() === user._id.toString(),
      ),
    }));
  }

  async addProfilePicture(authId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findByAuthId(authId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has 5 profile pictures
    const currentPictures = user.profilePictures || [];
    if (currentPictures.length >= 5) {
      throw new BadRequestException('Maximum of 5 profile pictures allowed');
    }

    // Upload new profile picture
    const profilePictureUrl =
      await this.uploadService.uploadProfilePicture(file);

    // Create profile picture object
    const profilePicture: ProfilePicture = {
      url: profilePictureUrl,
      isPrimary: currentPictures.length === 0, // First picture is primary
    };

    // Add to user's profile pictures array
    const updatedUser = await this.usersRepository.addProfilePicture(
      authId,
      profilePicture,
    );

    if (!updatedUser) {
      throw new NotFoundException('Failed to add profile picture');
    }

    return {
      id: updatedUser._id?.toString() || '',
      username: updatedUser.username,
      email: updatedUser.email,
      profilePictures: updatedUser.profilePictures || [],
      message: 'Profile picture added successfully',
    };
  }

  async removeProfilePicture(authId: string, profilePictureId: string) {
    const user = await this.usersRepository.findByAuthId(authId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the picture exists in user's profile pictures
    const userPictures = user.profilePictures || [];
    const pictureToRemove = userPictures.find(
      (pic) => pic._id?.toString() === profilePictureId,
    );
    if (!pictureToRemove) {
      throw new NotFoundException('Profile picture not found');
    }

    // Delete from Cloudinary
    await this.uploadService.deleteProfilePicture(pictureToRemove.url);

    // Remove from user's profile pictures array
    const updatedUser = await this.usersRepository.removeProfilePicture(
      authId,
      profilePictureId,
    );

    if (!updatedUser) {
      throw new NotFoundException('Failed to remove profile picture');
    }

    // If the removed picture was the primary, set a new primary
    const remainingPictures = updatedUser.profilePictures || [];
    if (pictureToRemove.isPrimary && remainingPictures.length > 0) {
      await this.usersRepository.setPrimaryProfilePicture(
        authId,
        remainingPictures[0]._id?.toString() || '',
      );
    }

    return {
      id: updatedUser._id?.toString() || '',
      username: updatedUser.username,
      email: updatedUser.email,
      profilePictures: updatedUser.profilePictures || [],
      message: 'Profile picture removed successfully',
    };
  }

  async setPrimaryProfilePicture(authId: string, profilePictureId: string) {
    const user = await this.usersRepository.findByAuthId(authId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if the picture exists in user's profile pictures
    const userPictures = user.profilePictures || [];
    const pictureToSetPrimary = userPictures.find(
      (pic) => pic._id?.toString() === profilePictureId,
    );
    if (!pictureToSetPrimary) {
      throw new NotFoundException('Profile picture not found');
    }

    // Set as primary
    const updatedUser = await this.usersRepository.setPrimaryProfilePicture(
      authId,
      profilePictureId,
    );

    if (!updatedUser) {
      throw new NotFoundException('Failed to set primary profile picture');
    }

    return {
      id: updatedUser._id?.toString() || '',
      username: updatedUser.username,
      email: updatedUser.email,
      profilePictures: updatedUser.profilePictures || [],
      message: 'Primary profile picture updated successfully',
    };
  }
}
