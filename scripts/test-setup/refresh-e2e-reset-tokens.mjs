#!/usr/bin/env node
/**
 * Mint fresh password-reset session tokens for the E2E fixture user.
 * Prints GitHub Actions env lines when GITHUB_ENV is set, else shell exports.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = (
  process.env.E2E_USER_EMAIL ||
  process.env.E2E_TEST_USER_EMAIL ||
  'test@orangecat.ch'
).trim();

if (!url || !serviceKey || !anonKey) {
  console.error('Missing Supabase env for reset token refresh');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'recovery',
  email,
});
if (linkErr || !linkData?.properties?.hashed_token) {
  console.error('generateLink failed', linkErr);
  process.exit(1);
}

const client = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const { data: sessionData, error: otpErr } = await client.auth.verifyOtp({
  type: 'recovery',
  token_hash: linkData.properties.hashed_token,
});

if (otpErr || !sessionData?.session) {
  console.error('verifyOtp failed', otpErr);
  process.exit(1);
}

const accessToken = sessionData.session.access_token;
const refreshToken = sessionData.session.refresh_token;
const githubEnv = process.env.GITHUB_ENV;

if (githubEnv) {
  fs.appendFileSync(githubEnv, `E2E_RESET_ACCESS_TOKEN=${accessToken}\n`);
  fs.appendFileSync(githubEnv, `E2E_RESET_REFRESH_TOKEN=${refreshToken}\n`);
}

console.log(`E2E_RESET_ACCESS_TOKEN=${accessToken}`);
console.log(`E2E_RESET_REFRESH_TOKEN=${refreshToken}`);
