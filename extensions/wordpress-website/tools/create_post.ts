import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WordPressClient } from '../utils/wordpress_client';

// Define the input schema for the tool
const inputSchema = z.object({
  title: z.string().describe("Title of the post"),
  content: z.string().describe("Content of the post"),
  tags: z.array(z.string()).describe("List of tags to apply to the post"),
  categories: z.array(z.string()).describe("List of categories to apply to the post")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  post_id: z.number().describe("ID of the created post"),
  url: z.string().describe("URL of the created post"),
  title: z.string().describe("Title of the created post"),
  categories: z.array(z.string()).describe("Applied categories"),
  tags: z.array(z.string()).describe("Applied tags")
});

export const createPost = tool(async ({ title, content, tags, categories }) => {
  try {
    const client = new WordPressClient();

    // Create or get categories
    const categoryIds = await Promise.all(
      categories.map(async (cat: string) => {
        const existing = await client.findCategory(cat);
        if (existing) return existing.id;
        const newCat = await client.createCategory(cat);
        return newCat.id;
      })
    );

    // Create or get tags
    const tagIds = await Promise.all(
      tags.map(async (tag: string) => {
        const existing = await client.findTag(tag);
        if (existing) return existing.id;
        const newTag = await client.createTag(tag);
        return newTag.id;
      })
    );

    // Create the post
    const post = await client.createPost({
      title,
      content,
      status: 'draft',
      categories: categoryIds,
      tags: tagIds
    });

    const output = {
      success: true,
      post_id: post.id,
      url: post.link,
      title: post.title.rendered,
      categories,
      tags
    };

    return outputSchema.parse(output);
  } catch (error: unknown) {
    console.error('Error creating WordPress post:', error);
    throw new Error('Failed to create WordPress post: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "create_post",
  description: "Create a new post on WordPress site with the specified title, content, tags, and categories.",
  schema: inputSchema,
}); 