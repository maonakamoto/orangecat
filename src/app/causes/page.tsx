import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function CausesPage() {
  redirect(ROUTES.DISCOVER_TYPE('causes'));
}
