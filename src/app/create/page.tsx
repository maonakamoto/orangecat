'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

export default function LegacyCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(ENTITY_REGISTRY['project'].createPath);
  }, [router]);
  return null;
}
