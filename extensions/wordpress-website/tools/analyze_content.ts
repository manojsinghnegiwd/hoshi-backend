import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

// Define the input schema for the tool
const inputSchema = z.object({
  content: z.string().describe("The content to analyze"),
  title: z.string().optional().describe("Optional title of the content")
});

// Define the output schema for the tool
const outputSchema = z.object({
  categories: z.array(z.string()).describe("Suggested categories for the content"),
  tags: z.array(z.string()).describe("Suggested tags for the content"),
  summary: z.string().describe("A brief summary of the content"),
  seoTitle: z.string().describe("SEO-optimized title suggestion"),
  seoDescription: z.string().describe("SEO-optimized meta description")
});

export const analyzeContent = tool(async ({ content, title }) => {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0
    });

    const prompt = `Analyze the following ${title ? `article titled "${title}"` : 'content'}:

${content}

Please provide:
1. 3-5 relevant categories
2. 5-8 relevant tags
3. A brief summary (2-3 sentences)
4. SEO-optimized title suggestion
5. SEO-optimized meta description (under 160 characters)

Format your response as a JSON object with these keys: categories, tags, summary, seoTitle, seoDescription`;

    const response = await model.invoke([new HumanMessage(prompt)]);
    const responseContent = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    const analysis = JSON.parse(responseContent);

    return outputSchema.parse({
      categories: analysis.categories,
      tags: analysis.tags,
      summary: analysis.summary,
      seoTitle: analysis.seoTitle,
      seoDescription: analysis.seoDescription
    });
  } catch (error: unknown) {
    console.error('Error analyzing content:', error);
    throw new Error('Failed to analyze content: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "analyze_content",
  description: "Analyze content to suggest categories, tags, and generate SEO metadata. Only use this tool while creating a new post.",
  schema: inputSchema,
}); 