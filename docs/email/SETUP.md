# UnsaidBox Brevo integration

## Activated — 14 October 2026

The owner approved all pending changes. Both additive migrations were applied to the dedicated database using a temporary `unsaidbox_migration` account restricted to `unsaidbox.*`; that account was removed immediately afterward. Existing data was not modified. The runtime account keeps its original limited privileges. Schema and DNS recovery snapshots remain private under the ignored `.vercel/marketing-activation` directory.

The Brevo verification TXT and two DKIM CNAMEs were added. All original DNS records and TTLs were retained, except that Brevo's required aggregate-reporting address was appended to the existing DMARC record. The `p=none` policy and DMARC TTL remain unchanged. Current Brevo guidance requires that reporting tag; this corrects the earlier assumption below that it was optional.

Brevo confirms the domain is verified/authenticated and the hello@unsaidbox.com sender is active. Marketing, public lead capture and the Brevo transport are enabled locally and in the production environment. The verified production deployment is `dpl_3Cn339CaqJZ3ePLKicsmR33F669F`, promoted to unsaidbox.com and www.unsaidbox.com. The previous ready deployment is `dpl_AZU4zx8Q6VyvkG3WvfajVZGDTyK9` if rollback is needed.

The real browser signup created an unconfirmed lead, its confirmation email was received in the dedicated mailbox, GET did not subscribe it, the confirmation was consumed once, and list addition and withdrawal were verified against Brevo. The test mailbox was withdrawn after verification. The separate first-campaign test email was also received in that mailbox. The first campaign is saved as a draft; there are currently no real opted-in recipients, so no audience campaign was submitted. Evidence: `migration-result.json` and `flow-verification.json`.

## Active configuration

- Sender: UnsaidBox <hello@unsaidbox.com>, active and domain authenticated.
- Shared Brevo account; dedicated UnsaidBox folder 23 and marketing list 24.
- Footer: Tochukwu Tech and AI Academy, 33 Bevan Court, Dunlop Street, WA4 6AA, Warrington, England.
- Marketing, public lead capture and Brevo transport enabled in production.
- Both reviewed additive marketing migrations applied; existing account/submission data was not migrated or subscribed.
- Production CAPTCHA signup succeeded; its confirmation email and the first campaign test were received in the dedicated mailbox. The test address remains unsubscribed and its pending test token was invalidated.
- The first campaign remains a draft in `/admin/email`. No audience campaign has been submitted.

The ignored local environment contains the authorised shared Brevo API credential. Other applications' contacts, databases and authentication were not imported. No credentials are in these documents. Existing receiving mailbox and MX/SPF records remain intact. Brevo verification/DKIM records and the required DMARC reporting tag are active.

## Consent and audience boundaries

Only a verified, active account owner can subscribe their authenticated account email. The unchecked shared Checkbox states the exact offer: tips, product updates and occasional offers. Every choice records statement, version, source and timestamp in a consent history; registration, paid membership, anonymous submissions and activity-alert preferences are not marketing consent.

Local withdrawal commits before best-effort Brevo list removal. Before every campaign submission, the application reconciles the full configured list against current eligible local consent, removes unexpected members from only this list, checks provider suppressions and adds only eligible contacts. Consent writes and dispatch use the same database row lock. No shared attributes or blocklists are overwritten, and other brands' list memberships are preserved. A campaign already accepted for processing may still arrive after withdrawal.

Email footers include Brevo's native unsubscribe link, account Settings, the supplied postal address and privacy information. Native provider unsubscribes remain authoritative, including when the local record still reflects an earlier opt-in; the next send rechecks Brevo and never clears suppression. Brevo's native unsubscribe behavior may affect shared-account suppression. No webhook is installed; provider delivery/unsubscribe reporting is available in Brevo. Do not manually send campaigns from the shared dashboard using this list without running the application's consent checks.

The first release supports an audience of at most 100 distinct opted-in addresses per submission, combining eligible accounts and confirmed public leads, to bound synchronous API work. Larger audiences fail closed and need a background-dispatch extension; they are never silently truncated. Drafts are immutable in the app: create a new draft when copy changes. PREPARING and NEEDS_REVIEW statuses must be reconciled manually after a crash or uncertain response. Look up the provider campaign by ID or its unique `UnsaidBox · <local-id>` name; never reset it and resend without verifying provider state.

## Public lead capture: aligned with Effikos

The invitation appears only on the homepage, pricing, templates, blog index and editorial blog articles. It waits 20 seconds and 35% scroll, and defers while a cookie banner/dialog is open or a visitor is typing. A small passive invitation opens the themed Radix dialog only after a click, avoiding automatic focus theft. Cancel, Escape and outside clicks dismiss it, with pending-state protection during submission. Dismissal lasts 30 days in local storage; a successful signup request or confirmation hides it for 365 days. Storage-blocked browsers retain dismissal in component memory. Signed-in visitors use their existing dashboard consent control instead.

Signup requests require first name, email, unchecked explicit consent, current consent version and production reCAPTCHA verification. The request creates no account or subscription. Confirmation links contain a random token in the URL fragment; only its hash is stored. The confirmation page captures and removes the fragment, is excluded from Analytics and indexing, and requires a deliberate CAPTCHA-protected POST. Tokens expire after 24 hours and can be consumed once. Requests for the same address are throttled to ten minutes; errors do not automatically resend mail.

