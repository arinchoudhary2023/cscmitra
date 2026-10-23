import { createClient } from '@supabase/supabase-js';

export function env(name) {
  return String(process.env[name] || '').trim();
}

export function getSupabaseConfig() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY');
  const serviceKey = env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    const error = new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
    error.status = 503;
    throw error;
  }
  return { url, key, serviceKey };
}

export function publicClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminClient() {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    const error = new Error('Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY). Configure it only in server environment variables.');
    error.status = 503;
    throw error;
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  return send(res, 405, { error: `Method not allowed. Use ${allowed.join(' or ')}.` });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error('Invalid JSON request body.'), { status: 400 }); }
}

export async function requireUser(req) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) throw Object.assign(new Error('Sign in is required.'), { status: 401 });
  const client = publicClient();
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user) throw Object.assign(new Error('Your session is invalid or expired.'), { status: 401 });
  const db = adminClient();
  const { data: profile, error } = await db.from('profiles').select('id, name, email, role, status').eq('id', authData.user.id).maybeSingle();
  if (error) throw Object.assign(new Error('Unable to load account profile.'), { status: 500 });
  if (!profile || profile.status !== 'active') throw Object.assign(new Error('This account is not active.'), { status: 403 });
  return { authUser: authData.user, profile, db };
}

export function requireRole(user, roles) {
  if (!roles.includes(user.profile.role)) throw Object.assign(new Error('You do not have permission to perform this action.'), { status: 403 });
}

export function handleError(res, error) {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error('[CSCDigitalMitra API]', error?.message || error);
  return send(res, status, { error: status >= 500 ? (status === 503 ? error.message : 'The server could not complete the request.') : error.message });
}
