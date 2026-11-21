BirrX Play submission package

Listing copy: en-US/*.txt
Store artwork: assets/play-icon-512.png and assets/feature-graphic-1024x500.png
Console steps and remaining owner inputs: console-fields.txt
Data Safety worksheet: data-safety-review.txt
Synthetic reviewer data: reviewer-demo.csv (not real financial data)
Signed artifacts: ../releases/android/ (ignored by Git)

The APK and AAB were built from base app revision a788459 plus the source changes committed with this packet. Use the latest a788459-working-release APK/AAB; the earlier a788459-release files are older. Signatures verified. Minimum Android API 24, target API 36, package com.birrx.app, versionName 1.0, versionCode 1, release is not debuggable.
Upload certificate SHA-256:
94:0D:F4:4F:F8:95:32:E7:34:D0:C2:10:84:DA:18:47:98:1A:AF:F0:AA:3F:AD:83:67:55:22:CB:F5:B0:C9:56
This matches the existing BirrX-release-keys/birrx-upload-certificate.pem. An older AAB in android/app/release uses a different certificate: do not upload that obsolete file. Use the newly generated AAB above.

Keystore and credentials remain outside this repository in the existing BirrX-release-keys folder. Back them up securely; never send them to reviewers or commit them. Scripts/build-release.ps1 accepts their paths, sets signing variables only for the build process and restores its environment afterward. Run from PowerShell:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1 -KeystorePath C:\Users\tamer\Documents\BirrX-release-keys\birrx-upload.jks -CredentialsPath C:\Users\tamer\Documents\BirrX-release-keys\upload-credentials.txt

Verified public policy and deletion URLs returned HTTP 200 and expected page content on 21 November 2026. Nothing was uploaded to Play Console. Phone screenshots, reviewer credentials and SMS video remain owner inputs; Data Safety/provider retention and email delivery require owner configuration/review before public launch.
