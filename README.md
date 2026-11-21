# BirrX

## Categories

Selectors use a shared BirrX bottom sheet in light and dark themes. Categories show their icons, colors, groups and favorites; accounts show bank logos; direction filters show arrows and descriptions. Longer lists support search. Pickers support keyboard navigation, focus restoration and browser/Android Back without closing a parent transaction sheet. Filter controls retain their compact phone layout, while option rows have comfortable touch targets. Native hidden form controls keep form submission values intact without opening the system radio-list UI.

Category choices use wrapping pill buttons with a category-colored outline icon on the left, label on the right and a softly tinted background. Favorites appear in their own group without star decorations in the picker; selected choices show a checkmark. Search opens only when tapped. Android Back first dismisses the top picker or detail dialog; normal page navigation or app exit happens only when no dialog consumes Back. This native Back change requires rebuilding and reinstalling the Android APK.

Tap the star beside any category to move it into **Favorites** at the top of the page. Tap again to remove it. Favoriting a hidden category also shows it. Favorites appear first in pickers, survive edits and reloads, and are included in backups. Hiding a favorite keeps its star saved while moving it to Hidden until shown again.

Open **Profile → Categories** to search, show/hide, edit icons and colors, or create custom categories. The catalog includes the special Internal Transfer, Loan, Owed and Repayment categories, the existing BirrX categories, and Airtime & packages, Bills, Charity, Coffee, Eating out, Education, Events, Family, Food delivery, Friends, Groceries and Lottery. Food and Fun retain their nested categories.

Custom categories have a name of up to 30 characters, Money out/Money in/Both ways selection, an icon, color controls and an optional Food or Fun parent. Transaction details and category spending limits use dropdown pickers. Hidden categories remain available on records already using them and stay included in reports. Existing free-text labels are retained. Renaming a custom category updates its records, remembered rules and category limits; deleting it requires confirmation and moves references to Other without deleting transactions. Built-in names and the Other fallback are protected. Categories are saved locally and included in backup files; older backups still work.

Category direction controls picker availability. It does not change a transaction’s sign, income/spending treatment or own-account transfer decision. Confirm own transfers separately in Inbox.

## Backup and restore

Open **Profile → Backup & restore → Export backup**. Browsers download a `birrx-backup-*.json` file. Android writes `birrx-backup.json` into app cache and opens the native share sheet so you can save or send it. The cache file is replaced on the next export; save a copy outside the app for recovery after uninstalling.

Backups include transactions, reported account balances, packages, airtime, notes, goals, commitments, budgets, category rules, transfer decisions, review metadata and preferences. They exclude authentication sessions, passwords, raw SMS bodies, receipt images, scanner checkpoints and notification delivery history. Files contain readable private financial information and are not encrypted.

Choose a backup file (maximum 10 MB) to validate its version, checksum, schema, integer santim, dates, duplicate records and transfer relationships. Review the counts and explicitly confirm replacement. Restore replaces the workspace rather than merging it, so repeated restore does not duplicate records. The write and an automatic pre-restore snapshot are committed in one IndexedDB transaction. **Undo last restore** offers a confirmed return to that snapshot, including after reloading. Each restore replaces the undo snapshot; edits made since the snapshot are replaced when undoing.

Restore keeps this installation’s sign-in session, notification controls, delivery history and app-lock preference. It resets scanner checkpoints for a deduplicated inbox rescan. Restoring is blocked during SMS scans, and restored records do not generate new-transaction alerts. Cloud backup and cross-device sync are not enabled by file backup.

## Email accounts

Profile contains registration, email verification, sign-in, password recovery, password changes and device sign-out. Financial records remain in this installation’s IndexedDB workspace; signing in does not upload them, provide cloud backup, or isolate records between accounts on a shared device.

Enable Email authentication with **Confirm email turned off** and a minimum password length of 8. Registration then creates a signed-in session immediately without a confirmation email. Copy `.env.example` to `.env.local` and set the project URL and **publishable** key. Never use a secret or service-role key. Restart Vite after changing environment variables. Vercel needs the same two `VITE_` variables and a new deployment. Android embeds these variables during `npm run build`, followed by `npx cap sync android` and Run in Android Studio.

If email confirmation is enabled in the future, configure the Supabase **Confirm signup** email template to include a code (the app does not use email redirect links):

```html
<h2>Verify your BirrX email</h2>
<p>Enter this code in BirrX: {{ .Token }}</p>
```

