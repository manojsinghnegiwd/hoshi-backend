import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { authenticate } from '../utils/googleAuth';

// Define the input schema for the tool
const inputSchema = z.object({
  doc_id: z.string().describe("The ID of the Google Doc to update"),
  content: z.string().describe("The new content to update in the Google Doc")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean().describe("Whether the update was successful"),
  lastModified: z.string().describe("When the doc was last modified")
});

export const updateGoogleDoc = tool(async ({ doc_id, content }) => {
  try {
    // Authenticate with Google
    const auth = await authenticate();
    const docs = google.docs({ version: 'v1', auth });

    // Get the current document to check if it exists
    const document = await docs.documents.get({
      documentId: doc_id
    });

    // Clear the existing content
    const endIndex = document.data.body?.content?.[document.data.body.content.length - 1]?.endIndex || 1;
    
    await docs.documents.batchUpdate({
      documentId: doc_id,
      requestBody: {
        requests: [
          // Delete all existing content
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex
              }
            }
          },
          // Insert new content
          {
            insertText: {
              location: {
                index: 1
              },
              text: content
            }
          }
        ]
      }
    });

    // Get the updated document to get the last modified time
    const updatedDoc = await docs.documents.get({
      documentId: doc_id
    });

    // Validate and return the output
    return outputSchema.parse({
      success: true,
      lastModified: updatedDoc.data.modifiedTime || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating Google Doc:', error);
    throw new Error(`Failed to update Google Doc: ${error.message}`);
  }
}, {
  name: "update_google_doc",
  description: "Update the content of an existing Google Doc",
  schema: inputSchema,
}); 