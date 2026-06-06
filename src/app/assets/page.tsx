import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

// Public /assets entry point. Mirrors the sibling /loans, /causes, etc.
// stubs — sends visitors into Discover with the assets filter pre-applied
// instead of dead-ending at a non-existent route. The /dashboard/assets
// surface is auth-required and lives under (authenticated)/dashboard/assets;
// linking to it from a public URL would force an auth wall on first click.
export default function AssetsPage() {
  redirect(ROUTES.DISCOVER_TYPE('assets'));
}