Configure **Reset password** similarly:

```html
<h2>Reset your BirrX password</h2>
<p>Enter this recovery code in BirrX: {{ .Token }}</p>
```

Set email OTP expiry to 10 minutes, and configure custom SMTP before public registrations. Supabase’s built-in email service is restricted to project team addresses and has strict sending limits. See [email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp). An internet connection is required each time BirrX opens or returns to the foreground, even with a saved sign-in. Financial data remains stored locally. Passwords and email codes are not saved by BirrX; Supabase’s SDK persists and refreshes the session on this device. Device sign-out removes that session without clearing finance records.

The BirrX project is connected locally through ignored `.env.local`. Email sign-in and registration are enabled. Turn off Confirm email in the project dashboard for immediate registration. Recovery email codes and SMTP can be configured separately. Environment values must also be configured in Vercel for hosted builds.

A phone-width Ethiopian personal-finance app built with React, TypeScript, Vite, Tailwind CSS and IndexedDB. Email registration/sign-in requires internet. Financial records stay on this device; BirrX does not connect to bank accounts or execute payments.

## Run

Use Node.js 22.12 or newer. From this directory:

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Open the Network URL printed by Vite from a phone on the same Wi-Fi. Keep the terminal running. Each browser/origin has its own data; localhost and a network IP do not share storage.

```sh
npm test
npm run build
```

The production output is `dist/`. To preview it:

```sh
npm exec vite preview -- --host 0.0.0.0
```

## Data and behavior

New installations start with an empty workspace and the current month selected. Existing workspaces are preserved. SMS scans import supported messages after permission is granted.

All money uses integer santim. `src/domain.ts` supplies the shared reporting, reconciliation, import and export logic. Dates and optional times represent East Africa Time; missing times stay unknown. The Ethiopian calendar setting changes displayed dates, while Gregorian date-entry controls are explicitly labeled and stored dates remain unchanged. Reporting periods retain their Gregorian boundaries.

The balance is the sum of latest account reports, independent of cash-flow totals. An unavailable report differs from zero. Review/edit balances or add an account under Settings. Balances are reported snapshots, not computed live bank balances. Older reports cannot replace newer ones.

The Transactions calendar has a report account selector beside its date control. It filters the period totals, day counts and account activity together. It includes All, CBE, BOA and Telebirr; BOA is available for imported or manually added records.

Transactions saves its own reporting period independently of Overview. Its calendar controls the calendar report, activity list and CSV export. The header calendar is hidden on Transactions; elsewhere it controls the Overview/Budgets reporting period. Both period selections survive reloads.

Calendar cells show signed income and spending instead of transaction counts: daily totals in Month view, monthly totals in Year view, and hourly totals in Day view. Values are compact on screen, exact in accessible descriptions and report totals, red for spending, and hidden when amounts are hidden. Transactions without a time appear in the Unknown hour bucket.

The cash-flow chart has a remembered Week/Month toggle. Week shows the selected anchor month; Month compares all months in the selected year. Bars open exact transaction drill-downs. The axis includes 10k, 20k and 50k ETB gridlines, with extra headroom for higher totals.

Overview summary tiles label their totals with the anchor month and year.

Monthly limits are saved per Gregorian month. Goal contributions affect goal progress only. Recurring commitments become expenses only through **Post payment**; posting advances the due date by one month.

Imports preview valid, invalid and duplicate rows. Duplicate identity is normalized account + reference, including duplicates in one file and repeat imports. CSV columns are `date,bank,merchant,direction,amount,reference`; optional columns are `time,person`. Direction is `Debit` or `Credit`. The supported pasted format is:

```text
DEMO | Telebirr | Debit | 125.00 | Blue taxi | 2026-11-11 | DEMO-551
```

Paste SMS recognizes the supplied CBE, BOA, Awash, Zemen Bank, Dashen Bank and Telebirr message structures. Select the actual sender (CBE, BOA, Awash Bank, Zemen Bank, Dashen Bank, 127, 994, 251994, 810 or telebirr). Local parsing first normalizes equivalent currency, account-label, digit, date and wording variants, then uses verified templates and a conservative field fallback. Failed/pending/reversed payments, conflicting fields and uncertain fee breakdowns stay in review. Reference-less CBE/BOA alerts require an account, precise timestamp and reported balance for a deterministic duplicate identity. Parser upgrades trigger a full deduplicated rescan without replacing edits. Unknown structures remain in review; accepting a sender does not imply every message format from that sender is supported. Paste one sender's messages at a time. Multiple `Dear …` messages are split into individual previews. Supply the original SMS receipt date/time when the body has no date. No date is inferred from a reference, URL or expiry date. Native scanner callers can supply an ISO `receivedAt` timestamp with timezone; it is converted to EAT.

