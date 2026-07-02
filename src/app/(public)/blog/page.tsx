import type { Metadata } from 'next';
import { getPublishedPosts, getFeaturedPost, getAllTags } from '@/lib/blog';
import BlogClientWrapper from '@/components/blog/BlogClientWrapper';
import { PageHeading } from '@/components/layout/PageHeading';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights, guides, and stories about economic freedom, Bitcoin, and building on OrangeCat.',
};

export default function BlogPage() {
  const allPosts = getPublishedPosts();
  const featuredPost = getFeaturedPost();
  const allTags = getAllTags();

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <PageHeading className="mb-4">OrangeCat Blog</PageHeading>
          <p className="text-xl text-fg-secondary max-w-3xl mx-auto">
            Insights, guides, and stories about economic freedom, Bitcoin, and building on OrangeCat
          </p>
        </div>

        <BlogClientWrapper posts={allPosts} featuredPost={featuredPost} tags={allTags} />
      </div>
    </div>
  );
}
