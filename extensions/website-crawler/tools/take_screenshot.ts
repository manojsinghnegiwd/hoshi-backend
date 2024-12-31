import { tool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

const inputSchema = z.object({
  url: z.string().url().describe("The URL to take screenshot of"),
  selector: z.string().optional().describe("CSS selector to screenshot specific element"),
  fullPage: z.boolean().default(false).describe("Whether to capture full page"),
  waitForSelector: z.string().optional().describe("CSS selector to wait for before screenshot")
});

const outputSchema = z.object({
  success: z.boolean(),
  url: z.string(),
  screenshotPath: z.string(),
  metadata: z.object({
    timestamp: z.number(),
    dimensions: z.object({
      width: z.number(),
      height: z.number()
    })
  })
});

export const takeScreenshot = tool(async ({ url, selector, fullPage, waitForSelector }) => {
  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector);
      }

      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Generate filename
      const timestamp = Date.now();
      const filename = `screenshot_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      // Take screenshot
      let dimensions;
      if (selector) {
        const element = await page.$(selector);
        if (!element) throw new Error(`Element not found: ${selector}`);
        await element.screenshot({ path: filepath });
        const box = await element.boundingBox();
        dimensions = { width: box?.width || 0, height: box?.height || 0 };
      } else {
        await page.screenshot({ path: filepath, fullPage });
        dimensions = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        }));
      }

      return outputSchema.parse({
        success: true,
        url,
        screenshotPath: filepath,
        metadata: {
          timestamp,
          dimensions
        }
      });
    } finally {
      await page.close();
      await browser.close();
    }
  } catch (error: unknown) {
    console.error('Error taking screenshot:', error);
    throw new Error('Failed to take screenshot: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "take_screenshot",
  description: "Take a screenshot of a webpage or specific element using a headless browser.",
  schema: inputSchema,
}); 