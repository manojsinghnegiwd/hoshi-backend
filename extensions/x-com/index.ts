import { postTweet } from './tools/post_tweet';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the x-com extension directory
dotenv.config({ path: path.join(__dirname, '.env') });

export const xComExtension = {
  name: "x-com",
  description: "Post and interact with X (formerly Twitter)",
  type: "extension",
  config: {
    apiKey: process.env.X_API_KEY,
    apiSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET
  },
  tools: [
    postTweet
  ]
};

export default xComExtension; 