import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export class ProfilePicture {
  _id?: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

export const ProfilePictureSchema =
  SchemaFactory.createForClass(ProfilePicture);
