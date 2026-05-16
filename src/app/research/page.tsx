import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function ResearchPage() {
  redirect(ROUTES.DISCOVER_TYPE('research'));
}
