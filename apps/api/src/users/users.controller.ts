// users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // Create user
  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create({ clerkId: userId, ...createUserDto });
  }

  // Get all users
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Get user profile
  @Get(':targetUserId')
  getProfile(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') clerkId: string,
  ) {
    return this.usersService.getUserProfile({ clerkId, targetUserId });
  }

  // Follow a user
  @Post(':targetUserId/follow')
  followUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') clerkId: string,
  ) {
    return this.usersService.followUser({ clerkId, targetUserId });
  }

  // Unfollow a user
  @Delete(':targetUserId/unfollow')
  unfollowUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') clerkId: string,
  ) {
    return this.usersService.unfollowUser({ clerkId, targetUserId });
  }

  // Get following list
  @Get(':clerkId/following')
  getFollowing(
    @Param('clerkId') clerkId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.usersService.getFollowing({ clerkId, page, limit });
  }
}
