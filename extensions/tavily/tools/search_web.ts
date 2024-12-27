import { DynamicTool } from "@langchain/core/tools";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

export const searchWeb = new DynamicTool({
  name: "search_web",
  description: "Search the web for current information using Tavily API. Input should be a search query string.",
  func: async (input: string) => {
    try {
      const search = new TavilySearchResults({
        apiKey: process.env.TAVILY_API_KEY,
        maxResults: 5,
      });

      const results = await search.invoke(input);
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error('Error searching web:', error);
      throw new Error('Failed to search web');
    }
  }
}); 