import { adminClient, requireUser, requireRole, send, readJson, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  try {
    const user = await requireUser(req);
    requireRole(user, ['admin']);
    const db = adminClient();
    if (req.method === 'GET') {
      const { data, error } = await db.from('profiles').select('id, name, email, role, status, created_at').eq('role', 'agent').order('created_at', { ascending: false });
      if (error) throw error;
      return send(res, 200, { agents: data || [] });
    }
    const body = await readJson(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return send(res, 400, { error: 'Provide a name, valid email, and password of at least 12 characters.' });
    const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role: 'agent' } });
    if (createError) return send(res, createError.status === 422 ? 409 : 400, { error: createError.message });
    const { data: profile, error: profileError } = await db.from('profiles').insert({ id: created.user.id, name, email, role: 'agent', status: 'active' }).select('id, name, email, role, status, created_at').single();
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }
    await db.from('audit_logs').insert({ actor_id: user.profile.id, action: 'agent.created', entity_type: 'profile', entity_id: profile.id, metadata: { email } });
    return send(res, 201, { agent: profile });
  } catch (error) { return handleError(res, error); }
}
