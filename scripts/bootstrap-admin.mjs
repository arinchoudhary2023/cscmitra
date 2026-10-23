import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const env = (key) => String(process.env[key] || '').trim();
const url = env('SUPABASE_URL');
const secret = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
const email = env('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
const password = env('BOOTSTRAP_ADMIN_PASSWORD');

if (!url || !secret) {
  console.error('Supabase bootstrap needs SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) in .env.');
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  const { data: admins, error: listError } = await db.from('profiles').select('id,email').eq('role', 'admin').limit(1);
  if (listError) throw new Error(`Could not inspect profiles table. Apply supabase/migrations/0001_initial_schema.sql first. Details: ${listError.message}`);
  if (admins?.length) {
    console.log(`Initial admin already exists (${admins[0].email}). No account was changed.`);
  } else {
    if (!email || !password) throw new Error('No admin profile exists yet. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env to create the first admin.');
      const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Platform Administrator' }
    });
    if (createError) throw new Error(`Supabase could not create the initial admin: ${createError.message}`);
    const { error: profileError } = await db.from('profiles').insert({
      id: created.user.id,
      name: 'Platform Administrator',
      email,
      role: 'admin',
      status: 'active'
    });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new Error(`Admin profile creation failed; the temporary Auth user was rolled back. Details: ${profileError.message}`);
    }
    console.log(`Initial admin created in Supabase Auth and profiles for ${email}.`);
  }
} catch (error) {
  console.error(error.message || 'Admin bootstrap failed.');
  process.exit(1);
}
