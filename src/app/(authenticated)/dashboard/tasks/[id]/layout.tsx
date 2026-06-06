import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { DATABASE_TABLES } from '@/config/database-tables';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

// Per-task title via DB lookup. Falls back to the static "Task" default when
// the row can't be fetched (deleted, RLS-blocked, dev offline). Done at the
// layout level so the existing client `page.tsx` doesn't need to change shape.
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from(DATABASE_TABLES.TASKS)
      .select('title')
      .eq('id', id)
      .maybeSingle();
    const title = (data as { title?: string } | null)?.title;
    if (title) {
      return { title: { default: title, template: '%s | OrangeCat' } };
    }
  } catch {
    // fall through to default
  }
  return { title: { default: 'Task', template: '%s | OrangeCat' } };
}

export default function Layout({ children }: LayoutProps) {
  return children;
}
