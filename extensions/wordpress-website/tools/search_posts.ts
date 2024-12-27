import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WordPressClient } from '../utils/wordpress_client';

// Define the input schema for the tool
const inputSchema = z.object({
  query: z.string().optional().describe("Search term to find posts"),
  status: z.array(z.enum(['publish', 'draft'])).default(['draft', 'publish']).describe("Post status to filter by"),
  perPage: z.number().default(10).describe("Number of posts to return")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  count: z.number().describe("Number of posts found"),
  posts: z.array(z.object({
    id: z.number().describe("Post ID"),
    title: z.string().describe("Post title"),
    content: z.string().describe("Post content"),
    url: z.string().describe("Post URL"),
    status: z.string().describe("Post status")
  }))
});

export const searchPosts = tool(async ({ query, status, perPage }) => {
  try {
    const client = new WordPressClient();
    const posts = await client.searchPosts({
      search: query,
      status: status,
      perPage: perPage
    });

    const output = {
      success: true,
      count: posts.length,
      posts: posts.map(post => ({
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        url: post.link,
        status: post.status
      }))
    };

    return outputSchema.parse(output);
  } catch (error: unknown) {
    console.error('Error searching WordPress posts:', error);
    throw new Error('Failed to search posts: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "search_posts",
  description: "Search WordPress posts by title or content. If no title or content is provided, search all posts.",
  schema: inputSchema,
}); 