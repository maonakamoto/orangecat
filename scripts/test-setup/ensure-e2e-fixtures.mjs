#!/usr/bin/env node
/**
 * Ensure CI E2E fixture data exists (self conversation + owned project).
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).
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
const email = (
  process.env.E2E_USER_EMAIL ||
  process.env.E2E_TEST_USER_EMAIL ||
  'test@orangecat.ch'
).trim();
const password =
  process.env.E2E_USER_PASSWORD ||
  process.env.E2E_TEST_USER_PASSWORD ||
  'TestPassword123!';

if (!url || !serviceKey) {
  console.error('Missing Supabase admin env for E2E fixture bootstrap');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const user = data?.users?.find(u => (u.email || '').toLowerCase() === targetEmail.toLowerCase());
    if (user) return user;
    if (!data?.users?.length) break;
  }
  return null;
}

async function ensureUser(targetEmail) {
  let user = await findUserByEmail(targetEmail);
  if (user) {
    await admin.auth.admin.updateUserById(user.id, { password });
    return user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: targetEmail,
    password,
    email_confirm: true,
    user_metadata: { preferred_username: 'e2e_user', name: 'E2E User' },
  });

  if (error) {
    user = await findUserByEmail(targetEmail);
    if (user) {
      await admin.auth.admin.updateUserById(user.id, { password });
      return user;
    }
    throw error;
  }

  console.log(`created E2E user: ${targetEmail}`);
  return data.user;
}

async function ensureSelfConversation(userId) {
  const { data: memberships } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  for (const row of memberships || []) {
    const { count } = await admin
      .from('conversation_participants')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', row.conversation_id);
    if (count === 1) {
      console.log(`self conversation ok: ${row.conversation_id}`);
      return row.conversation_id;
    }
  }

  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .insert({ created_by: userId, is_group: false })
    .select('id')
    .single();
  if (convErr || !conv?.id) throw convErr || new Error('conversation insert failed');

  const { error: partErr } = await admin.from('conversation_participants').insert({
    conversation_id: conv.id,
    user_id: userId,
    role: 'member',
    is_active: true,
  });
  if (partErr) {
    await admin.from('conversations').delete().eq('id', conv.id);
    throw partErr;
  }

  console.log(`created self conversation: ${conv.id}`);
  return conv.id;
}

async function ensureOwnedProject(userId) {
  const fixtureTitle = 'CI E2E Fixture Project';
  const { data: existing } = await admin
    .from('projects')
    .select('id, title, status')
    .eq('user_id', userId)
    .eq('title', fixtureTitle)
    .maybeSingle();

  if (existing?.id) {
    console.log(`fixture project ok: ${existing.id}`);
    return existing.id;
  }

  const { data: actor } = await admin.from('actors').select('id').eq('user_id', userId).maybeSingle();
  if (!actor?.id) {
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: retryActor } = await admin.from('actors').select('id').eq('user_id', userId).maybeSingle();
      if (retryActor?.id) {
        return insertFixtureProject(userId, retryActor.id, fixtureTitle);
      }
    }
    throw new Error(`No actor for user ${userId}`);
  }

  return insertFixtureProject(userId, actor.id, fixtureTitle);
}

async function insertFixtureProject(userId, actorId, fixtureTitle) {
  const { data: project, error } = await admin
    .from('projects')
    .insert({
      user_id: userId,
      actor_id: actorId,
      title: fixtureTitle,
      description: 'Dedicated project for CI P0 workflow matrix status transitions.',
      status: 'draft',
      currency: 'CHF',
      goal_amount: 1000,
      tags: ['e2e', 'ci-fixture'],
    })
    .select('id')
    .single();

  if (error || !project?.id) throw error || new Error('project insert failed');
  console.log(`created fixture project: ${project.id}`);
  return project.id;
}

try {
  const user = await ensureUser(email);

  await ensureSelfConversation(user.id);
  await ensureOwnedProject(user.id);
  console.log('E2E fixtures ready');
} catch (err) {
  console.error(err);
  process.exit(1);
}
