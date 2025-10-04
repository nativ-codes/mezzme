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
    @CurrentUser('userId') authId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createUser({
      authId,
      ...createUserDto,
    });
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
    @CurrentUser('userId') authId: string,
  ) {
    return this.usersService.getProfile({ authId, targetUserId });
  }

  // Follow a user
  @Post(':targetUserId/follow')
  followUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') authId: string,
  ) {
    return this.usersService.followUser({ authId, targetUserId });
  }

  // Unfollow a user
  @Delete(':targetUserId/unfollow')
  unfollowUser(
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('userId') authId: string,
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
}
