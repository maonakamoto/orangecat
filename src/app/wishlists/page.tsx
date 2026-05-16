import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

export default function WishlistsPage() {
  redirect(ROUTES.DISCOVER_TYPE('wishlists'));
}
