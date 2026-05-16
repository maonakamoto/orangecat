import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function ProductsPage() {
  redirect(ROUTES.DISCOVER_TYPE('products'));
}
