import { requireUser, send, methodNotAllowed, handleError } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const user = await requireUser(req);
    return send(res, 200, { user: user.profile });
  } catch (error) { return handleError(res, error); }
}
