# CSCDigitalMitra V4.3 API notes

The API validates Supabase Auth access tokens and reads account roles from `public.profiles`. The backend accepts the new Supabase `SUPABASE_SECRET_KEY` format or the legacy `SUPABASE_SERVICE_ROLE_KEY` format; both are server-only. The public key is `SUPABASE_PUBLISHABLE_KEY` or the legacy `SUPABASE_ANON_KEY`.

The frontend login now calls `/api/auth/login`; the old seeded browser passwords are not used for authentication. `npm run dev` runs `scripts/bootstrap-admin.mjs` before `vercel dev`, creating the first admin from `.env` if no admin profile exists. The SQL migration must already be applied.

**Important limitation:** the legacy dashboard still uses localStorage for many business records and actions. The API routes are not wired to every dashboard control. Do not treat local wallet balances, requests, eKYC status, permissions or other browser-side data as production-authoritative until the full frontend migration is completed.

Fund approvals call `public.decide_fund_request`, which uses a row lock and a unique wallet ledger reference to prevent duplicate credits. Verify this against a staging database before any production wallet use.
