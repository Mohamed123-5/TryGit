#!/usr/bin/env bash
# Login-only validation harness: a VERBATIM prefix of full-journey.yaml, cut before STAGE 0.
# The env block is kept verbatim on purpose (it holds the real NATIONAL_ID resolution line);
# its declarations are inert. The guard therefore inspects the STEPS only - everything after
# the "---" separator, excluding comments - and rejects any booking step or any use of card data.
cd "D:/Automation/Maestro-Mobile"
S0=$(grep -n "# STAGE 0 - Release any booking" .maestro/full-journey.yaml | cut -d: -f1)
[ -n "$S0" ] || { echo "ABORT: STAGE 0 banner not found"; exit 1; }
head -n $((S0 - 2)) .maestro/full-journey.yaml \
  | sed 's/^name: Full Journey.*$/name: VALIDATION - Stage 1 only (login + eligibility), no booking/' > .maestro/_nid-validation.yaml
printf '\n- takeScreenshot: nid-validation-authenticated-home\n' >> .maestro/_nid-validation.yaml
BAD=$(awk 'f{print NR": "$0} /^---$/{f=1}' .maestro/_nid-validation.yaml \
  | grep -vE "^[0-9]+: *#" \
  | grep -E 'ensure-no-active-booking|Reserve unit|Pay booking fee|Cancel booking|Approve|Confirm cancellation|Pay now|\$\{CARD_|CONTRACT_OTP')
[ -z "$BAD" ] || { echo "ABORT: booking-related STEP in harness:"; echo "$BAD"; rm -f .maestro/_nid-validation.yaml; exit 1; }
echo "harness: $(grep -c '' .maestro/_nid-validation.yaml) lines, cut before STAGE 0 (journey line $S0); executable steps:"
awk 'f && /^- [a-zA-Z]/{print "   "NR": "$0} /^---$/{f=1}' .maestro/_nid-validation.yaml
maestro check-syntax .maestro/_nid-validation.yaml 2>&1 | tail -1 | sed 's/^/harness syntax: /'
