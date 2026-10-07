// 13/09/2026 - the Full Journey now ENDS at the paid booking. Removes the sales-contract flow
// (Ready-to-sign pre-check, STAGE 7, STAGE 8, CONTRACT_OTP) from full-journey.yaml, rewrites the
// comments that named the signed contract as the completion condition, makes the final record
// checks assert the fee-status and invoice VALUES, and ends on an explicit END marker. Fixes the
// two clear-overlays.yaml comments that described the journey's contract steps.
// Every edit is exact-match and must hit exactly the expected number of lines, or nothing is written.
const fs = require('fs');
const die = m => { console.error('ABORT: ' + m); process.exit(1); };
const load = F => { const raw = fs.readFileSync(F, 'utf8'); return { raw, eol: raw.includes('\r\n') ? '\r\n' : '\n', L: raw.split(/\r?\n/) }; };
const once = (L, text, label) => { const h = L.map((l, i) => (l === text ? i : -1)).filter(i => i >= 0); if (h.length !== 1) die(`${label}: expected 1 match, found ${h.length}`); return h[0]; };
const replaceLines = (L, oldLines, newLines, label) => {
  const i = once(L, oldLines[0], label);
  oldLines.forEach((t, k) => { if (L[i + k] !== t) die(`${label}: line ${i + k + 1} differs`); });
  L.splice(i, oldLines.length, ...newLines);
};

// ================================================================ full-journey.yaml
const J = load('.maestro/full-journey.yaml');
let L = J.L;
if (J.raw.includes('FULL JOURNEY END')) die('full-journey already edited');

// 0. static precondition for the clear-overlays comment below: no helper call between Reserve and Pay now
{
  const r = once(L, '- tapOn: "Reserve unit"', 'Reserve tap'), p = once(L, '- tapOn: "Pay now"', 'Pay now tap');
  const calls = L.slice(r, p).filter(l => l.trim() === 'file: subflows/clear-overlays.yaml').length;
  if (calls !== 0) die(`${calls} clear-overlays call(s) between Reserve unit and Pay now - the helper comment would be false`);
}

// 1. everything from the STAGE 7 separator to the end of the file -> the END block
{
  const s7 = once(L, '# STAGE 7 - Payment method, then the sales contract', 'STAGE 7 header');
  if (!L[s7 - 1].startsWith('# =====')) die('STAGE 7 separator not where expected');
  const removed = L.length - (s7 - 1);
  L.splice(s7 - 1, L.length - (s7 - 1),
    '# ==========================================================================================',
    '# END OF JOURNEY - the pass condition (13/09/2026)',
    '# ==========================================================================================',
    '#',
    '# The journey passes on the booking record read above, from a fresh launch after the payment:',
    '#   * My bookings -> Active: the card reads "Active" and "Paid", each on its own line;',
    '#   * its Booking Details: "Offplan MOH land", "Booking fee status" = "Paid", and an invoice',
    '#     number under "Invoice number".',
    '# It is THIS run\'s booking: the account must start with no active booking (STAGE 1), and the',
    '# product allows only one - a second reservation is refused at "Reserve unit".',
    '#',
    '# Choosing a payment method, the payment schedule and the sales contract signature are NOT part',
    '# of this journey (removed 13/09/2026). Nothing here cancels or changes the booking.',
    '- evalScript: "${console.log(\'FULL JOURNEY END - booking Active and Paid, booking fee status Paid, invoice number present\')}"',
    '');
  console.log(`removed STAGE 7 + STAGE 8: ${removed} lines (from the STAGE 7 separator to the end)`);
}

// 2. the Ready-to-sign pre-check in STAGE 6 (contract-only: it existed to pair with STAGE 8)
replaceLines(L, [
  '# The booking is in the signable set BEFORE it is signed. STAGE 8 asserts it has left again,',
  '# and the pair is what proves the signature took effect rather than merely being accepted.',
  '- tapOn: "Ready to sign"',
  '- extendedWaitUntil:',
  '    visible: "(?s).*\\nActive\\n.*Unit code.*"',
  '    timeout: 45000',
  '',
], [], 'Ready-to-sign pre-check');

// 3. the final record checks: the VALUES, not only the labels
replaceLines(L, [
  '- assertVisible: "Invoice number"',
  '- takeScreenshot: journey-6-booking-paid',
], [
  '- assertVisible: "Invoice number"',
  '# The fee-status VALUE and the invoice VALUE, not only their labels: "Paid" under "Booking fee',
  '# status", and an invoice number (digits only) under "Invoice number".',
  '- assertVisible:',
  '    text: "Paid"',
  '    below:',
  '      text: "Booking fee status"',
  '- assertVisible:',
  '    text: "[0-9]{10,}"',
  '    below:',
  '      text: "Invoice number"',
  '- takeScreenshot: journey-6-booking-paid',
], 'final record checks');

// 4. STAGE 6 header
replaceLines(L, ['# STAGE 6 - The booking exists, is paid, and is awaiting signature'],
  ['# STAGE 6 - The booking exists and is paid - the journey ends here'], 'STAGE 6 header');

