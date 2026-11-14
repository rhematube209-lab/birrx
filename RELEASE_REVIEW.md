# Release review — November 14, 2026

Completed checks and fixes:
- Existing 150 automated tests passed, including money, transfer reconciliation, duplicate imports, EAT filtering, local persistence, backup replacement/undo, authentication failures and lock cancellation.
- Two additional service-worker tests passed: account/API requests are not intercepted; updates remove only older BirrX caches.
- Restricted web caching to same-origin navigation and static assets. Bumped cache version to remove the prior cache. Android and development builds unregister the web service worker; Android uses bundled assets.
- Updated privacy/terms copy for real device lock and local notification history. App lock does not encrypt finance records or exports.
- Regular import methods no longer prefill fictional records. Sample import remains explicitly labeled.
- Disabled Android automatic cloud backup. Explicit user file backup remains available.
- Recurring payments cannot be posted without an account.

User-confirmed device check:
- Update over the existing installation preserved notes, category edits, accounts and app lock.

Device checks still required for this release:
- Install as an update over existing data and confirm records, notes, categories and app lock remain available.
- Fresh install: deny SMS and notification permissions; continue using manual entry; grant permissions later.
- Allow SMS: complete a full scan, cancel another scan, resume and confirm no duplicates.
- Device lock: cancel unlock; authenticate; background/resume; restart the process; disable with authentication.
- Export, restore and undo a backup on a physical phone.
- Web production: load online, reopen offline, deploy an update and reload without losing IndexedDB data.

Release limitations: no financial cloud sync; shared local workspace for signed-in users on one installation; English interface; reference rates entered manually; stats schedule preference is not an implemented delivery feature. Production signing, distribution-store setup and a store privacy disclosure review are not completed by this local audit.