CBE and Telebirr principal amounts and separately stated charges create separate records. CBE totals are checked against principal + service charge + VAT + Disaster Recovery. BOA's maintenance debit already includes taxes; repeated generic and descriptive alerts with the same receipt reference become one enriched record. CBE receipt tokens preserve case. Reported bank balances only advance to newer known timestamps. Each bank currently maps to one owned account mask; another owned mask is held for review rather than combined silently.

994/251994 activations, 75% usage, exhaustion and expiry notices update structured packages without adding expenses. The 127 payment is the expense. Voice night bonuses remain separate from daytime allowances. Expiry notices do not mark a plan exhausted early. Unmatched or ambiguous package updates require the corresponding activation and original message timestamp. Expired/exhausted SMS packages are not shown as active; SMS packages replace demo packages in the deck. Prepaid recharge notices update a separate airtime snapshot, not bank income or spending.

Unrecognized messages can be reviewed manually. Only date/status metadata is retained. Raw pasted text and receipt images are never persisted; receipt links are parsed for identity without opening them. Tests use artificial names, account masks, phone numbers and references. Hide amounts masks text, chart values, chart geometry, accessible labels and monetary edit inputs. An explicitly requested CSV export still contains the filtered financial records. SMS imports add to the current workspace; they do not reset existing demo or edited records.

The app is an installable Progressive Web App (PWA) with static-file caching via a Service Worker (`sw.js`). Cached assets improve loading, but the app requires a successful connection check on launch and resume. The check sends no financial records and does not sign users out.

## Android Native Integration & SMS Inbox Scanning

BirrX includes a native Android wrapper using Capacitor and a custom Java plugin (`SmsScannerPlugin`) paired with a broadcast receiver (`SmsBroadcastReceiver`) for automatic local SMS parsing.

### Architecture & Capabilities

1. **Inbox Scanning (`READ_SMS`)**:
   - Reads directly from `content://sms/inbox` via Android's `ContentResolver`.
   - Normalizes and filters solely by official banking senders: `CBE`, `BOA`, `127`, `994`, `251994`, `810`, and `TELEBIRR`. Senders are verified from SMS envelope metadata, never inferred from message body text.
   - Sorted chronologically (`date ASC`) with batch pagination (default 50 messages/batch; scans continue through the complete inbox).
   - Incremental scanning: stores `lastSmsScanTimestamp` and queries newer messages with a 2-hour safe overlap window to prevent missing messages delivered with delay.
   - Built-in `AbortSignal` allows stopping or canceling inbox scans at any point.

2. **Incoming SMS Detection (`RECEIVE_SMS`)**:
   - `SmsBroadcastReceiver` registers for `android.provider.Telephony.SMS_RECEIVED` protected by `android.permission.BROADCAST_SMS`.
   - Parses PDUs, filters supported banking senders, and pushes incoming messages to the active app session via Capacitor listener. Closed-app background processing is not implemented; reopening the app scans missed inbox messages.
   - Scans serialize across startup and manual entry, apply each batch to the latest workspace, and persist review metadata without SMS text. Interrupted scans retain the prior checkpoint and safely deduplicate on retry.

3. **Privacy & Data Model Guarantee**:
   - **Transient Bodies**: Raw SMS message bodies are strictly transient. They are passed directly to `parseSms()` and immediately discarded. No raw SMS text, phone numbers, or unrelated messages are ever written to IndexedDB, local storage, analytics, or error logs.
   - **Local-Only**: Parsing and storage happen 100% on-device inside IndexedDB. No cloud servers, external APIs, or analytics are contacted.
   - **Idempotency**: Repeated scans are completely safe. Deduplication uses the existing transaction `ref`, account mask, and timestamp deduplication logic.

4. **Web & Vercel Fallback**:
   - The web app running in browser contexts (e.g. Vercel deployment) cleanly detects platform support via `isAndroidNative()`.
   - If accessed on web browsers or iOS, the app indicates SMS scanning is unavailable and directs the user to the existing **Paste SMS** import workflow.

