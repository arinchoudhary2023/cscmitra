import { send, methodNotAllowed, env } from './_lib/supabase.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const configured = Boolean(env('SUPABASE_URL') && (env('SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_ANON_KEY')) && (env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY')));
  return send(res, 200, { ok: true, app: 'CSCDigitalMitra', version: '4.2.0', supabaseConfigured: configured, timestamp: new Date().toISOString() });
}
