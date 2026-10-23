import { publicClient, adminClient, send, readJson, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return send(res, 400, { error: 'Enter a valid email address and password.' });
    const client = publicClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.user || !data?.session) return send(res, 401, { error: 'Invalid email address or password.' });
    const db = adminClient();
    const { data: profile, error: profileError } = await db.from('profiles').select('id, name, email, role, status').eq('id', data.user.id).maybeSingle();
    if (profileError || !profile || profile.status !== 'active') {
      await client.auth.signOut({ scope: 'local' });
      return send(res, 403, { error: 'This account is not active or has not been provisioned.' });
    }
    return send(res, 200, { user: profile, session: { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, token_type: data.session.token_type } });
  } catch (error) { return handleError(res, error); }
}
