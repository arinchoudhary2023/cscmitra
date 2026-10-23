# CSCDigitalMitra V4.3

CSCDigitalMitra is a citizen-services website with a public landing page, service catalogue, login view, and Admin/Agent/Customer dashboard UI. V4.3 keeps the existing single-file HTML/CSS/JavaScript frontend and adds a corrected Supabase secret-key configuration path, a one-time local admin bootstrap step, and database-backed Supabase Auth login. It does **not** rewrite the entire legacy dashboard data layer.

> **Production-readiness warning — please read:** Authentication and the initial-admin creation flow now use Supabase Auth and the `profiles` table. However, many existing dashboard operations and records in `index.html` still use the old browser `localStorage` application state. Those operations are not all wired to the database APIs yet. Do not use this release for real customer identity/banking data, live wallet balances, or production financial accounting. It is a backend integration milestone, not a claim that every dashboard workflow is production-ready. The remaining data-layer migration must be completed and tested before a live business launch.

## Project structure

```text
CSCDigitalMitra_V4.3/
├── index.html
├── api/
│   ├── _lib/supabase.js
│   ├── health.js
│   ├── auth/
│   │   ├── bootstrap.js
│   │   ├── login.js
│   │   └── me.js
│   ├── agents/index.js
│   └── funds/
│       ├── index.js
│       └── decision.js
├── scripts/
│   ├── bootstrap-admin.mjs
│   └── check-project.mjs
├── supabase/migrations/0001_initial_schema.sql
├── docs/API.md
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- Network access to the npm registry for dependency installation

## 1. Set up Supabase once

1. Open your Supabase project and open **SQL Editor**.
2. Open `supabase/migrations/0001_initial_schema.sql` from this folder.
3. Paste the complete SQL into SQL Editor and run it.
4. Check Table Editor for the tables, including `profiles`, `services`, `fund_requests`, `wallet_transactions`, `notifications`, and `audit_logs`.
5. In **Connect → API settings**, copy the Project URL and Publishable key.
6. In **Project Settings → API Keys → Secret keys**, copy the default Secret key. The current key usually starts with `sb_secret_`. This is accepted through `SUPABASE_SECRET_KEY`. A legacy `service_role` key can instead be set as `SUPABASE_SERVICE_ROLE_KEY`.

The Project URL should start with `https://` and look like `https://your-project-ref.supabase.co`. The database host that starts with `db.` is not the Project URL.

## 2. Configure local environment variables

V4.3 uses a single local `.env` file as requested. Vercel production/preview deployments should use Vercel Project Settings → Environment Variables; do not upload or commit the local file.

Copy `.env.example` to `.env`.

**Windows Command Prompt:**

```bat
copy .env.example .env
```

**PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY=
BOOTSTRAP_ADMIN_EMAIL=you@example.com
BOOTSTRAP_ADMIN_PASSWORD=use-a-unique-password-at-least-14-characters-long
```

Notes:

- `SUPABASE_PUBLISHABLE_KEY` is the public client key, normally beginning with `sb_publishable_`.
- `SUPABASE_SECRET_KEY` is a private server key, normally beginning with `sb_secret_`. Never expose it in `index.html`, client-side JavaScript, screenshots, GitHub, or public logs.
- If you use a legacy `anon` key, put it in `SUPABASE_ANON_KEY` and leave `SUPABASE_PUBLISHABLE_KEY` blank.
- If you use a legacy `service_role` key, put it in `SUPABASE_SERVICE_ROLE_KEY` and leave `SUPABASE_SECRET_KEY` blank.
- The initial admin email/password are application credentials you choose. They are not your Supabase dashboard login or database password.
- `.env` is ignored by Git. Commit `.env.example` only, never your actual `.env`.

## 3. Install and start localhost

From the extracted `CSCDigitalMitra_V4.3` project directory:

```bash
npm install
npm run dev
```

`npm run dev` first runs `scripts/bootstrap-admin.mjs`, which reads `.env` and checks the database. If no admin profile exists, it creates the configured initial administrator in Supabase Auth and inserts the corresponding `profiles` row. It then starts the included Node.js local development server (no Vercel login required). The local server serves the frontend and dispatches the existing `/api/*` handlers. If an admin already exists, it does not create a duplicate or change that account.

The SQL migration must be applied before this first run. If you already ran an earlier V4.2 migration, run the updated V4.3 migration in SQL Editor too; it is written to be rerunnable and explicitly grants the server-only `service_role` the required table/sequence privileges without granting browser roles access. If environment variables are missing or the schema is not installed, bootstrap exits with an explanatory error instead of silently starting with a fake admin account.

Open `http://localhost:3000` in your browser. Keep the terminal open while testing. The local development server is intended for localhost testing only; do not expose it publicly.

### First admin password

Use the exact email and password set in `.env` to sign in. The website's former browser-only seeded admin credentials are no longer accepted by the login action. Supabase Auth verifies the password; the `profiles` table determines the account role.

After you have created and verified the first admin, remove `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` from `.env` and restart the local server. The existing account remains in Supabase Auth. If you later need to reset the password, use Supabase Auth's supported password reset/admin workflow rather than putting a password in frontend code.

## 4. Check the project

```bash
npm run check
```

This validates the expected files and version marker. It is a structural check only; it is not a substitute for an end-to-end Supabase login test, browser QA, or verifying all dashboard operations against the database.

## 5. API routes

All routes return JSON. Authenticated routes expect `Authorization: Bearer <Supabase access token>`.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Shows API availability and whether required server environment variables are present |
| `POST` | `/api/auth/bootstrap` | One-time initial-admin bootstrap endpoint, using configured credentials |
| `POST` | `/api/auth/login` | Authenticates an email/password using Supabase Auth |
| `GET` | `/api/auth/me` | Validates a bearer token and returns the active profile |
| `GET` | `/api/agents` | Admin-only list of database-backed agent profiles |
| `POST` | `/api/agents` | Admin-only agent account creation in Supabase Auth and `profiles` |
| `GET` | `/api/funds` | Agent sees their requests; admin sees all fund requests |
| `POST` | `/api/funds` | Agent submits a fund request to the database |
| `POST` | `/api/funds/decision` | Admin approves/rejects a request through the atomic SQL function |

The frontend login now calls `/api/auth/login` and no longer authenticates using seeded browser passwords. The access token is kept in `sessionStorage` for the browser session and validated on reload. This is a necessary improvement but not a complete replacement of the dashboard's `localStorage` business data.

## 6. Deploy to Vercel

1. Push the source to GitHub. The `.gitignore` excludes `.env`, `.env`, `.env.*`, dependencies and local data files; `.env.example` is safe to commit because it contains placeholders only.
2. Import the repository in Vercel. Set the project root to the folder containing `package.json`, `vercel.json`, and `index.html`.
3. In **Vercel → Project → Settings → Environment Variables**, add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`) and `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`). Add bootstrap email/password only for the one-time setup window.
4. Apply the SQL migration to the Supabase project selected for production.
5. Deploy. Since Vercel does not run the local `npm run dev` bootstrap script in production, trigger the one-time `/api/auth/bootstrap` endpoint with a POST request whose JSON body contains the same configured bootstrap email and password. Do this only while those temporary environment variables are set.
6. Verify the endpoint returns success and that the admin profile exists in Supabase Auth and `profiles`.
7. Remove `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` from Vercel and redeploy.
8. Test `/api/health`, then log in with the configured admin email/password.

Use separate Supabase projects for preview/testing and production when possible. After changing Vercel environment variables, redeploy so the deployment picks up the new values.

## 7. Why old admin credentials no longer work

The old app seeded accounts and passwords into browser-side state. That is not real authentication and cannot be used as a production account system. V4.3 removes those seeded password strings from the shipped source and strips legacy plaintext password fields from the browser state at startup. Login requires an account in Supabase Auth and an active matching profile row.

Old browser-only accounts are **not automatically migrated**. The database migration intentionally does not copy passwords from localStorage. Create accounts through the admin API or use a controlled password reset/invitation flow for existing people.

## 8. Important remaining work before production

V4.3 is not yet safe for a live public-service deployment because these legacy UI operations still read/write browser-side state and have not all been switched to server API routes:

- service requests and their status history
- full customer/agent profile management and permissions UI
- eKYC submission/review workflow
- notification and audit views
- wallet balances, adjustments and transaction screens
- plans, homepage content management, and related admin settings

Although API/database foundations exist for several of these areas, the existing dashboard UI does not call every endpoint. A browser can modify localStorage, so local-only role checks and wallet values must not be treated as authoritative. Complete the workflow migration and staging QA before collecting any real personal information or using real balances. Use fictional test data until privacy/security review is complete.

## 9. Troubleshooting

### `npm install` keeps retrying or appears stuck

The package manager needs to reach `https://registry.npmjs.org`. If its debug log reports `EAI_AGAIN`, `ENOTFOUND`, `ETIMEDOUT`, or repeated fetch retries, that indicates a DNS/network/registry connection problem in the environment running npm; it is not proof of an application JavaScript error. Wait for the connection to recover or check the network/proxy/DNS settings. Do not publish `.npmrc` credentials or secrets.

### Bootstrap says permission denied for `profiles`

Run the updated V4.3 migration in the same Supabase project as `SUPABASE_URL`. It explicitly grants the `service_role` access needed by the server-side bootstrap. V4.3 also updates `@supabase/supabase-js` to a version intended to support the newer `sb_secret_...` key format. If you still see permission denied, verify that `SUPABASE_SECRET_KEY` is the Secret key from this exact project, not the publishable key. Do not grant `anon` or `authenticated` broad table privileges.

### Bootstrap says the profile table is missing

Run `supabase/migrations/0001_initial_schema.sql` in the correct Supabase project's SQL Editor, then run `npm run dev` again.

### Login says the account is not provisioned

Check that the user exists in Supabase Authentication and has an `active` row in `public.profiles` with the same UUID as the Auth user. Creating a user in Authentication alone does not assign an application role.

### Missing Supabase configuration

Check variable names and values in `.env`. For the new key format use `SUPABASE_SECRET_KEY=sb_secret_...`; for legacy keys use `SUPABASE_SERVICE_ROLE_KEY=...`. Never put the secret key in the HTML.

## Privacy and security

Do not enter real Aadhaar, bank account, or other sensitive citizen data into this release until the complete data layer, authorization rules, retention controls, and applicable legal requirements have been reviewed. Never commit real environment files. Rotate any credential that has been exposed in Git history or logs.
