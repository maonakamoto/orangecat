'use client';

import { categories } from '@/config/categories';
import Link from 'next/link';
import { Palette, Code, GraduationCap, Building2, Heart, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/config/routes';

const iconMap = {
  Palette,
  Code,
  GraduationCap,
  Building2,
  Heart,
};

export default function CategoriesPage() {
  const { session } = useAuth();
  const router = useRouter();

  const handleCreatePage = () => {
    if (session) {
      router.push(ROUTES.CREATE);
    } else {
      router.push(ROUTES.AUTH_REGISTER);
    }
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="font-heading tracking-display text-4xl font-bold mb-4">
            Find Your Community
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you&apos;re a creator, builder, educator, or organization, OrangeCat helps you
            exchange, fund, lend, invest, and govern—without gatekeepers.
          </p>
        </div>

        <div className="grid gap-12">
          {categories.map(category => {
            const Icon = iconMap[category.icon as keyof typeof iconMap] || ArrowRight;
            if (!Icon) {
              return null;
            }
            return (
              <div key={category.id} className="bg-card rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-surface-raised border border-border-subtle flex items-center justify-center">
                    <Icon className="w-6 h-6 text-fg-secondary" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-semibold text-foreground">{category.name}</h2>
                    <p className="text-muted-foreground">{category.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {category.groups.map(group => (
                    <Link
                      key={group.id}
                      href={`/browse?category=${category.id}&group=${group.id}`}
                      className="block p-6 bg-muted rounded-lg hover:bg-muted/80 dark:hover:bg-muted/80 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{group.name}</h3>
                        <ArrowRight className="w-5 h-5 text-muted-dim group-hover:text-foreground transition-colors" />
                      </div>
                      <p className="text-muted-foreground text-sm">{group.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Button variant="accent" size="lg" onClick={handleCreatePage}>
            {session ? 'Start Creating' : 'Get Started'}
          </Button>
          {!session && (
            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={ROUTES.AUTH_LOGIN}
                className="text-foreground hover:text-muted-strong underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
