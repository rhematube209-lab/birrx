# BirrX Google Play release preparation

This is a draft for the app owner to review against the exact release build. Nothing here has been submitted to Google Play.

## SMS permission declaration draft

**Requested use:** SMS-based money management. BirrX tracks transactions, spending and budgets from Ethiopian financial SMS messages. It requests `READ_SMS` to find supported financial messages already in the inbox, and `RECEIVE_SMS` to detect new supported financial messages. BirrX is not the default SMS app and does not send SMS messages. SMS access is optional; manual, CSV and pasted-message entry remain available.

**Data handling:** Local scanning matches supported sender identifiers and parses messages on the device. Structured transactions, account masks, balances, review metadata and settings are stored on the device. Message bodies are not saved as transaction records. With separate, per-analysis consent, the optional Gemini feature re-reads selected unresolved messages, masks full account and phone numbers and removes links before sending financial message content through a Supabase Edge Function to Google Gemini. Amounts, dates and names may be included. The backend stores usage counters; it does not intentionally store message bodies or AI responses. Verify the provider's current data-retention and billing terms before enabling AI for users. No SMS data is used for ads.

**Demonstration for reviewers:** Record a video of sign-in, the prominent SMS disclosure and Android permission prompt, an initial scan, a recognized bank transaction, the review inbox, the optional AI disclosure and confirmation, and the manual alternative. Use synthetic SMS and a test account. Supply test credentials in Play Console's App access section; do not put real financial messages in the review video.

Google lists SMS-based money management as a potentially eligible exception, subject to review: https://support.google.com/googleplay/android-developer/answer/10208820. Explain accurately why the permission is necessary for BirrX's core automatic tracking and describe the alternatives. Approval is not guaranteed.

## Release signing

Use the existing upload keystore if BirrX already has a Play signing identity. If not, create a new upload key in Android Studio using **Build → Generate Signed Bundle / APK → Android App Bundle → Create new**. Keep the keystore and its passwords in separate secure backups outside this repository. Losing or changing the key affects updates. Google Play App Signing manages the app-signing key and uses your upload key to authenticate uploads: https://developer.android.com/studio/publish/app-signing.

For command-line builds, set these environment variables for the current terminal session without committing the values:

- `BIRRX_KEYSTORE_PATH`: absolute path to the upload keystore.
- `BIRRX_KEYSTORE_PASSWORD`: keystore password.
- `BIRRX_KEY_ALIAS`: upload key alias.
- `BIRRX_KEY_PASSWORD`: key password.

Run `npm install`, `npm run build`, `npx cap sync android`, then from `android` run `./gradlew bundleRelease` (Windows: `.\\gradlew.bat bundleRelease`). The bundle is at `android/app/build/outputs/bundle/release/app-release.aab`. Verify the signer and ensure its certificate matches the intended upload certificate before uploading. Without all four signing variables, Gradle does not configure a release signing key; do not upload an unsigned bundle. Increment `versionCode` above every version already uploaded to the same Play app.

## Remaining Play Console work

- Complete App access instructions, Data safety, the Financial features declaration, the SMS Permissions Declaration, content rating and other App content forms for the actual build. A financial-tracking app should describe its features accurately; do not claim it is a bank, lender or payment provider.
- Publish an accurate, publicly accessible privacy policy and include its URL in Play Console and the app. Cover local storage, optional SMS scanning, optional Gemini transmission, authentication, account deletion, retention and a contact address. Confirm Google and Supabase terms for the configured plans.
- Complete account deletion support and its external deletion request page if required for the account creation flow. Verify the deletion behavior before submission.
- Finish real-device testing of the AI flow and verify the deployed function and usage quota. The function rejects unauthenticated calls; a complete authenticated Gemini test is still needed.
- Test a signed release on real devices, including both SMS permission choices, onboarding, notifications, dark theme, app lock and multi-account balances. Confirm review access works without requiring Google reviewers to supply their own banking messages.
- If Google Play Protect incorrectly blocks a verified release, use Google's developer appeal process: https://support.google.com/googleplay/answer/2812853. Do not describe signing or policy compliance as a guarantee that the warning will disappear.

## AdMob onboarding and first placement

Status: account creation, advertising SDK integration, consent testing and live ad serving are not complete. The current app does not request AdMob ads. Do not mark the existing build as containing an advertising SDK before one is actually integrated.

Owner setup:

1. Open https://admob.google.com/ and create the account using your actual country, identity and payment information. The owner must accept Google's terms and complete any verification.
2. In Apps, add an Android app named BirrX. If it is not published yet, select the unpublished option. The Android package is `com.birrx.app`.
3. Create a Banner ad unit named `Reports banner`. Record the App ID (`ca-app-pub-…~…`) and ad-unit ID (`ca-app-pub-…/…`). These identifiers are public configuration, not account credentials.
4. Configure Privacy & messaging for the audience and applicable regions. Review Google's UMP consent requirements before requesting ads.
5. After publishing, link the supported store listing, configure the developer website and its `app-ads.txt` using Google's exact publisher record, and complete app readiness verification. Do not publish invented publisher IDs.

Initial integration specification:

- One clearly labelled Sponsored banner beneath Reports content, including daily/weekly insight reports. No ads over financial controls or bottom navigation, and none in authentication, app lock, SMS permission or categorization flows.
- Development must use Google's demo App ID `ca-app-pub-3940256099942544~3347511713` and demo banner unit `ca-app-pub-3940256099942544/9214589741`. Demo ads earn no revenue. Verify current IDs at https://developers.google.com/admob/android/test-ads before implementation.
- Keep SMS bodies and SMS-derived balances, transaction amounts, categories, account identifiers and counterparties out of ad requests, targeting, logs and SDK bridges. Ad rendering must receive placement/layout information only.
- Obtain required consent before initializing/requesting ads, expose privacy choices where required, and handle denied consent, offline state and no-fill without blocking finance features.
- Before live release, inspect actual SDK data collection, update the privacy policy and Play Data Safety answers, set the Play Console Contains ads declaration, and test with the appropriate test-device configuration. A paid Remove ads product is a separate future integration.

