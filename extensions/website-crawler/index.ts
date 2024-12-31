import { crawlWebsite } from './tools/crawl_website';
import { extractContent } from './tools/extract_content';
import { takeScreenshot } from './tools/take_screenshot';

export const websiteCrawlerExtension = {
  name: "website-crawler",
  description: "Crawl and extract content from websites using headless browser",
  type: "extension",
  tools: [
    crawlWebsite,
    extractContent,
    takeScreenshot
  ]
};

export default websiteCrawlerExtension; 