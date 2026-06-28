import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function CirclesPage() {
  redirect(ROUTES.DISCOVER_TYPE('circles'));
}
