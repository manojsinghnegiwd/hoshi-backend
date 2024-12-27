import { createPost } from './tools/create_post';
import { analyzeContent } from './tools/analyze_content';
import { manageCategories } from './tools/manage_categories';
import { managePostStatus } from './tools/manage_post_status';
import { searchPosts } from './tools/search_posts';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the wordpress-website extension directory
dotenv.config({ path: path.join(__dirname, '.env') });

export const wordpressExtension = {
  name: "wordpress-website",
  description: "Manage and post content to a WordPress site",
  type: "extension",
  config: {
    siteUrl: process.env.WP_SITE_URL,
    username: process.env.WP_USERNAME,
    password: process.env.WP_APP_PASSWORD,
  },
  tools: [
    createPost,
    analyzeContent,
    manageCategories,
    managePostStatus,
    searchPosts
  ]
};

export default wordpressExtension; 