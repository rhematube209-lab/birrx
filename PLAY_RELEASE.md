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
