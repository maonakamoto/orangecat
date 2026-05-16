import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function InvestmentsPage() {
  redirect(ROUTES.DISCOVER_TYPE('investments'));
}
