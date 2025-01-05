import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WordPressClient } from "../utils/wordpress_client";

// Define the input schema for the tool
const inputSchema = z.object({
  postId: z.number().describe("The ID of the WordPress post to delete")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  message: z.string().describe("Result message"),
  postId: z.number().describe("ID of the deleted post")
});

export const deletePost = tool(async ({ postId }) => {
  try {
    const client = new WordPressClient();
    await client.deletePost(postId);
    
    return outputSchema.parse({
      success: true,
      message: `Successfully deleted WordPress post`,
      postId
    });
  } catch (error: unknown) {
    console.error('Error deleting post:', error);
    throw new Error('Failed to delete post: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "delete_wordpress_post",
  description: "Delete a WordPress post by its ID",
  schema: inputSchema,
}); 