// 5. the helper comment after the Account tap (now X first, drag as fallback)
replaceLines(L, [
  '# and "My bookings" could not be found. The helper clears it with its header-strip drag -',
  '# never Submit, never a rating - and then proves Account is actually reachable.',
], [
  '# and "My bookings" could not be found. The helper clears it - its close X first, the drag as',
  '# the fallback, never Submit, never a rating - and then proves Account is actually reachable.',
], 'Account-tap helper comment');

// 6. CONTRACT_OTP (used only by the removed OTP entry)
{
  const i = once(L, '  # OTP for the sales-contract signature. PRE-PROD\'s contract OTP is FIXED at 1234 for every', 'CONTRACT_OTP comment');
  const v = i + 7;
  if (!L[v].startsWith('  CONTRACT_OTP: ')) die('CONTRACT_OTP variable not where expected');
  L.splice(i, 8);
}

// 7. header, name and completion-condition comments
replaceLines(L, [
  '# Full Journey — the complete customer booking lifecycle.',
  '#',
  '#   Login -> Explore -> Marketplace (Buy + Offplan) -> search the project -> Project -> Unit',
  '#         -> Reserve -> Pay booking fee -> Payment method + schedule -> Sales Contract',
  '#         -> Approve + OTP -> Signed state and price quotation persisted',
], [
  '# Full Journey — the customer booking journey, from login to a paid booking.',
  '#',
  '#   Login -> verify the account -> Explore -> Marketplace (Buy + Offplan) -> search the project',
  '#         -> Project -> Module -> Unit -> Reserve -> Pay booking fee -> relaunch + NPS',
  '#         -> Account -> My bookings -> the booking reads Active + Paid, Booking fee status Paid,',
  '#            and has an Invoice number -> END',
], 'header summary');
replaceLines(L, [
  '# The price quotation is NOT produced at reservation time: it appears in the booking\'s',
  '# Documents only AFTER the sales contract is signed, alongside a PQ expiry countdown.',
], [
  '# THE JOURNEY ENDS AT THE PAID BOOKING (13/09/2026). Choosing a payment method, the payment',
  '# schedule and signing the sales contract are no longer part of it: once the fee is paid the',
  '# flow only reads the booking record back. It never cancels a booking.',
], 'price-quotation note');
replaceLines(L, [
  '# The same account on an Offplan project reached the contract in one attempt. So this flow',
  '# asserts the project type rather than taking whatever bookable project happens to sort first:',
  '# selecting a Ready Units project silently produces a journey that cannot complete, and the',
  '# failure would surface three screens later as a missing button rather than as a wrong choice.',
], [
  '# The same account on an Offplan project produced the Offplan booking this journey ends on. So',
  '# this flow asserts the project type rather than taking whatever bookable project happens to',
  '# sort first: a Ready Units project produces a different kind of booking, and the mismatch',
  '# would surface only at the final record check rather than as a wrong choice.',
], 'Offplan rationale');
replaceLines(L, ['# It creates a real reservation and signs a real sales contract. It is NOT idempotent: once it'],
  ['# It creates a real reservation and pays its booking fee. It is NOT idempotent: once it'], 'data-change note');
replaceLines(L, ['name: Full Journey - login to signed sales contract (Offplan)'],
  ['name: Full Journey - login to paid booking (Offplan)'], 'flow name');

fs.writeFileSync('.maestro/full-journey.yaml', L.join(J.eol));
console.log(`full-journey.yaml: now ${L.length} lines`);

// ================================================================ clear-overlays.yaml
const C = load('.maestro/subflows/clear-overlays.yaml');
const CL = C.L;
replaceLines(CL, [
  '      # It cannot mask a business outcome. In full-journey.yaml (line numbers as of the',
  '      # 10/09/2026 Marketplace-route revision) there is NO call to this helper between',
  '      # "Reserve unit" (l.440), "Pay booking fee" (l.525) and "Pay now" (l.623), and the',
  '      # contract OTP (l.759) is followed by the signed-contract assertion (l.772) and an',
  '      # explicit assertNotVisible of this very dialog (l.775) BEFORE the next call (l.779).',
  '      # Every committing action is then re-verified on the product\'s own records, so a',
  '      # dismissed real error still fails the run at its record check.',
], [
  '      # It cannot mask a business outcome. In full-journey.yaml there is NO call to this helper',
  '      # between "Reserve unit", "Pay booking fee" and "Pay now" - its only committing actions',
  '      # since 13/09/2026, when the sales-contract signature left the journey - and the payment is',
  '      # then re-verified on the product\'s own booking record, so a dismissed real error still',
  '      # fails the run at its record check.',
], 'clear-overlays Ok-handler comment');
replaceLines(CL, [
  '# CALLER OPT-OUT for the sweep (13/09/2026): full-journey.yaml\'s LEAVE HOME blocks set',
  '# output.npsLeftToCaller around their call on Home. On Home the survey re-opens BY ITSELF about',
], [
  '# CALLER OPT-OUT for the sweep (13/09/2026): full-journey.yaml\'s LEAVE HOME block sets',
  '# output.npsLeftToCaller around its call on Home. On Home the survey re-opens BY ITSELF about',
], 'clear-overlays npsLeftToCaller comment');
fs.writeFileSync('.maestro/subflows/clear-overlays.yaml', CL.join(C.eol));
console.log('clear-overlays.yaml: 2 comments updated (no executable change)');
