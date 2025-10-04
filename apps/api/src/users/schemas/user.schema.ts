import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { ProfilePicture, ProfilePictureSchema } from './profile-picture.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true, unique: true, index: true })
  authId: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({
    type: [ProfilePictureSchema],
    default: [],
    validate: [arrayLimit, '{PATH} exceeds the limit of 5'],
  })
  profilePictures: ProfilePicture[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
  following: mongoose.Types.ObjectId[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
  followers: mongoose.Types.ObjectId[];

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ default: new Date() })
  createdAt: Date;

  @Prop({ default: new Date() })
  updatedAt: Date;
}

function arrayLimit(val: ProfilePicture[]) {
  return val.length <= 5;
}

export const UserSchema = SchemaFactory.createForClass(User);
