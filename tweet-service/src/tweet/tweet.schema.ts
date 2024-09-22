import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Tweet extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  authorId: number;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TweetSchema = SchemaFactory.createForClass(Tweet);
