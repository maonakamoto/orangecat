import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
  author?: string;
  published?: boolean;
  content: string;
}

const BLOG_POSTS_PATH = path.join(process.cwd(), 'content/blog');

// Ensure blog directory exists
function ensureBlogDirectory() {
  if (!fs.existsSync(BLOG_POSTS_PATH)) {
    fs.mkdirSync(BLOG_POSTS_PATH, { recursive: true });
  }
}

// Calculate reading time based on content
function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const time = Math.ceil(words / wordsPerMinute);
  return `${time} min read`;
}

// Get all blog post slugs
export function getBlogPostSlugs(): string[] {
  ensureBlogDirectory();

  if (!fs.existsSync(BLOG_POSTS_PATH)) {
    return [];
  }

  return fs
    .readdirSync(BLOG_POSTS_PATH)
    .filter(filename => filename.endsWith('.mdx'))
    .map(filename => filename.replace(/\.mdx$/, ''));
}

// Get a single blog post by slug
export function getBlogPost(slug: string): BlogPost | null {
  try {
    ensureBlogDirectory();

    const fullPath = path.join(BLOG_POSTS_PATH, `${slug}.mdx`);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || 'Untitled',
      excerpt: data.excerpt || '',
      date: data.date || new Date().toISOString().split('T')[0],
      readTime: data.readTime || calculateReadingTime(content),
      tags: data.tags || [],
      featured: data.featured || false,
      author: data.author || 'OrangeCat Team',
      published: data.published !== false,
      content,
    };
  } catch {
    return null;
  }
}

// Get all blog posts
function getAllBlogPosts(): BlogPost[] {
  const slugs = getBlogPostSlugs();

  return slugs
    .map(slug => getBlogPost(slug))
    .filter((post): post is BlogPost => post !== null)
    .filter(post => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get published posts only
export function getPublishedPosts(): BlogPost[] {
  return getAllBlogPosts().filter(post => post.published);
}

// Get featured post
export function getFeaturedPost(): BlogPost | null {
  return getAllBlogPosts().find(post => post.featured) || null;
}

// Get all unique tags
export function getAllTags(): string[] {
  const allTags = getAllBlogPosts().flatMap(post => post.tags);
  return Array.from(new Set(allTags)).sort();
}
