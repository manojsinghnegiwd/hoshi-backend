import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { authenticate } from '../utils/googleAuth';

// Define the input schema for the tool
const inputSchema = z.object({
  title: z.string().describe("The title of the new Google Doc"),
  content: z.string().default("").describe("The initial content of the Google Doc")
});

// Define the output schema for the tool
const outputSchema = z.object({
  id: z.string().describe("The ID of the created Google Doc"),
  url: z.string().describe("The URL of the created Google Doc")
});

export const createGoogleDoc = tool(async ({ title, content }) => {
  try {
    // Authenticate with Google
    const auth = await authenticate();
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create an empty document
    const document = await docs.documents.create({
      requestBody: {
        title: title,
      },
    });

    const documentId = document.data.documentId;

    if (!documentId) {
      throw new Error('Failed to create document: No document ID returned');
    }

    // If content is provided, update the document with the content
    if (content) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [{
            insertText: {
              location: {
                index: 1,
              },
              text: content,
            },
          }],
        },
      });
    }

    // Get the document URL
    const file = await drive.files.get({
      fileId: documentId,
      fields: 'webViewLink'
    });

    // Validate and return the output
    return outputSchema.parse({
      id: documentId,
      url: file.data.webViewLink || `https://docs.google.com/document/d/${documentId}/edit`
    });
  } catch (error) {
    console.error('Error creating Google Doc:', error);
    throw new Error(`Failed to create Google Doc: ${error.message}`);
  }
}, {
  name: "create_google_doc",
  description: "Create a new Google Doc with the specified title and optional content",
  schema: inputSchema,
}); 