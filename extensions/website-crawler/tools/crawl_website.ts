import { tool } from "@langchain/core/tools";
import { z } from "zod";
import puppeteer from 'puppeteer';

const inputSchema = z.object({
  url: z.string().url().describe("The website URL to crawl"),
  maxDepth: z.number().min(1).max(1).default(1).describe("Maximum depth of links to follow"),
  maxPages: z.number().min(1).max(1).default(1).describe("Maximum number of pages to crawl"),
  allowedDomains: z.array(z.string()).optional().describe("List of allowed domains to crawl")
});

const outputSchema = z.object({
  success: z.boolean(),
  pages: z.array(z.object({
    url: z.string(),
    title: z.string(),
    links: z.array(z.string()),
    text: z.string()
  })),
  stats: z.object({
    totalPages: z.number(),
    totalLinks: z.number(),
    crawlTime: z.number()
  })
});

export const crawlWebsite = tool(async ({ url, maxDepth, maxPages, allowedDomains }) => {
  try {
    const startTime = Date.now();
    const browser = await puppeteer.launch({ headless: false });
    const visitedUrls = new Set<string>();
    const pages: any[] = [];

    async function crawl(pageUrl: string, depth: number) {
      if (
        depth > maxDepth || 
        visitedUrls.size >= maxPages || 
        visitedUrls.has(pageUrl)
      ) return;

      // Check if domain is allowed
      const urlObj = new URL(pageUrl);
      if (allowedDomains && !allowedDomains.includes(urlObj.hostname)) return;

      visitedUrls.add(pageUrl);
      const page = await browser.newPage();

      try {
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });
        
        const pageData = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'))
            .map(link => link.href)
            .filter(href => href.startsWith('http'));

          return {
            url: window.location.href,
            title: document.title,
            links,
            text: document.body.innerText
          };
        });

        pages.push(pageData);

        // Recursively crawl linked pages
        for (const link of pageData.links) {
          if (visitedUrls.size < maxPages) {
            await crawl(link, depth + 1);
          }
        }
      } catch (error) {
        console.error(`Error crawling ${pageUrl}:`, error);
      } finally {
        await page.close();
      }
    }

    await crawl(url, 1);
    await browser.close();

    const totalLinks = pages.reduce((sum, page) => sum + page.links.length, 0);
    
    return outputSchema.parse({
      success: true,
      pages,
      stats: {
        totalPages: pages.length,
        totalLinks,
        crawlTime: Date.now() - startTime
      }
    });
  } catch (error: unknown) {
    console.error('Error crawling website:', error);
    throw new Error('Failed to crawl website: ' + (error instanceof Error ? error.message : String(error)));
  }
}, {
  name: "crawl_website",
  description: "Crawl a website and extract content from its pages using a headless browser.",
  schema: inputSchema,
}); 