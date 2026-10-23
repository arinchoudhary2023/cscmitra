import { requireUser, requireRole, send, readJson, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  try {
    const user = await requireUser(req);
    requireRole(user, ['admin']);
    const body = await readJson(req);
    const id = String(body.requestId || '').trim();
    const decision = String(body.decision || '').trim().toLowerCase();
    const note = String(body.note || '').trim().slice(0, 500) || null;
    if (!id || !['approved', 'rejected'].includes(decision)) return send(res, 400, { error: 'Provide a requestId and decision of approved or rejected.' });
    const { data, error } = await user.db.rpc('decide_fund_request', { p_request_id: id, p_decision: decision, p_decided_by: user.profile.id, p_note: note });
    if (error) throw error;
    if (!data?.ok) return send(res, 409, { error: data?.error || 'The request could not be processed.' });
    await user.db.from('audit_logs').insert({ actor_id: user.profile.id, action: `fund_request.${decision}`, entity_type: 'fund_request', entity_id: id, metadata: { note } });
    return send(res, 200, { result: data });
  } catch (error) { return handleError(res, error); }
}