## Store listing draft

**App name:** BirrX

**Short description:** Track Ethiopian bank accounts, wallets, spending, budgets and savings goals.

**Full description:**

BirrX helps you understand your everyday money across supported Ethiopian banks and mobile wallets.

Track income, spending and reported account balances. Review transactions, choose categories, set monthly budgets, contribute to savings goals and manage recurring commitments. Explore cash-flow and category reports, with daily and weekly insight reminders.

On Android, optional SMS access imports supported financial messages on your device. Manual entry, CSV and pasted-message import are also available. Unrecognized messages stay in review; optional AI analysis requires a separate confirmation before selected, masked message content is sent for analysis.

Choose English or Amharic, light or dark appearance, adjustable text sizes, and Gregorian or Ethiopian date display. Protect access with the supported Android device app lock and export backups when needed.

BirrX is a personal finance tracker, not a bank, lender or payment service. Reported balances come from available records and are not a live bank connection. Internet access is required when opening the app. Available SMS formats and device features vary.

Before submission: supply a support contact, public privacy-policy URL, account-deletion URL and reviewer access; verify every listed feature on the final signed build. Add advertising disclosures when the ad-enabled build is ready. This draft has not been published or submitted.

## Release preparation status — 21 November 2026

Publisher: Tameru. Support/privacy/deletion contact: rhematube209@gmail.com.

Prepared public pages: `public/privacy.html` and `public/delete-account.html`. After deploying the website, use its actual HTTPS origin plus `/privacy.html` and `/delete-account.html` in Play Console. These files are not a claim that the pages have been published. Check both URLs without signing in before submission.

The app includes Profile → BirrX account → Request account deletion. This opens an email draft, explicitly explains that the user must send it, and does not pretend deletion has already happened. The external deletion page offers the same path without requiring app installation.

Owner handling for email deletion requests: verify ownership via the registered address or a proportionate alternative; never request a password, OTP or banking statement. Delete the verified Auth user and associated per-user AI usage counters using server/admin access, record completion without retaining the request's financial content, and reply to the requester. Do not claim completion before processing succeeds. Explain that local app storage on every device, original SMS and exported backups require separate user/device action. Establish and publish your actual support response/retention practice before submitting; no invented processing deadline is stated.

An optional automated self-deletion backend is prepared, not deployed: run `supabase/migrations/202611210001_account_deletion.sql` after the existing quota migration; deploy `delete-account` using `releases/ai-deployment/delete-account.ts`. It validates the current bearer token through Auth, ignores caller-supplied user IDs, requires explicit DELETE confirmation, removes per-user usage and then hard-deletes that authenticated account. Never put a service-role key in the app. Test with a disposable account before connecting an automated frontend. Existing access JWTs can survive until expiry; privileged BirrX functions must continue verifying the user with Auth on every request.

Still required before release: public website deployment and working page URLs; owner review of privacy/provider retention and Data Safety answers; manual deletion-request handling test with a disposable account; reviewer access credentials; final real-device SMS, notifications, lock, language/calendar and upgrade-data checks; signed AAB verification and Play Console declarations. Ads remain postponed and no advertising SDK has been added.

## BirrX public release URLs

Website: https://birrx-sigma.vercel.app/

Privacy policy: https://birrx-sigma.vercel.app/privacy.html

Account deletion: https://birrx-sigma.vercel.app/delete-account.html

These are the intended Play Console URLs. The pages are prepared in this checkout but must be deployed and checked anonymously before submission. Do not treat the URLs as verified live merely because the website domain exists.

## Automated deletion implementation update

The local app now includes Profile → BirrX account → Delete account with current-password verification, DELETE confirmation and an acknowledgement. The standalone web route `/#DeleteAccount` bypasses SMS onboarding and notification-permission setup; users can sign in and delete without installing the app. Both use the same authenticated `delete-account` endpoint. Email remains an alternative.

Deployment sequence (not yet executed on BirrX):
1. In project `yaocdliuirgydtpjikqw`, run `releases/ai-deployment/account-deletion.sql` in SQL Editor. It only grants the cleanup RPC to service_role.
2. Deploy a function named `delete-account` using the complete single-file `releases/ai-deployment/delete-account.ts`. Its handler verifies every bearer token with Auth; the repository's function config disables legacy gateway JWT verification. If using Dashboard editor, match that setting rather than leaving incompatible legacy verification on.
3. Test an unauthenticated POST: it must return 401 and change nothing. Use a disposable account for the authenticated test: recent password sign-in, explicit confirmation, quota cleanup, global session revocation, hard Auth deletion, then current-device cleanup. Failed server confirmation must preserve local records.
4. Deploy the web/app changes and verify the public deletion route anonymously and after sign-in. Do not declare automated deletion live until this test passes.

Current-device cleanup refuses to run during an active SMS scan and waits for queued writes. It removes the deleted user's IndexedDB workspace and pre-restore snapshot, clears that user's browser preferences/history, and cancels notifications and native metadata when that user is active. Other open browser tabs receive a user-specific deletion marker and clear only the matching workspace. Other devices and exported backups cannot be remotely erased. Existing access tokens may remain technically valid until expiry, so BirrX's privileged handlers must continue checking Auth on every request.
