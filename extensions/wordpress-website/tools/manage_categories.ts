import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { WordPressClient, WordPressCategory } from '../utils/wordpress_client';

// Define the input schema for the tool
const inputSchema = z.object({
  action: z.enum(['list', 'create', 'update']).describe("Action to perform on categories"),
  name: z.string().optional().describe("Category name (required for create/update)"),
  description: z.string().optional().describe("Category description"),
  parent: z.number().optional().describe("Parent category ID"),
  categoryId: z.number().optional().describe("Category ID (required for update)")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean(),
  action: z.string().describe("Action performed"),
  categories: z.array(z.object({
    id: z.number().describe("Category ID"),
    name: z.string().describe("Category name"),
    description: z.string().describe("Category description"),
    parent: z.number().describe("Parent category ID"),
    count: z.number().describe("Number of posts in this category")
  })).describe("List of categories or the modified category")
});

export const manageCategories = tool(async ({ action, name, description, parent, categoryId }) => {
  try {
    const client = new WordPressClient();

    switch (action) {
      case 'list': {
        const categories = await client.listCategories();
        return outputSchema.parse({
          success: true,
          action: 'list',
          categories: categories.map((cat: WordPressCategory) => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            parent: cat.parent,
            count: cat.count
          }))
        });
      }

      case 'create': {
        if (!name) throw new Error('Name is required for creating a category');
        const newCategory = await client.createCategory(name, { description, parent });
        return outputSchema.parse({
          success: true,
          action: 'create',
          categories: [{
            id: newCategory.id,
            name: newCategory.name,
            description: newCategory.description,
            parent: newCategory.parent,
            count: newCategory.count
          }]
        });
      }

      case 'update': {
        if (!categoryId) throw new Error('Category ID is required for updating');
        const updatedCategory = await client.updateCategory(categoryId, { name, description, parent });
        return outputSchema.parse({
          success: true,
          action: 'update',
          categories: [{
            id: updatedCategory.id,
            name: updatedCategory.name,
            description: updatedCategory.description,
            parent: updatedCategory.parent,
            count: updatedCategory.count
          }]
        });
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Error managing categories:', error);
    throw new Error('Failed to manage categories: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "manage_categories",
  description: "Manage WordPress categories: list all categories, create new ones, or update existing ones.",
  schema: inputSchema,
}); 