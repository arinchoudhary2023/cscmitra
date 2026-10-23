import { requireUser, requireRole, send, readJson, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  try {
    const user = await requireUser(req);
    const db = user.db;
    if (req.method === 'GET') {
      let query = db.from('fund_requests').select('id, agent_id, amount, reason, status, created_at, decided_at, decided_by, decision_note').order('created_at', { ascending: false }).limit(200);
      if (user.profile.role === 'agent') query = query.eq('agent_id', user.profile.id);
      else requireRole(user, ['admin']);
      const { data, error } = await query;
      if (error) throw error;
      return send(res, 200, { requests: data || [] });
    }
    requireRole(user, ['agent']);
    const body = await readJson(req);
    const amount = Number(body.amount);
    const reason = String(body.reason || '').trim().slice(0, 500);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10_000_000) return send(res, 400, { error: 'Amount must be a whole number between 1 and 10,000,000.' });
    const { data, error } = await db.from('fund_requests').insert({ agent_id: user.profile.id, amount, reason: reason || null, status: 'pending' }).select('id, agent_id, amount, reason, status, created_at').single();
    if (error) throw error;
    await db.from('notifications').insert({ user_id: null, kind: 'fund_request', title: 'New agent fund request', body: `${user.profile.name} requested ${amount} in funds.`, metadata: { fund_request_id: data.id } });
    return send(res, 201, { request: data });
  } catch (error) { return handleError(res, error); }
}
