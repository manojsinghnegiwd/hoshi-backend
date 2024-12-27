import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { authenticate } from '../utils/googleAuth';

// Define the input schema for the tool
const inputSchema = z.object({
  doc_id: z.string().describe("The ID of the Google Doc to delete")
});

// Define the output schema for the tool
const outputSchema = z.object({
  success: z.boolean().describe("Whether the deletion was successful")
});

export const deleteGoogleDoc = tool(async ({ doc_id }) => {
  try {
    // Authenticate with Google
    const auth = await authenticate();
    const drive = google.drive({ version: 'v3', auth });

    // Delete the document using Drive API
    await drive.files.delete({
      fileId: doc_id
    });

    // Validate and return the output
    return outputSchema.parse({
      success: true
    });
  } catch (error) {
    console.error('Error deleting Google Doc:', error);
    throw new Error(`Failed to delete Google Doc: ${error.message}`);
  }
}, {
  name: "delete_google_doc",
  description: "Delete a Google Doc by its ID",
  schema: inputSchema,
}); 