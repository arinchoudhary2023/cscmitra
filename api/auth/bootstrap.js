import { adminClient, env, send, readJson, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const expectedEmail = env('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
    const expectedPassword = env('BOOTSTRAP_ADMIN_PASSWORD');
    if (!expectedEmail || !expectedPassword) return send(res, 503, { error: 'Initial admin bootstrap is not configured. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD temporarily.' });
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (email !== expectedEmail || password !== expectedPassword) return send(res, 401, { error: 'Bootstrap credentials did not match the server configuration.' });
    const db = adminClient();
    const { count, error: countError } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (countError) throw countError;
    if ((count || 0) > 0) return send(res, 409, { error: 'An admin already exists. Bootstrap is disabled after the first admin is created.' });
    const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Platform Administrator' } });
    if (createError) throw createError;
    const { error: profileError } = await db.from('profiles').insert({ id: created.user.id, name: 'Platform Administrator', email, role: 'admin', status: 'active' });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }
    return send(res, 201, { ok: true, message: 'Initial admin created. Remove BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD from the environment now, then redeploy.' });
  } catch (error) { return handleError(res, error); }
}
