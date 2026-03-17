import axios, { AxiosError } from 'axios';

// Get API URL from environment variable or fallback to localhost
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Ensure API_BASE_URL points to /api
export const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export interface Article {
  title: string;
  content: string; // HTML content
  textContent: string;
  excerpt: string;
  byline: string;
  siteName: string;
  url: string;
}

export const api = {
  ping: async (): Promise<boolean> => {
    try {
      // Check root endpoint
      const res = await axios.get(API_BASE_URL.replace(/\/api$/, '/'));
      return typeof res.data === 'string'
        ? res.data.includes('FlowRead Backend')
        : true;
    } catch {
      return false;
    }
  },
  parseArticle: async (url: string): Promise<Article> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/parse`, { url });
      return response.data;
    } catch (err) {
      const error = err as AxiosError<any>;
      const status = error.response?.status;
      const detail =
        (error.response?.data as any)?.error ||
        (error.response?.data as any)?.message ||
        error.message ||
        'Unknown error';
      throw new Error(`Parse failed${status ? ` (HTTP ${status})` : ''}: ${detail}`);
    }
  },
};
