'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ROUTES } from '@/config/api-routes';

export interface ContextSummary {
  completeness: number;
  knowledgeItems: {
    category: string;
    icon: string;
    items: string[];
    count: number;
  }[];
  tips: string[];
}

interface UseCatContextReturn {
  summary: ContextSummary | null;
  isLoading: boolean;
}

export function useCatContext(): UseCatContextReturn {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    async function fetchSummary() {
      try {
        const res = await fetch(API_ROUTES.CAT.CONTEXT);
        const data = await res.json();
        if (data.success) {
          setSummary(data.data);
        }
      } catch {
        // context unavailable
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummary();
  }, [user]);

  return { summary, isLoading };
}
