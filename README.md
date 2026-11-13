# QuantiBuild frontend

React + TypeScript frontend for the sibling calcvault_api Django backend. Feature folders separate auth, projects/team, calculations, chat and administration. Backend responses provide the displayed data; there is no demo-data fallback in the application.

## Start locally (PowerShell)

Start Django in a terminal:

```powershell
cd D:\Projects\QuantBuild\calcvault_api
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Start the frontend in another terminal:

```powershell
cd D:\Projects\QuantBuild\calcvault_frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Vite prints the local URL using DEV_HOST and DEV_PORT from .env. Node 22.12+ is supported. Configure API_TARGET for the Django proxy, DEV_HOST/DEV_PORT for development and PREVIEW_HOST/PREVIEW_PORT for preview. Missing server settings fail with a configuration error.

Browser configuration is centralized in src/lib/config.ts. VITE_API_ORIGIN and VITE_WS_ORIGIN optionally connect directly to a backend; leave them blank for same-origin /api and /ws routing. An omitted WebSocket origin derives from the API origin or current host. Direct connections require backend CORS and WebSocket origin permissions. VITE_MAP_* configures the map provider and attribution; VITE_LOCALE controls number/date formatting. E2E_BROWSER_CHANNEL selects the test browser.

.env and local environment overrides are ignored by Git; .env.example is the shared template. Restart Vite after changes and rebuild for production: VITE_* settings are public values embedded at build time. Keep backend secrets, email passwords and JWTs out of frontend environment files.

The backend must have migrations applied and the Channels/Daphne dependencies installed. Browser WebSocket origins must be allowed in the backend environment:

```dotenv
CHAT_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Preserve any existing allowed origins. No backend code or database contract changes are required by this frontend. The backend is authoritative for all permissions, approval status, quotas and calculations.

## Implemented workflows

- Student signup: explicit account-type selection, personal details, paired email/phone OTP verification, academic details, student ID/profile upload, review and multipart registration. Other account types are visibly unavailable because the backend only implements the Student signup profile flow.
- Email or phone + password login, mandatory OTP, resend, reset-password verification, authenticated token refresh and logout. Passwords and OTPs are kept only in component state. The session's tokens and user identity use sessionStorage, not a permanent shared login across browser profiles. API refresh is deduplicated; invalid refresh sessions are cleared. Use a separate browser/private profile to test another member concurrently.
- Dashboard from live project summary, invitations, module permissions and admin data. Pending/rejected accounts can see their review state and settings without being given module access.
- Projects: searchable owned/shared lists, pagination, five-step creation, text category/contract/structure, dynamic project types/tools, review, edits and protected document upload/download. The draggable Leaflet/OpenStreetMap pin writes only site_coordinates. Map tiles need internet access; manual coordinate entry also works. Document upload follows the actual backend contract: create first, then PATCH file on the same project detail endpoint.
- Project overview with construction/location/team/module/calculation sections. Owner project deletion is explicitly confirmed. There is no backend draft or publish/review endpoint.
- Project roles and selected-tool grants, registered-student email search, invitations, resend/revoke, accepted member role changes/removal. Recipients accept their own project-specific invitations from the Invitations screen.
- Admin-managed calculation sheets, categories and formulas, dynamic numeric inputs, server-calculated results, formula/working, item edits/deletion and actor-based activity history. No hardcoded formula fallback exists. Formula fields, bounds, units and revisions come from the backend catalog. Existing results retain their saved formula snapshot. Usage is consumed only by backend operations.
- Project chat: owner-created groups with accepted project users, add/remove group members, persistent history, first-frame JWT WebSocket authentication, messages, acknowledgments, deduplication, safe UUID retries, HTTP send fallback and reconnect/token refresh. Group/project switching clears local message state; messages never merge across groups. Access-unavailable state follows server revocation. Online connection status refers to this client's socket, not presence of other members.
- Admin: student review/details editing, required rejection reason, approval email-queued feedback, account enable/disable, unread notifications, dynamic roles/module assignment, global module availability, project types/tools, plan modules/limits and subscription assignment/cancellation.
- Profile: personal/academic edits and protected documents. Student email/phone remain read-only; profile edits obey approval status. Change password and subscription/usage/access screens are included.
- Inventory, Reports and Drawing & Reference display actual backend access and an honest not-yet-implemented business-workspace state. There are no fabricated inventory/report/drawing CRUD endpoints, prices or payment checkout.

Admin access is determined by the verified login response. Existing database-managed roles and module permissions are never replaced with frontend-defined access rules. Register/login using the existing backend accounts; no admin credentials are bundled or created.

## Structure

```text
src/auth/                    OTP login, signup, recovery and session provider
src/components/              Layout, accessible forms, dialogs and shared UI
src/features/projects/       Project wizard, map, overview, roles and team
src/features/calculations/   Sheet selection, items, working and activity
src/features/chat/           Groups, history and authenticated socket lifecycle
src/features/admin/          Reviews, module/role access, setup, plans/subscriptions
src/features/Account.tsx     Profile, security, usage and future feature states
src/lib/                     API transport, refresh, query hooks and feedback
src/styles/                  Responsive design tokens and feature styles
```

## Verification

```powershell
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run format
```

Unit tests exercise transport permissions, nested validation feedback, concurrent token refresh, invalid sessions and URL safety. Playwright workflows cover login OTP, pending-account locks, multipart signup, project creation, calculation save/formula, member invitation, chat acknowledgment deduplication, reason-based rejection, admin pages and mobile navigation. Browser workflows use explicitly mocked network fixtures in tests/e2e, not production/demo API data. They do not send real emails or modify backend accounts. Playwright uses E2E_BROWSER_CHANNEL (chrome in the template); install Chrome or change the channel to a locally installed Playwright browser.

Local integration smoke checks also verified that the real Vite proxy reaches Django (unauthenticated profile returns 401) and the actual WebSocket endpoint rejects an invalid access token with 4401. Full authenticated browser-to-backend flows still require your actual users and OTPs. Backend chat broadcasting uses one-process local memory by default; multi-worker operation needs the backend's shared Redis configuration.

npm run build produces dist. npm run preview serves the build locally on PREVIEW_PORT with the same proxy (allow that origin in the backend if using WebSockets). A separately hosted production build needs its host to route /api and /ws to Django and serve SPA route fallbacks; no hosting/deployment setup is included here.

In Vite development mode only, login displays an email or phone test OTP when the backend returns otp or debug_otp. Signup shows the response-only phone test OTP when provided. Production builds omit this helper; actual SMS delivery must be configured for production phone verification. Calculation quantities are formatted from server decimal strings without losing precision through JavaScript floating-point conversion.
