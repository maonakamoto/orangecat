import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  // Default to Cat page — primary interface for new users
  // Only allow internal paths (must start with /) to prevent open redirect attacks
  const rawNext = requestUrl.searchParams.get('next') || '/dashboard/cat?welcome=true';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard/cat?welcome=true';

  if (code) {
    try {
      const supabase = await createServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          `${requestUrl.origin}/auth?error=${encodeURIComponent('Authentication failed. Please try again.')}`
        );
      }

      // Successfully authenticated, redirect to Cat — the primary interface
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth?error=${encodeURIComponent('An unexpected error occurred during authentication')}`
      );
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    `${requestUrl.origin}/auth?error=${encodeURIComponent('No code provided')}`
  );
}
