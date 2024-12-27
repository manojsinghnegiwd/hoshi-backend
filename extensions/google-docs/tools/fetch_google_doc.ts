import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { google } from 'googleapis';
import { authenticate } from '../utils/googleAuth';

// Define the input schema for the tool
const inputSchema = z.object({
  doc_id: z.string().describe("The ID of the Google Doc to fetch")
});

// Define the output schema for the tool
const outputSchema = z.object({
  id: z.string().describe("The ID of the Google Doc"),
  title: z.string().describe("The title of the Google Doc"),
  content: z.string().describe("The plain text content of the Google Doc"),
  rawContent: z.any().describe("The raw content from Google Docs API"),
  lastModified: z.string().describe("When the doc was last modified")
});

export const fetchGoogleDoc = tool(async ({ doc_id }) => {
  try {
    // Authenticate with Google
    const auth = await authenticate();
    const docs = google.docs({ version: 'v1', auth });

    // Fetch document metadata
    const docMetadata = await docs.documents.get({
      documentId: doc_id
    });

    // Fetch document content
    const docContent = await docs.documents.get({
      documentId: doc_id,
      fields: 'body'
    });

    // Extract plain text from the document
    const content = extractPlainText(docContent.data.body);

    // Validate and return the output
    return outputSchema.parse({
      id: docMetadata.data.documentId,
      title: docMetadata.data.title,
      content,
      rawContent: docContent.data.body,
      lastModified: docMetadata.data.modifiedTime
    });
  } catch (error) {
    console.error('Error fetching Google Doc:', error);
    throw new Error(`Failed to fetch Google Doc: ${error.message}`);
  }
}, {
  name: "fetch_google_doc",
  description: "Fetch a Google Doc by its ID and return its content, raw content, and metadata",
  schema: inputSchema,
});

/**
 * Helper function to extract plain text from Google Doc body
 * @param body The document body from Google Docs API
 * @returns Plain text content of the document
 */
function extractPlainText(body: any): string {
  if (!body || !body.content) return '';

  let text = '';
  body.content.forEach((element: any) => {
    if (element.paragraph) {
      element.paragraph.elements.forEach((elem: any) => {
        if (elem.textRun) {
          text += elem.textRun.content;
        }
      });
    }
  });
  return text;
}
