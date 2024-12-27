import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { authenticate } from '../utils/googleAuth';

// Define the input schema for the tool
const inputSchema = z.object({
  limit: z.number().default(10).describe("Maximum number of docs to return"),
  search: z.string().default("").describe("Search query to filter docs")
});

// Define the output schema for the tool
const outputSchema = z.object({
  docs: z.array(z.object({
    id: z.string().describe("The ID of the Google Doc"),
    title: z.string().describe("The title of the Google Doc"),
    url: z.string().describe("The URL of the Google Doc"),
    lastModified: z.string().describe("When the doc was last modified")
  })).describe("List of Google Docs")
});

export const listGoogleDocs = tool(async ({ limit, search }) => {
  try {
    // Authenticate with Google
    const auth = await authenticate();
    const drive = google.drive({ version: 'v3', auth });

    // Build the query
    let query = "mimeType='application/vnd.google-apps.document'";
    if (search) {
      query += ` and name contains '${search}'`;
    }

    // List documents
    const response = await drive.files.list({
      q: query,
      pageSize: limit,
      fields: 'files(id, name, webViewLink, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });

    const docs = response.data.files?.map(file => ({
      id: file.id || '',
      title: file.name || '',
      url: file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`,
      lastModified: file.modifiedTime || new Date().toISOString()
    })) || [];

    // Validate and return the output
    return outputSchema.parse({
      docs
    });
  } catch (error) {
    console.error('Error listing Google Docs:', error);
    throw new Error(`Failed to list Google Docs: ${error.message}`);
  }
}, {
  name: "list_google_docs",
  description: "List Google Docs with optional search and limit",
  schema: inputSchema,
}); 