import { tool } from "@langchain/core/tools";
import { z } from "zod";

const inputSchema = z.object({
  format: z.enum(['full', 'date', 'time', 'day', 'month', 'year'])
    .default('full')
    .describe("Format of the datetime information to return")
});

const outputSchema = z.object({
  full: z.string().describe("Full datetime string"),
  date: z.string().describe("Current date"),
  time: z.string().describe("Current time"),
  day: z.string().describe("Current day of the week"),
  month: z.string().describe("Current month"),
  year: z.string().describe("Current year"),
  timestamp: z.number().describe("Unix timestamp")
});

export const getCurrentDateTime = tool(async ({ format }) => {
  try {
    const now = new Date();
    const output = {
      full: now.toLocaleString(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      day: now.toLocaleDateString('en-US', { weekday: 'long' }),
      month: now.toLocaleDateString('en-US', { month: 'long' }),
      year: now.getFullYear().toString(),
      timestamp: now.getTime()
    };

    // If a specific format is requested, return only that information
    if (format !== 'full') {
      return { [format]: output[format] };
    }

    return outputSchema.parse(output);
  } catch (error: unknown) {
    console.error('Error getting datetime:', error);
    throw new Error('Failed to get datetime information: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "get_current_datetime",
  description: "Get current date and time information. Returns full datetime information by default, or specific parts if requested.",
  schema: inputSchema,
}); 