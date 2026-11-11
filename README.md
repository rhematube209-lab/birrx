# BirrX

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

Demo data is seeded once: 11 transactions across October and November 2026; CBE, Telebirr and Awash balances; Data and Voice packages; an emergency-fund goal; and recurring rent. November starts at **39,900 ETB income, 12,535 ETB spending, 27,365 ETB net**. Confirm the TB1042 transfer in the review inbox to get **37,400 / 10,035 / 27,365 ETB**. Undo restores the initial totals. The 5 ETB fee stays spending.

All money uses integer santim. `src/domain.ts` supplies the shared reporting, reconciliation, import and export logic. Dates and optional times represent East Africa Time; missing times stay unknown. The Ethiopian calendar setting changes displayed dates, while Gregorian date-entry controls are explicitly labeled and stored dates remain unchanged. Reporting periods retain their Gregorian boundaries.

The balance is the sum of latest account reports, independent of cash-flow totals. An unavailable report differs from zero. Review/edit balances or add an account under Settings. Balances are reported snapshots, not computed live bank balances. Older reports cannot replace newer ones.

The Transactions calendar has a report account selector beside its date control. It filters the period totals, day counts and account activity together. It includes All, CBE, BOA, Telebirr and Awash; BOA is available for imported or manually added records.

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
