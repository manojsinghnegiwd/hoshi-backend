import { searchWeb } from './tools/search_web';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the tavily extension directory
dotenv.config({ path: path.join(__dirname, '.env') });

export const tavilyExtension = {
  name: "tavily",
  description: "Search the web for the latest information",
  type: "extension",
  config: {
    apiKey: process.env.TAVILY_API_KEY
  },
  tools: [
    searchWeb
  ]
};

export default tavilyExtension;