Confirmed leads enter the same isolated UnsaidBox audience. Dispatch deduplicates addresses, honors account withdrawal and provider suppression, and excludes suspended account addresses. Settings withdrawal also updates a matching lead and invalidates pending confirmation links. Confirming a new lead for an already verified account records its explicit renewed marketing choice without granting authentication. A later account with the same verified email can view and manage its existing lead choice in Settings.

Runtime check on 14 October 2026: the Sure Imports process formerly occupying port 3001 was stopped at the owner's request. UnsaidBox now runs at http://localhost:3001; an HTTP check returned 200 with the UnsaidBox page title. The popup is enabled. Its updated invitation and signup dialog use clearer typography, consistent field spacing, aligned consent, a full-width primary action and a quieter secondary action.

## Validation

`npm run typecheck`, `npm run db:validate`, and the test suite cover consent eligibility/history, list ownership, preserving shared suppression, recipient reconciliation, template injection, duplicate submission, uncertain provider responses and CAPTCHA/admin guards. Production signup, actual mailbox receipt, confirmation, replay rejection, Brevo list addition and withdrawal were verified. No real audience campaign was sent because there are no real opted-in recipients yet.

API references used: [contact updates](https://developers.brevo.com/reference/update-contact), [campaign creation](https://developers.brevo.com/reference/create-email-campaign), [campaign submission](https://developers.brevo.com/reference/send-email-campaign-now), [domain configuration](https://developers.brevo.com/reference/get-domain-configuration).

## Weekly blog digest — 14 October 2026

Owner requested automatic Sunday sends at 18:00 Europe/London. Two Vercel UTC triggers (17:00 and 18:00 Sundays) call the secret-authenticated endpoint; its UK local-hour check allows only the correct trigger. DST-aware publication windows meet at Sunday 18:00 without gaps or overlaps. No client-supplied date override exists.

Each edition features up to three newly published public blog posts from the preceding weekly window, with conversational introductions, excerpts and direct article links. No new posts means no email. No subscribers means the edition is recorded as SKIPPED. All normal consent reconciliation and Brevo suppressions apply; the existing 100-address limit fails closed.

The date determines a unique campaign ID. Creation uses the audience lock, and dispatch uses the existing durable claim. Repeated invocations never resubmit an edition. Timeouts, crashes or uncertain provider outcomes require administrator review; the system favors preventing duplicate email over automatic recovery. Public visibility is rechecked before sending. No schema migration was needed.

The opt-in statement is now version 2026-10-14-v2 and explicitly names the weekly blog digest. Dashboard invitation and public signup explain Sundays at 6pm UK time. Existing consent history is preserved. Creating an account does not subscribe it.

Requested test previews were submitted to nkwochatochukwu@gmail.com, including the final cleaned-up version. Brevo accepted them; inbox receipt is not independently confirmed. The preview does not enroll that address. Evidence is in weekly-digest-test.json; the HTML preview is weekly-digest-preview.html.

Dashboard invitation uses a responsive split card with a schedule badge, explicit unchecked shared Checkbox, clear save action and decline instructions. Its server-rendered preview is dashboard-digest-preview.html. Successful choices keep the existing dismissal behavior; Settings retains control.

Production activation verified: Vercel reports both weekly cron definitions enabled for deployment dpl_Haanw7pQFjV7kejtSua44V7ugF8H. First scheduled edition: Sunday 18 October 2026 at 18:00 Europe/London, subject to new posts and eligible subscribers.

## Single-post format and subscriber groups — 14 October 2026

The owner revised the Sunday email to focus on one blog post, discuss its lessons conversationally, and link to the full article. Selection now takes only the newest public post in the weekly window. Lesson passages come from that article; the current workshop article has a source-checked conversational adaptation. Other articles use short sourced passages with conversational framing rather than invented takeaways.

Admin Email now reports distinct local subscriber groups: no account, verified account with no current questions, verified account with questions, and an account awaiting email verification. It lists the latest 100 confirmed subscribers without accounts, including name, address and confirmation date. Pending and withdrawn signups are excluded. Account email matches update classification on the next view; account withdrawal/suspension wins. Provider suppression can further reduce delivery eligibility.

Only opted-in, verified active account holders with zero current Question records receive the help section within the same weekly email. It asks what is getting in the way and invites replies to hello@unsaidbox.com. Deleted historical questions are not counted; the copy avoids claiming the person has never created a question. Readers without accounts do not receive this account-specific prompt.

The new Brevo normal/text attribute UNSAIDBOX_AUDIENCE_STAGE stores only the UnsaidBox stage. It is refreshed for eligible recipients under the existing audience lock immediately before a weekly send. No question text, responses or other brands' attributes are copied or overwritten. Missing/mistyped attribute configuration fails closed. The internal conditional block is generated by trusted code; user-provided template expressions remain prohibited.

Two real test emails to the dedicated UnsaidBox mailbox verified that Brevo renders the help section for NO_QUESTION and hides it for NO_ACCOUNT. Actual mailbox receipt was checked for both, raw template syntax was absent, and the test contact's prior field value was restored. No test contact was subscribed. Evidence: digest-personalization-verification.json. The Gmail test is a preview with the help section included for review; it does not enroll that mailbox.
