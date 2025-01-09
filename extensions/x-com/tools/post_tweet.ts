import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { client } from '../utils/client';

// Define the input schema for the tool
const inputSchema = z.object({
  text: z.string()
    .max(280, "Tweet cannot exceed 280 characters")
    .describe("The text content of the tweet")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  tweet_id: z.string().describe("ID of the posted tweet"),
  text: z.string().describe("Content of the posted tweet")
});

export const postTweet = tool(async ({ text }) => {
  try {
    const tweet = await client.v2.tweet(text);
    
    return outputSchema.parse({
      success: true,
      tweet_id: tweet.data.id,
      text: tweet.data.text
    });
  } catch (error: unknown) {
    console.error('Error posting tweet:', error);
    throw new Error('Failed to post tweet: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "post_tweet",
  description: "Post a tweet to X (formerly Twitter). The tweet text must not exceed 280 characters.",
  schema: inputSchema,
}); 