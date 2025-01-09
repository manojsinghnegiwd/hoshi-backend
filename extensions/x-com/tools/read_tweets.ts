import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { type TweetV2, type UserV2 } from 'twitter-api-v2';
import { client } from '../utils/client';

// Define the input schema for the tool
const inputSchema = z.object({
  query: z.string().describe("The search query to find tweets. Can include username, hashtags, or keywords"),
  limit: z.number().optional().describe("Maximum number of tweets to return (default: 10)")
});

// Define the output schema for the tool
const outputSchema = z.object({
  tweets: z.array(z.object({
    text: z.string(),
    author: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    metrics: z.record(z.any()).optional()
  }))
});

export const readTweets = tool(async ({ query, limit = 10 }) => {
  try {
    const tweets = await client.v2.search(query, {
      max_results: limit,
      "tweet.fields": ["created_at", "public_metrics"],
      expansions: ["author_id"],
      "user.fields": ["username", "name"]
    });

    if (!tweets.data) {
      return { tweets: [] };
    }

    const users = tweets.includes?.users?.reduce((acc: Record<string, UserV2>, user: UserV2) => {
      acc[user.id] = user;
      return acc;
    }, {}) || {};

    const formattedTweets = Array.isArray(tweets.data) ? tweets.data.map((tweet: TweetV2) => {
      const user = users[tweet.author_id!];
      return {
        text: tweet.text,
        author: `@${user?.username}`,
        name: user?.name,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics
      };
    }) : [];

    return outputSchema.parse({ tweets: formattedTweets });
  } catch (error: unknown) {
    throw new Error('Failed to read tweets: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "read_tweets",
  description: "Search and read tweets from X (Twitter) based on a query. Can search by username, hashtags, or keywords.",
  schema: inputSchema,
}); 