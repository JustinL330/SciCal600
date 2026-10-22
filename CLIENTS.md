# SciCal600 client builds

The Web app remains the single calculation-code source. Native packages wrap the product-neutral `dist/` bundle so calculation behavior stays aligned across platforms.

## GitHub downloads

Every push to `main` builds macOS, Windows, and iOS Simulator packages in `.github/workflows/clients.yml`. Successful main builds are published as an immutable GitHub prerelease named `client-<commit>`. Android remains covered by `.github/workflows/android.yml`, which publishes an installable testing APK after its emulator/offline checks. Stable version releases are reserved for a future orchestrated, signed release workflow rather than being created independently by each platform workflow.

Open the repository **Releases** page and choose the release matching the commit or version you want.

## macOS

The workflow packages Intel and Apple Silicon builds with Electron 44.3.0 using `electron-builder` 26.17.0. The generated DMG/ZIP packages are currently unsigned, so macOS Gatekeeper can show an unidentified-developer warning until Apple signing/notarization credentials are configured.

## Windows

The workflow produces x64 NSIS installer and ZIP packages. They are currently unsigned, so Windows SmartScreen can warn until a trusted code-signing certificate is configured.

## Android

The Android workflow builds, signature-checks, installs, launches, and exercises the APK in an Android emulator with networking disabled. Main-branch builds use a development signing key and are explicitly published as prereleases. Production signing remains gated on protected signing secrets and an orchestrated stable release.

An installed Android app also accepts browsable `scical600://` links for every bundled workspace, for example `scical600://scientific-calculator`, `scical600://statistics-calculator`, and `scical600://manual`. These links stay inside the offline app and are validated before navigation.

When Android opens the app normally, it returns to the last workspace used. A launcher shortcut or valid `scical600://` link takes priority for that launch.

## iOS

The workflow generates a Capacitor iOS project and publishes an unsigned iOS Simulator `.app` ZIP. This can be downloaded and used with the iOS Simulator on macOS.

A physical iPhone/iPad install requires Apple code signing and a valid provisioning path. Those credentials cannot be safely invented or committed. To publish an installable device IPA, configure Apple Developer signing in GitHub Secrets/your release environment and extend the archive/export step with the corresponding certificate, provisioning profile, Team ID, and export options.

## Local preparation

```text
npm ci
npm test
npm run brand:check
npm run desktop:prepare
```

For iOS, install the locked dependencies and then sync:

```text
npm ci
npm run ios:sync
```

For Android:

```text
npm run android:debug
```
