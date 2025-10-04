import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Create user
  @Post()
  create(
    @CurrentUser('authId') authId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createUser({
      authId,
      ...createUserDto,
    });
  }

  // Get all users
  @Get()
  findAll(@CurrentUser('authId') authId: string) {
    return this.usersService.findAll(authId);
  }

  // Get user profile
  @Get(':targetUserId')
  getProfile(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('authId') authId: string,
  ) {
    return this.usersService.getProfile({ authId, targetUserId });
  }

  // Follow a user
  @Post(':targetUserId/follow')
  followUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('authId') authId: string,
  ) {
    return this.usersService.followUser({ authId, targetUserId });
  }

  // Unfollow a user
  @Delete(':targetUserId/unfollow')
  unfollowUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('authId') authId: string,
  ) {
    return this.usersService.unfollowUser({ authId, targetUserId });
  }

  // Get following list
  @Get(':authId/following')
  getFollowing(
    @Param('authId') authId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.usersService.getFollowing({ authId, page, limit });
  }

  // Add profile picture
  @Post('profile-pictures')
  @UseInterceptors(FileInterceptor('profilePicture'))
  addProfilePicture(
    @CurrentUser('authId') authId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.addProfilePicture(authId, file);
  }

  // Remove profile picture
  @Delete('profile-pictures')
  removeProfilePicture(
    @CurrentUser('authId') authId: string,
    @Body('profilePictureId') profilePictureId: string,
  ) {
    return this.usersService.removeProfilePicture(authId, profilePictureId);
  }

  // Set primary profile picture
  @Post('profile-pictures/primary')
  setPrimaryProfilePicture(
    @CurrentUser('authId') authId: string,
    @Body('profilePictureId') profilePictureId: string,
  ) {
    return this.usersService.setPrimaryProfilePicture(authId, profilePictureId);
  }
}
