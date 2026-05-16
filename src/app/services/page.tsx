import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function ServicesPage() {
  redirect(ROUTES.DISCOVER_TYPE('services'));
}
