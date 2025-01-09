import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the wordpress-website extension directory
dotenv.config({ path: path.join(__dirname, '.env') });

import { Extension } from "../../agent";
import { Tool } from "@langchain/core/tools";
import { postTweet } from "./tools/post_tweet";
import { readTweets } from "./tools/read_tweets";
import { trendingHashtags } from "./tools/trending_hashtags";

const xComExtension: Extension = {
  name: "x-com",
  description: "Extension for interacting with X (Twitter) - post tweets, read tweets, and get trending topics",
  type: "social",
  tools: [postTweet, readTweets, trendingHashtags].map(tool => tool as unknown as Tool),
};

export default xComExtension;