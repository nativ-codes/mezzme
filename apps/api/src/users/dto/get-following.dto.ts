import { IsNumber, IsString } from 'class-validator';

export class GetFollowingDto {
  @IsString()
  authId: string;

  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;
}
