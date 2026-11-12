# BirrX

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

Set email OTP expiry to 10 minutes, and configure custom SMTP before public registrations. Supabase’s built-in email service is restricted to project team addresses and has strict sending limits. See [email templates](https://supabase.com/docs/guides/auth/auth-email-templates) and [SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp). Account requests require internet; existing local finance tools work offline. Passwords and email codes are not saved by BirrX; Supabase’s SDK persists and refreshes the session on this device. Device sign-out removes that session without clearing finance records.

The BirrX project is connected locally through ignored `.env.local`. Email sign-in and registration are enabled. Turn off Confirm email in the project dashboard for immediate registration. Recovery email codes and SMTP can be configured separately. Environment values must also be configured in Vercel for hosted builds.

A phone-width Ethiopian personal-finance app built with React, TypeScript, Vite, Tailwind CSS and IndexedDB. No server account or bank connection is required.

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

Demo data is seeded once: 10 transactions across October and November 2026; CBE and Telebirr balances; Data and Voice packages; an emergency-fund goal; and recurring rent. November starts at **34,500 ETB income, 12,535 ETB spending, 21,965 ETB net**. Confirm the TB1042 transfer in the review inbox to get **32,000 / 10,035 / 21,965 ETB**. Undo restores the initial totals. The 5 ETB fee stays spending.

All money uses integer santim. `src/domain.ts` supplies the shared reporting, reconciliation, import and export logic. Dates and optional times represent East Africa Time; missing times stay unknown. The Ethiopian calendar setting changes displayed dates, while Gregorian date-entry controls are explicitly labeled and stored dates remain unchanged. Reporting periods retain their Gregorian boundaries.

The balance is the sum of latest account reports, independent of cash-flow totals. An unavailable report differs from zero. Review/edit balances or add an account under Settings. Balances are reported snapshots, not computed live bank balances. Older reports cannot replace newer ones.

The Transactions calendar has a report account selector beside its date control. It filters the period totals, day counts and account activity together. It includes All, CBE, BOA and Telebirr; BOA is available for imported or manually added records.

Transactions saves its own reporting period independently of Overview. Its calendar controls the calendar report, activity list and CSV export. The header calendar is hidden on Transactions; elsewhere it controls the Overview/Plan reporting period. Both period selections survive reloads.

Calendar cells show signed income and spending instead of transaction counts: daily totals in Month view, monthly totals in Year view, and hourly totals in Day view. Values are compact on screen, exact in accessible descriptions and report totals, red for spending, and hidden when amounts are hidden. Transactions without a time appear in the Unknown hour bucket.

The cash-flow chart has a remembered Week/Month toggle. Week shows the selected anchor month; Month compares all months in the selected year. Bars open exact transaction drill-downs. The axis includes 10k, 20k and 50k ETB gridlines, with extra headroom for higher totals.

Overview summary tiles label their totals with the anchor month and year.

Monthly limits are saved per Gregorian month. Goal contributions affect goal progress only. Recurring commitments become expenses only through **Post payment**; posting advances the due date by one month.

Imports preview valid, invalid and duplicate rows. Duplicate identity is normalized account + reference, including duplicates in one file and repeat imports. CSV columns are `date,bank,merchant,direction,amount,reference`; optional columns are `time,person`. Direction is `Debit` or `Credit`. The supported pasted format is:

```text
DEMO | Telebirr | Debit | 125.00 | Blue taxi | 2026-11-11 | DEMO-551
```

Paste SMS now also recognizes the supplied CBE, BOA and Telebirr message structures. Select the actual sender (CBE, BOA, 127, 994, 251994, 810 or telebirr). Unknown structures remain in review; accepting a sender does not imply every message format from that sender is supported. Paste one sender's messages at a time. Multiple `Dear …` messages are split into individual previews. Supply the original SMS receipt date/time when the body has no date. No date is inferred from a reference, URL or expiry date. Native scanner callers can supply an ISO `receivedAt` timestamp with timezone; it is converted to EAT.

CBE and Telebirr principal amounts and separately stated charges create separate records. CBE totals are checked against principal + service charge + VAT + Disaster Recovery. BOA's maintenance debit already includes taxes; repeated generic and descriptive alerts with the same receipt reference become one enriched record. CBE receipt tokens preserve case. Reported bank balances only advance to newer known timestamps. Each bank currently maps to one owned account mask; another owned mask is held for review rather than combined silently.

994/251994 activations, 75% usage, exhaustion and expiry notices update structured packages without adding expenses. The 127 payment is the expense. Voice night bonuses remain separate from daytime allowances. Expiry notices do not mark a plan exhausted early. Unmatched or ambiguous package updates require the corresponding activation and original message timestamp. Expired/exhausted SMS packages are not shown as active; SMS packages replace demo packages in the deck. Prepaid recharge notices update a separate airtime snapshot, not bank income or spending.

Unrecognized messages can be reviewed manually. Only date/status metadata is retained. Raw pasted text and receipt images are never persisted; receipt links are parsed for identity without opening them. Tests use artificial names, account masks, phone numbers and references. Hide amounts masks text, chart values, chart geometry, accessible labels and monetary edit inputs. An explicitly requested CSV export still contains the filtered financial records. SMS imports add to the current workspace; they do not reset existing demo or edited records.

The app is an installable Progressive Web App (PWA) with full offline caching via a Service Worker (`sw.js`). Static assets, layouts, styles, and cached data load instantly without an active internet connection on iOS Safari and Android Chrome/Edge.

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
> If distributing BirrX outside Google Play (such as direct APK installation, GitHub Releases, or F-Droid), no Google Play restriction applies and native SMS scanning works unrestricted.

## Verification

- Production TypeScript/Vite build passes.
- Unit tests cover exact santim calculations, reporting, reconciliation, CSV imports and the SMS structures above. SMS cases check separate fees, exact tax sums, repeated BOA alerts, missing dates, latest balance order, account masks, CSV seconds, receipt identity, package lifecycle, prepaid airtime and absence of raw message text in stored state. Run `npm test` for the current count.
- Browser persistence suite: while the dev server runs, open `/qa/persistence.html` and click **Run persistence tests**. Seven tests use an isolated temporary IndexedDB database to verify seeding, edits, deletions, notes, preferences, monthly limits and reconciliation persistence.
- Browser checks covered tabs, detail editing, remembered category rule, note reload, import repeat detection, transfer confirm/undo, consistent October reporting, goal contributions, hidden amounts, Ethiopian date display, browser Back, package cycling and dragging the deck to Accounts.
- SMS browser checks used a separate local test origin with artificial messages: Telebirr save/rescan after reload, BOA date validation and duplicate fee enrichment, a package activation with no new spending, and hidden amounts including the raw-text editor. SMS preview fit 360, 390 and 430 pixel widths without horizontal overflow.
- People filters were checked at 360, 390 and 430 CSS pixels. The bottom navigation has safe-area clearance. The Overview deck is the only horizontal scroller.
- The reference HTML was inspected as source. A browser security policy blocked its local-file URL, so the requested interactive reference walkthrough could not be performed.

## Device integration limits

SMS inbox reading, continuous background message processing, real device authentication/encrypted app lock and reliable closed-app stats delivery require native integration. The browser provides manual entry, CSV, pasted-message import, real permission-status checks, notification permission requests and receipt file/camera capture where supported. Camera/notification APIs may need HTTPS; a local-network HTTP page offers file selection and manual alternatives.

App lock is explicitly a demo privacy cover with PIN **2468**, not encryption. Stats scheduling is a saved demo preference. Reference rates are manual, not live. The interface is English; Amharic is a saved preference clearly marked as awaiting translation. No analytics, cloud sync, live banking or payment execution is included.

### Android notifications

Open Settings > Notifications, allow Android permission, then enable transaction, plan, goal and recurring-payment alerts separately. Send a test notification from the same screen.

Supported incoming financial SMS creates a private notification even while the app is closed (except when Android force-stops the app). Tap it to sync and open the matching transaction category editor; unsupported or ambiguous messages open Review. Historical inbox rescans do not send a notification per imported SMS. Manual entries/imports can also open their transaction from a notification.

Plans alert at 80% and 100% of the current month's limit. Goals alert at 50% and completion, with weekly Monday reminders for unfinished goals. Recurring payments remind at 09:00 EAT the day before and on their due date, including a catch-up reminder for overdue items. Monthly planning reminders open Plan. Editing/deleting items refreshes pending reminders; reminders do not create transactions or goal contributions. Reminder scheduling is bounded to the next 60 alerts; reopen BirrX periodically to refresh the horizon. Android may delay these inexact reminders for battery saving. Notification text contains no amounts or personal names. Browser notification support is limited to the test action while open; background SMS/reminders use Android.
