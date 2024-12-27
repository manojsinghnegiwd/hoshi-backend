import axios from 'axios';

interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  status: string;
  categories: number[];
  tags: number[];
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
}

interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export class WordPressClient {
  private baseUrl: string;
  private auth: { username: string; password: string };

  constructor() {
    this.baseUrl = `${process.env.WP_SITE_URL}/wp-json/wp/v2`;
    this.auth = {
      username: process.env.WP_USERNAME!,
      password: process.env.WP_APP_PASSWORD!
    };
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        auth: this.auth,
        data
      });
      return response.data;
    } catch (error) {
      console.error(`WordPress API error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  async createPost(data: {
    title: string;
    content: string;
    status?: string;
    categories?: number[];
    tags?: number[];
  }): Promise<WordPressPost> {
    return this.request<WordPressPost>('POST', '/posts', {
      title: data.title,
      content: data.content,
      status: data.status || 'draft',
      categories: data.categories || [],
      tags: data.tags || []
    });
  }

  async updatePost(postId: number, data: {
    title?: string;
    content?: string;
    status?: string;
    categories?: number[];
    tags?: number[];
  }): Promise<WordPressPost> {
    return this.request<WordPressPost>('PUT', `/posts/${postId}`, data);
  }

  async findCategory(name: string): Promise<WordPressCategory | null> {
    const categories = await this.request<WordPressCategory[]>('GET', `/categories?search=${encodeURIComponent(name)}`);
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async createCategory(name: string, options: {
    description?: string;
    parent?: number;
  } = {}): Promise<WordPressCategory> {
    return this.request<WordPressCategory>('POST', '/categories', {
      name,
      description: options.description || '',
      parent: options.parent || 0
    });
  }

  async updateCategory(id: number, data: {
    name?: string;
    description?: string;
    parent?: number;
  }): Promise<WordPressCategory> {
    return this.request<WordPressCategory>('PUT', `/categories/${id}`, data);
  }

  async listCategories(): Promise<WordPressCategory[]> {
    return this.request<WordPressCategory[]>('GET', '/categories?per_page=100');
  }

  async findTag(name: string): Promise<WordPressTag | null> {
    const tags = await this.request<WordPressTag[]>('GET', `/tags?search=${encodeURIComponent(name)}`);
    return tags.find(tag => tag.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async createTag(name: string): Promise<WordPressTag> {
    return this.request<WordPressTag>('POST', '/tags', { name });
  }

  async findPostByTitle(title: string): Promise<WordPressPost | null> {
    const posts = await this.request<WordPressPost[]>('GET', `/posts?search=${encodeURIComponent(title)}&status=draft,publish`);
    return posts.find(post => post.title.rendered.toLowerCase() === title.toLowerCase()) || null;
  }

  async searchPosts(params: {
    search?: string;
    status?: string[];
    perPage?: number;
  } = {}): Promise<WordPressPost[]> {
    const queryParams = new URLSearchParams();
    if (params.search) {
      queryParams.set('search', params.search);
    }
    if (params.status) {
      queryParams.set('status', params.status.join(','));
    }
    queryParams.set('per_page', String(params.perPage || 10));
    
    return this.request<WordPressPost[]>('GET', `/posts?${queryParams.toString()}`);
  }
} 