### Android Toolchain & Build Instructions

#### Prerequisites
- **Android SDK**: Install API 36 to compile; minimum supported runtime is API 24.
- **JDK**: Java Development Kit 21 (required by the installed Capacitor Android project).
- **Android Studio** (recommended) or standalone Android Command Line Tools with `gradle`.

#### Build & Run Commands

```sh
# 1. Build the production web bundle
npm run build

# 2. Sync web bundle and native plugins into the Android project
npx cap sync android

# 3. Open project in Android Studio (optional)
npx cap open android

# 4. Or build debug APK directly via Gradle (requires JDK and ANDROID_HOME set)
cd android
./gradlew assembleDebug
# On Windows PowerShell:
# .\gradlew.bat assembleDebug

# 5. Install debug APK to connected Android device or emulator via ADB
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Google Play Distribution Policy Note

> [!WARNING]
> **Google Play SMS Policy Restriction**
> Google Play strictly limits the use of `android.permission.READ_SMS` and `android.permission.RECEIVE_SMS`. Apps published to the Google Play Store requesting these permissions must either be registered as the user's default SMS handler or qualify for specific financial transaction verification exceptions under the [Google Play Permissions Policy](https://support.google.com/googleplay/android-developer/answer/10208820).
>
> Direct APK distribution is still subject to Android permissions, device security checks such as Play Protect, and applicable privacy requirements.

See [PLAY_RELEASE.md](PLAY_RELEASE.md) for signing instructions, a draft SMS-permission declaration, and remaining Play Console work.

## Verification

- Production TypeScript/Vite build passes.
- Unit tests cover exact santim calculations, reporting, reconciliation, CSV imports and the SMS structures above. SMS cases check separate fees, exact tax sums, repeated BOA alerts, missing dates, latest balance order, account masks, CSV seconds, receipt identity, package lifecycle, prepaid airtime and absence of raw message text in stored state. Run `npm test` for the current count.
- Browser persistence suite: while the dev server runs, open `/qa/persistence.html` and click **Run persistence tests**. Seven tests use an isolated temporary IndexedDB database to verify seeding, edits, deletions, notes, preferences, monthly limits and reconciliation persistence.
- Browser checks covered tabs, detail editing, remembered category rule, note reload, import repeat detection, transfer confirm/undo, consistent October reporting, goal contributions, hidden amounts, Ethiopian date display, browser Back, package cycling and dragging the deck to Accounts.
- SMS browser checks used a separate local test origin with artificial messages: Telebirr save/rescan after reload, BOA date validation and duplicate fee enrichment, a package activation with no new spending, and hidden amounts including the raw-text editor. SMS preview fit 360, 390 and 430 pixel widths without horizontal overflow.
- People filters were checked at 360, 390 and 430 CSS pixels. The bottom navigation has safe-area clearance. The Overview deck is the only horizontal scroller.
- The reference HTML was inspected as source. A browser security policy blocked its local-file URL, so the requested interactive reference walkthrough could not be performed.

## Device integration limits

The Android build includes SMS inbox access, incoming-message notifications and device-authenticated app lock. Continuous closed-app transaction parsing, record encryption and reliable closed-app stats delivery are not implemented. The browser provides manual entry, CSV, pasted-message import, real permission-status checks, notification permission requests and receipt file/camera capture where supported. Camera/notification APIs may need HTTPS; a local-network HTTP page offers file selection and manual alternatives.

Android app lock uses system fingerprint or device screen-lock authentication. Its enablement is stored in native device preferences; enabling and disabling require device authentication. Native content is covered and screenshots are blocked while app lock is enabled. Background content is always covered. Auto-lock delay options are immediately, 30 seconds, 1 minute, 5 minutes and 15 minutes; a cold start and Lock now always require authentication. The delay is saved only on the native installation. Android 11+ supports strong biometrics with screen-lock fallback; Android 7–10 uses the device credential prompt. App lock is unavailable in the web app and does not encrypt IndexedDB or exported files. Existing demo PIN settings no longer enable a lock; enable Device app lock in Settings. Stats scheduling is a saved demo preference. Reference rates are manual, not live. The interface is English; Amharic is a saved preference clearly marked as awaiting translation. No analytics, cloud sync, live banking or payment execution is included.

### Android notifications

Open Settings > Notifications, allow Android permission, then enable transaction, budget, goal and recurring-payment alerts separately. Send a test notification from the same screen.

Supported incoming financial SMS creates a private notification even while the app is closed (except when Android force-stops the app). Tap it to sync and open the matching transaction category editor; unsupported or ambiguous messages open Review. Historical inbox rescans do not send a notification per imported SMS. Manual entries/imports can also open their transaction from a notification.

Budgets alert at 80% and 100% of the current month's limit. Goals alert at 50% and completion, with weekly Monday reminders for unfinished goals. Recurring payments remind at 09:00 EAT the day before and on their due date, including a catch-up reminder for overdue items. Monthly budget reminders open Budgets. Editing/deleting items refreshes pending reminders; reminders do not create transactions or goal contributions. Reminder scheduling is bounded to the next 60 alerts; reopen BirrX periodically to refresh the horizon. Android may delay these inexact reminders for battery saving. Notification text contains no amounts or personal names. Browser notification support is limited to the test action while open; background SMS/reminders use Android.

## Awash SMS support

Awash/AwashBank senders support merchant parking payments, outgoing interbank transfers with separate service charge, VAT and EDRRF, and incoming account credits. A valid Awash receipt identifies the record; links are not opened. Undated transfer alerts use the SMS receipt timestamp (manual paste requires its receipt date). Cashback text does not create income. Newly supported formats trigger a deduplicated full rescan; accounts appear only after actual import.

Telebirr SMS parsing also supports the supplied Amharic person-to-person sends/receipts, transfers to CBE, and deposits from CBE. Fees remain separate expenses; loan due notices do not create payments. Other Amharic templates still need samples. This does not change the app interface language.

Multiple accounts at the same bank are identified by the owned account mask in SMS messages, with separate reported balances and account filters (for example CBE · 1569 and CBE · 2888). CBE BranchReceipt credits and monthly service-fee alerts use the SMS receipt timestamp; a fee without a receipt uses a stable structured identifier. CSV exports include account_mask; include it when importing a bank with multiple accounts. Telebirr deposits from CBE and Bank of Abyssinia are supported.

Android startup checks notification permission after sign-in and requests it once before SMS setup. After allowing notifications, unset alert types are enabled; existing Off preferences are retained. First-time SMS setup scans automatically once SMS access is granted, then offers Continue to BirrX. Scan failures offer recovery and users can continue without granting either permission.

Android alerts are swipe-dismissible and request automatic cancellation 30 seconds after delivery (Android 8+). The in-app notification inbox is retained. Android/OEM accessibility and notification settings control heads-up visibility; BirrX cannot force a pop-up to remain visible for 30 seconds. A repeatable local Capacitor patch is applied by `npm install` and `npm run build`; keep `scripts/patch-notification-timeout.mjs` when updating native dependencies. Cash-flow axes use actual weekly/monthly income and spending, equally spaced adaptive ticks and headroom, with no fixed 50,000 ETB floor.

Daily insights and Sunday weekly insights are enabled by default when Android notification permission is allowed. Both target 21:00 East Africa Time and can be disabled independently in Settings → Notifications. Native alarms re-arm after delivery and restore after reboot or clock/timezone changes; Sunday combines both summaries into one wake-up. Android battery restrictions can defer inexact alarms, and force-stopping the app prevents delivery until it is opened again. Alerts contain no precomputed financial totals: tapping opens Budgets → Reports with the original day or Monday–Sunday range and the latest local totals, categories, fees and activity. Home and Transactions periods are preserved. Notifications remain swipe-dismissible with the existing 30-second timeout.

Account isolation: authenticated workspaces now use a separate IndexedDB database per Supabase user ID. Sign-in changes remount the app and queued writes retain their original database name. Onboarding, notification inbox and read/dismissed markers are account-scoped. Deletion requires the server-confirmed user ID and clears only that account's database and restore point. Backup restore keeps the current workspace owner and cannot switch ownership using backup contents. The former shared `birrx` database is left unassigned rather than automatically attached to whichever account signs in next. Records already erased by an older shared-workspace deletion are not recoverable from sign-in; restore a backup or reimport original SMS where available.

### Branded password-recovery email (Supabase + Resend)

In the BirrX Supabase project, open Authentication → Email → Templates → Reset password (some dashboard versions show Email Templates directly). Set the subject to `Reset your BirrX password` and replace the entire body with `supabase/templates/recovery.html`. Save. The template uses `{{ .Token }}`, not a reset link; the app verifies it with the `recovery` OTP type. Leave Confirm email disabled as previously configured. Template changes apply in Supabase, not through a Vercel deployment or Capacitor sync.

For production delivery, verify a domain you own in Resend by adding its required DNS records. A default vercel.app URL or Gmail address cannot serve as your verified sending domain. Create a Resend sending API key, scoped to that domain where available, and enter it privately in Supabase Authentication → Email → SMTP Settings:

- Sender name: BirrX
- Sender address: a mailbox on your verified domain (choose your actual address)
- Host: smtp.resend.com
- Port: 465
- Username: resend
- Password: your Resend API key

Enable custom SMTP and save. Never put the SMTP password in frontend code, VITE_ variables, or the APK. The GEMINI_API_KEY secret is unrelated. See https://resend.com/docs/send-with-supabase-smtp and https://supabase.com/docs/guides/auth/auth-email-templates.

Test using an existing disposable BirrX account: Forgot password → receive the branded code → verify the latest code → set a new password → sign in using it. Also check an incorrect code, resend cooldown, and spam folder. SMTP delivery and live recovery still require this dashboard configuration and a real inbox test. The local recovery UI test mocks Auth; it does not prove delivery. The recovery session stays outside the financial workspace until the password is saved and the user signs in normally.

Account records, onboarding, and notification inbox preferences are scoped to the authenticated user ID. Legacy shared records are preserved in the old database without assigning an owner. Export a backup before updating an older shared-workspace build; restore it while signed into its original account.

Resend setup is postponed. Supabase default email is for testing only: delivery is restricted to project-team addresses and currently limited to two emails per hour. General user recovery requires custom SMTP. See https://supabase.com/docs/guides/auth/auth-smtp.


Internal transfers are automatically reconciled after SMS imports, workspace load/restore, and transaction edits. Both legs must be uniquely matched on different accounts: shared references or an explicit bank route/account-mask match plus close timestamps. Amount/time alone never proves ownership. Matching principal legs are excluded from income/spending; fees remain expenses. Explicit user decisions override automation, and automatically inferred matches are re-evaluated when late messages or edits introduce ambiguity. Original SMS dates/times are used, not forwarding timestamps.

For the owner-confirmed BOA-to-Telebirr pattern, a unique routed match within two minutes with exactly a 12 ETB difference can be split into the received principal and an expense labelled as inferred from the SMS difference. This is not a universal BOA tariff: arbitrary differences are not inferred. The original gross debit is retained in structured metadata and restored if the match is undone or becomes ambiguous. Existing balances are never recomputed from this classification. Reviewed transfers remain accessible with Undo, with history displayed in pages of 20. Parser version 14 rechecks older SMS for additional reference/account evidence.

Apollo SMS support includes older A/C No. / Ref No. alerts, dated account-number debit and credit alerts, BOA-hosted receipt links, transfers labelled A/P TELE BIRR, and explicit successful loan repayments. Apollo is displayed separately with its supplied icon. Dated alerts use the transaction date; undated alerts require original SMS receipt metadata. No date is inferred from an FT reference or a forwarded-chat timestamp, and no unitemized Apollo charges are invented. Apollo/BOA route equivalence is used only for matching the separate opposite leg, without merging their accounts or balances.

Registered bank alert parsing is enabled in the normal SMS flow for Cooperative Bank of Oromia, Hibret, Nib, Wegagen, Amhara, Siinqee, Oromia, Berhan, Enat, Bunna, Lion, Tseday, Global Bank Ethiopia, Gadaa, Hijra, ZamZam, Ramis, Ahadu and Sidama. Each provider has its own sender aliases, account identity and per-bank tests; common parsing grammar is derived from the supplied CBE/BOA and related alert samples, not from bank-specific samples for these new registrations. Zemen, CBE Birr and other existing dedicated parsers remain in place. Native scanner and notification routing include all registered aliases. No Beta opt-in is required.

Accepted clear patterns include account debits/credits, reordered alerts, CBE-style debit/credit transactions and explicit account transfers. Amounts and references must be unambiguous; original SMS metadata supplies dates only when no transaction date is stated. Itemized fees are split and totals checked. Security codes and promotions stay ignored. Unknown financial formats stay reviewable instead of generating guessed records. Gadaa is mapped to Gadaa Bank, separately from Global Bank Ethiopia. No bank-supplied icons were available for the new registrations, so they use the existing fallback badges. Parser version 16 rechecks older SMS.
