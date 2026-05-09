import { redirect } from 'next/navigation';
import { ENTITY_REGISTRY } from '@/config/entity-registry';

interface CauseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CauseEditPage({ params }: CauseEditPageProps) {
  const { id } = await params;
  redirect(`${ENTITY_REGISTRY['cause'].createPath}?edit=${id}`);
}
