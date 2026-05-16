import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function LoansPage() {
  redirect(ROUTES.DISCOVER_TYPE('loans'));
}
