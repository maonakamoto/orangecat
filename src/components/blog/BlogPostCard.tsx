'use client';

import Card from '@/components/ui/Card';
import { Calendar, Clock, Tag } from 'lucide-react';
import Link from 'next/link';
import { BlogPost } from '@/lib/blog';

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Calendar className="w-4 h-4 mr-2" />
        {post.date}
        <Clock className="w-4 h-4 ml-4 mr-2" />
        {post.readTime}
      </div>
      <Link href={`/blog/${post.slug}`}>
        <h2 className="text-xl font-semibold mb-2 hover:text-orange-600 transition-colors cursor-pointer">
          {post.title}
        </h2>
      </Link>
      <p className="text-base text-muted-foreground mb-4">{post.excerpt}</p>
      <div className="flex flex-wrap gap-2">
        {post.tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground"
          >
            <Tag className="w-3 h-3 mr-1" />
            {tag}
          </span>
        ))}
      </div>
      {post.author && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-sm text-muted-foreground">By {post.author}</p>
        </div>
      )}
    </Card>
  );
}
