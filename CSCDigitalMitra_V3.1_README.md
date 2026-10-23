# CSCDigitalMitra V3.1

Standalone HTML prototype using HTML, CSS, JavaScript, and browser `localStorage`. No server, database, or payment gateway is connected.

## Run it

1. Download `CSCDigitalMitra_V3.1.html`.
2. Open it in a modern browser (Chrome or Edge recommended).
3. Use one of the accounts below to explore the preloaded workflows.

## Preloaded test accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cscmitra.in` | `admin123` |
| User | `asha@cscmitra.in` | `user123` |
| User | `kiran@cscmitra.in` | `user123` |
| Agent | `ravi@cscmitra.in` | `agent123` |
| Agent | `sneha@cscmitra.in` | `agent123` |

These are prototype credentials. Change them before sharing the file with anyone, and do not reuse these passwords elsewhere.

## V3.1 highlights

- Admin-only User and Agent account creation.
- Admin account actions: edit name/email, change email, reset password, lock/unlock, restrict/restore, and delete access.
- First-login eKYC form for new accounts, with masked Aadhaar/account references, bank name and IFSC fields, administrator approval/rejection, and a reason for rejection/corrections.
- Admin service catalogue editing, including names, descriptions, category, icon, featured status, and publish/hide controls.
- Homepage Cards CMS limited to homepage cards: add, edit, hide/publish, and delete. It does not edit the whole website, footer, or navigation.
- Admin-managed Starter, Professional, and Premium plan cards and prices. Selecting a plan does not unlock access automatically.
- Separate agent service permissions and dashboard-section permissions.
- Agent wallet credits recorded by Admin with timestamp, transaction reference, “Feature unlocking” history label, and private admin note. Credits do not unlock any service or feature automatically.
- User-reported payments require agent confirmation; an agent can dispute a payment. Wallets are transferred only on confirmation, and duplicate transaction creation is blocked.
- Notification read/unread history and transaction filters.
- Local persistence through the `cscdm_v31` localStorage key, with migration from the earlier V3 key when present.

## Important limitations

- This is a browser-only prototype. `localStorage` is editable by the browser user and is not a secure account or financial system.
- Passwords are stored in the browser in readable form. Do not use real passwords or real customer accounts.
- eKYC must use fictional test values only. Do not enter a real Aadhaar number, bank account number, or real personal information. Aadhaar and bank details are not verified against any official service.
- Wallet amounts and transaction history are simulations. No money is moved, and no bank/payment gateway is connected.
- Data is stored per browser/profile and does not synchronize between different devices or users.

## Checks performed for this build

- JavaScript syntax check passed with Node.js.
- Local smoke tests passed for Admin account creation, new-account eKYC submission and approval, Admin agent-wallet credit recording, payment reporting without an immediate balance transfer, and agent payment confirmation with both wallet balances updated.
- This is not a full cross-browser or security test. Please test the visual UI and remaining workflows in your target browser before using it as a public service.
