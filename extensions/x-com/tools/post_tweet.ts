import { DynamicTool } from "@langchain/core/tools";
import { TwitterApi } from 'twitter-api-v2';

export const postTweet = new DynamicTool({
  name: "post_tweet",
  description: "Post a tweet to X (formerly Twitter). Input should be the tweet text (max 280 characters).",
  func: async (input: string) => {
    try {
      const client = new TwitterApi({
        appKey: process.env.X_API_KEY!,
        appSecret: process.env.X_API_SECRET!,
        accessToken: process.env.X_ACCESS_TOKEN!,
        accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
      });

      const tweet = await client.v2.tweet(input);
      return JSON.stringify({
        success: true,
        tweet_id: tweet.data.id,
        text: tweet.data.text
      }, null, 2);
    } catch (error) {
      console.error('Error posting tweet:', error);
      throw new Error('Failed to post tweet');
    }
  }
}); 