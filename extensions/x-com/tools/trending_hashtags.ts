import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { client } from '../utils/client';

// Define the input schema for the tool
const inputSchema = z.object({
  limit: z.number().optional().describe("Maximum number of trending topics to return (default: 20)")
});

// Define the output schema for the tool
const outputSchema = z.object({
  trends: z.array(z.object({
    name: z.string(),
    tweet_volume: z.number().nullable(),
    url: z.string()
  }))
});

interface Trend {
  name: string;
  tweet_volume: number | null;
  url: string;
}

export const trendingHashtags = tool(async ({ limit = 20 }) => {
  try {
    const trends = await client.v1.trendsByPlace(1); // 1 is the WOEID for worldwide

    if (!trends?.[0]?.trends) {
      return outputSchema.parse({ trends: [] });
    }

    const formattedTrends = trends[0].trends
      .slice(0, limit)
      .map((trend): Trend => ({
        name: trend.name,
        tweet_volume: trend.tweet_volume,
        url: trend.url
      }))
      .sort((a: Trend, b: Trend) => ((b.tweet_volume || 0) - (a.tweet_volume || 0)));

    return outputSchema.parse({ trends: formattedTrends });
  } catch (error: unknown) {
    throw new Error('Failed to get trending hashtags: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "trending_hashtags",
  description: "Get worldwide trending hashtags and topics from X (Twitter).",
  schema: inputSchema,
}); 