# UnsaidBox

Standalone product. Never import configuration, secrets, database clients, or authentication from the Tochukwu website.
Use only the dedicated `unsaidbox` database and database-scoped credentials.
Never push, deploy, change DNS, or migrate existing website data without explicit authorization.
Private submissions are never published automatically. Link activation, accepting responses, public visibility, and discovery are separate controls.
Sender content uses normal font weight. Light is the default theme.
Use components/ui/Checkbox.tsx for every checkbox so wrapped labels, focus, checked/disabled states and form semantics stay consistent.
All server-mutating forms must execute reCAPTCHA v3 on submit and verify the token, expected action, score, hostname and expiry on the server in production. Local development bypasses CAPTCHA using trusted server configuration, never request headers. Keep logout and read-only/local UI controls available without CAPTCHA. Never expose the CAPTCHA secret.
Google Analytics must not load before optional consent. Track only the explicit public information-page allowlist; never send anonymous content, personal box URLs, form contents or authentication tokens. Consent withdrawal must stop tracking and clear Analytics cookies without clearing login sessions.
Every password field must use AuthField with its labelled show/hide control and data-sensitive protection. App modals must use the themed Radix dialog pattern; never use browser alert, confirm or prompt dialogs. Keep focus trapping, Escape/Cancel behavior, pending-state protection and server-side destructive-action validation.
All option dropdowns must use `components/ui/Picker.tsx`. Never introduce visible native browser selects or date/time/color/file pickers; build a matching accessible shared control for new picker types. Preserve keyboard navigation, labels, focus states, disabled behavior, and server-form values. Keep accessible radio and segmented choices where appropriate.
Personal authenticated pages use `DashboardShell`; administration uses the separate `AdminShell` with the same workspace design tokens. Keep summary data scoped and real; never add placeholder analytics to live dashboards.
Administration uses Administrator and AdministratorSession, never Account.role or personal Session. Every admin route and mutation must use requireAdministrator. Admin credentials, password recovery, logout and cookie scope remain separate from personal accounts; never auto-promote or copy user passwords into administrator records.
Image uploads use the shared `FilePicker` (a styled button backed by a hidden file input; the device file chooser remains native for security/accessibility). Profile photos are authenticated, private dashboard assets, not automatically public. Re-encode uploads on the server, strip metadata, enforce input byte/pixel and output byte limits, and never trust MIME labels alone.
Every owner operation must scope queries to the authenticated account. Never trust an account ID sent by a client.
Do not claim a message was delivered, copied, or posted unless that operation actually succeeded.
