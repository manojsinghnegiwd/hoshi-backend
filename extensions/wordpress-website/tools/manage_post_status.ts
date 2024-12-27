import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WordPressClient } from '../utils/wordpress_client';

// Define the input schema for the tool
const inputSchema = z.object({
  postId: z.number().describe("ID of the post to update"),
  status: z.enum(['publish', 'draft']).describe("New status for the post")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  post_id: z.number().describe("ID of the updated post"),
  status: z.string().describe("New status of the post"),
  url: z.string().describe("URL of the post"),
  title: z.string().describe("Title of the post")
});

export const managePostStatus = tool(async ({ postId, status }) => {
  try {
    const client = new WordPressClient();
    const updatedPost = await client.updatePost(postId, { status });

    const output = {
      success: true,
      post_id: updatedPost.id,
      status: updatedPost.status,
      url: updatedPost.link,
      title: updatedPost.title.rendered
    };

    return outputSchema.parse(output);
  } catch (error: unknown) {
    console.error('Error managing post status:', error);
    throw new Error('Failed to update post status: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "manage_post_status",
  description: "Publish or unpublish a WordPress post by updating its status.",
  schema: inputSchema,
}); 