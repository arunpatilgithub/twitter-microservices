import { Schema, Document } from 'mongoose';

export interface Newsfeed extends Document {
  userId: number;
  tweetId: string;
  content: string;
  authorId: number;
  createdAt: Date;
}

export const NewsfeedSchema = new Schema({
  userId: { type: Number, required: true },
  tweetId: { type: String, required: true },
  content: { type: String, required: true },
  authorId: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});
