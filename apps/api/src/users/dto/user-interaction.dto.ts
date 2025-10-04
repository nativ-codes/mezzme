import { IsString } from 'class-validator';

export class UserInteractionDto {
  @IsString()
  authId: string;

  @IsString()
  targetUserId: string;
}
