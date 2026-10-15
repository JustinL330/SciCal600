# Copyright and third-party notices

This file records the repository's copyright-safety policy and the external software and data services used by SciCal600, LMC, and SystemBussing. It is not a legal opinion.

## Project content

The maintainers intend the shipped HTML, CSS, JavaScript, C source, diagrams, and icons to be project-owned or independently written. Do not add copied manuals, course presentation decks, screenshots, photographs, videos, firmware, ROMs, proprietary fonts, third-party logos, or other media unless the repository also records a license or written permission that allows redistribution.

LMC and SystemBussing implement general educational computer-architecture ideas. The distributed files do not include course slides, lecture photographs, videos, or course handouts. Historical acknowledgements are credits, not license grants. Before relicensing or commercial distribution, maintainers should retain written permission for any contributed code or design work; if permission cannot be verified, replace the affected material with an independent implementation.

No top-level source-code license has been selected for this repository. Do not interpret the absence of a license as permission to copy, modify, or redistribute the project source. A maintainer should choose an explicit project license only after confirming ownership and contributor permissions.

## Open-source software

The Web version does not download third-party scripts, stylesheets, fonts, images, or media at runtime. Native and desktop packaging uses these open-source projects:

| Project | Purpose | License |
| --- | --- | --- |
| Capacitor Core, Android, iOS, App, Haptics, and Share | Native application wrappers | MIT |
| Electron | Desktop application runtime | MIT; packaged Chromium notices are supplied with Electron distributions |
| electron-builder | Desktop packaging | MIT |
| esbuild | Build tooling | MIT |
| Playwright | Browser tests | Apache-2.0 |
| tslib | Capacitor runtime helper | 0BSD |

Exact dependency versions and transitive dependency license identifiers are recorded in `package-lock.json`. Redistributors must preserve the license and notice files supplied by those dependencies and by generated Android, iOS, Electron, and Chromium packages.

## External data services

The optional Economics Calculator can request reference data from:

- [Frankfurter](https://frankfurter.dev/) for European Central Bank reference exchange rates.
- [Hong Kong Monetary Authority public APIs](https://apidocs.hkma.gov.hk/) for Hong Kong monetary and interest-rate data.

Those services are credited in the interface. Their data is requested when a user chooses the relevant feature; it is not copied into this repository. SciCal600 is not affiliated with or endorsed by those providers.

## Distribution checklist

Before a public release:

1. Run `npm test` and `npm run brand:check`.
2. Confirm that new media and source files have documented provenance.
3. Preserve dependency license and notice files in native and desktop packages.
4. Obtain written permission for third-party contributions before relicensing or commercial distribution.
5. Request a qualified legal review for commercial launch, app-store publication, or a new jurisdiction.
