import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = [
  'index.html', 'api/health.js', 'api/auth/login.js',
  'api/auth/bootstrap.js', 'api/agents/index.js', 'api/funds/index.js',
  'api/funds/decision.js', 'api/_lib/supabase.js', 'api/auth/me.js', 'supabase/migrations/0001_initial_schema.sql', 'README.md'
];
const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length) {
  console.error('Missing required project files:', missing.join(', '));
  process.exit(1);
}
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
if (!html.includes('CSCDigitalMitra V4.3')) {
  console.error('Expected V4.3 title was not found in index.html');
  process.exit(1);
}
if (html.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  console.error('A server secret appears to be embedded in the public HTML.');
  process.exit(1);
}
console.log('Project structure checks passed.');
console.log('Note: this is a structural check, not a live Supabase integration test.');
