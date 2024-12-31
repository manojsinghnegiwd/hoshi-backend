import { tool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer from 'puppeteer';

const inputSchema = z.object({
  url: z.string().url().describe("The URL to extract content from"),
  selectors: z.array(z.object({
    name: z.string().describe("Name of the content section"),
    selector: z.string().describe("CSS selector to extract content")
  })).default([]).describe("CSS selectors to extract specific content"),
  waitForSelector: z.string().optional().describe("CSS selector to wait for before extraction")
});

const outputSchema = z.object({
  success: z.boolean(),
  url: z.string(),
  title: z.string(),
  content: z.record(z.string(), z.string()),
  metadata: z.object({
    extractionTime: z.number()
  })
});

export const extractContent = tool(async ({ url, selectors, waitForSelector }) => {
  try {
    const startTime = Date.now();
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector);
      }

      const content = await page.evaluate((selectors) => {
        const extractedContent: Record<string, string> = {};

        // Extract content for each selector
        selectors.forEach(({ name, selector }) => {
          const element = document.querySelector(selector);
          extractedContent[name] = element ? element.textContent?.trim() || '' : '';
        });

        // If no selectors provided, get main content
        if (selectors.length === 0) {
          extractedContent['main'] = document.body.innerText;
        }

        return {
          title: document.title,
          content: extractedContent
        };
      }, selectors);

      return outputSchema.parse({
        success: true,
        url,
        title: content.title,
        content: content.content,
        metadata: {
          extractionTime: Date.now() - startTime
        }
      });
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (error: unknown) {
    console.error('Error extracting content:', error);
    throw new Error('Failed to extract content: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "extract_content",
  description: "Extract specific content from a webpage using CSS selectors.",
  schema: inputSchema,
}); 