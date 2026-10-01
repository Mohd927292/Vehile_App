# Flutter reference comparison — 2026-10-01

Reference: `C:/Users/Akhtar/Desktop/Billing_App_on work/lib`.

The source inventory contains 68 Dart files and 29,238 lines, with hashes, classes, imports and Firestore collection references in `REFERENCE_SOURCE_INVENTORY.json`. This is an inventory of every source file, not a claim that each line has independent test coverage. The operational comparison below covers the vehicle/party module and its shared customer/export helpers. The separate invoicing modules are catalogued below and have not been ported into TripTrack.

## Vehicle/party features

| Reference capability | TripTrack implementation/status |
|---|---|
| Individual vehicle table | Opens directly from vehicle list; shared `TripTable` |
| Universal vehicle table | All vehicles / Home All Trips |
| Individual party table | Opens directly from party list; exact party-ID query |
| Universal party table | All parties |
| Vehicle month history | Restored using vehicle month summaries; 35 recovered vehicle summaries reconciled |
| Party month history | Retained as Browse by month beside direct table access |
| From/To pair entry | One separate stored pair record and one row per pair |
| Multi-vehicle tabs | Add/remove tabs; each has date, vehicle, driver, amount and many pairs |
| Multiline text | Explicit From/To newlines preserved in storage, table, PDF and Excel |
| Draft retention | Immediate queued local saves, background flush, actor/workspace isolation, active-tab restoration |
| Suggestions | Vehicle, driver, origin and registered destination lookup |
| New destination registration | Add Customer flow retains trip draft |
| Date filters | From/to range; month view intersects range rather than escaping the selected month |
| Sorting | Trip date, creation time, amount; ascending/descending |
| Row selection | Hold a row or select current page; retained across pages |
| Previous/next pages | Bounded 40-row pages; indexed cursor queries |
| Full-scope search | Server prefix tokens; searches beyond the first page; differs from reference's client substring scan |
| Single edit | Edits the entire vehicle trip; all affected pair rows update atomically |
| Single removal | Recoverable archive, clearly includes all pairs of that vehicle trip |
| Bulk removal | Restored as bulk archive; deduplicates selected vehicle trips; explicit all-pairs confirmation |
| Restore removed data | Archive screen restores trip, pair records and summaries; improvement over permanent reference deletion |
| NO LOAD display | Highlighted in tables |
| PDF export | A4 cards matching reference's date/SL/amount header and labelled driver/vehicle/from/to sections |
| Excel export | One pair per row; exact newlines, explicit wrapping, measured widths and row heights |
| Selected/full filtered export | Selected records across pages, otherwise all matching pages |
| Export icons | Red PDF and green Excel image icons with persistent labels |
| Refresh | Pull to refresh resets paging and selection |
| Theme | Light/dark retained |

## Intentional data-model corrections

The reference supports older shapes such as `vehicles[]`, `fromLocations[]`, `toLocations[]`, and nested `pairs[]`, with duplicated documents under both vehicle and party branches. Reconstructing every origin/destination combination from those unrelated lists can mix parties. TripTrack stores an authoritative vehicle trip plus one indexed pair record per actual location pair. A party view queries one stable `partyId`; it never displays sibling pairs from another party. All dependent writes and counts are updated in a transaction.

A historical amount belongs to a vehicle trip. Multi-pair rows say “Shared vehicle trip total”; reports do not repeat that amount as an independently billable charge. No allocation between parties is inferred. Editing or archiving retains the vehicle-trip grouping, which is stated in the action labels and confirmation.

Reference validation rejects zero and empty amounts. TripTrack preserves legitimate historical zero amounts and supports an unspecified amount. Unknown destinations remain subject to customer registration. Customer renames with existing trip references remain blocked until an explicit identity migration is made.

## Separate billing modules found in the reference

These are distinct business workflows, beyond the vehicle/party section:

1. Daily invoice entry, invoice numbering and daily PDF templates.
2. Monthly invoice entry, multi-invoice forms and month-wise invoice records.
3. Formula definitions, editable calculators and a custom numeric keypad.
4. Payment tracking, payment batches, payment updates and remaining balances.
5. Bill records, recent items, customer billing summaries and details.
6. Attachments, an in-app PDF viewer, merged PDF/payment-request documents.
7. Business invoice stationery, bank/payment instructions and signatures.

Relevant source groups: `Daily_Bill/`, `Monthly_Bill/`, `monthybillentry/`, `Bill_Records/`, `payment_*`, `formula_editor.dart`, `services/*bill*`, `utils/pdf_generation*`, `utils/monthly_*`, `attachment_viewer.dart` and `in_app_pdf_viewer.dart`. These modules are not claimed as implemented in the current transport app. Their financial rules, numbering and invoice data require a separate port if whole-billing-system parity is selected.

## Remaining practical limits

- Search is word/field-prefix based, not arbitrary substring or fuzzy search.
- Shared historical totals cannot be split correctly without a business allocation rule.
- A new release signing key cannot update installations signed by a different key.
- Source review and passing tests do not establish that every possible device/data combination is defect-free.
