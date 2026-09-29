#!/usr/bin/env bash
#
# Avatar upload security tests — run against a running SyncText instance.
#
#   chmod +x avatar-security-test.sh
#   EMAIL="..." PASSWORD="..." ./avatar-security-test.sh
#
# Override the target with env vars:
#   BASE_URL=https://localhost:8443 EMAIL=... PASSWORD=... ./avatar-security-test.sh
#
# Optional: a second account, plus the first account's username, to run the
# duplicate-username check.
#   FIRST_USERNAME=harold SECOND_EMAIL=... SECOND_PASSWORD=... ./avatar-security-test.sh
#
# Credentials are read from the environment on purpose. Do not hardcode them
# here — this file is meant to be committable.
#
# Exits 0 if every test passes, 1 otherwise.
#
# Run it directly (./script.sh) or with `bash script.sh`. It uses `local`, so
# `sh script.sh` will not work on a strict POSIX shell.

set -u
set -o pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="${EMAIL:-}"
PASSWORD="${PASSWORD:-}"
FIRST_USERNAME="${FIRST_USERNAME:-}"
SECOND_EMAIL="${SECOND_EMAIL:-}"
SECOND_PASSWORD="${SECOND_PASSWORD:-}"

# Keep the cookie jar inside the scratch dir: avoids `mktemp -t`, whose
# behaviour differs between GNU and BSD/macOS.
TMP="$(mktemp -d)"
JAR="$TMP/cookies.txt"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0
STATUS=""
BODY=""

# ---------------------------------------------------------------- helpers ---

if [ -t 1 ]; then
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[1m'; N=$'\033[0m'
else
  R=""; G=""; Y=""; B=""; N=""
fi

# call METHOD PATH [JSON_BODY] [JAR_FILE] -> sets STATUS and BODY
call() {
  local method="$1" path="$2" data="${3:-}" jar="${4:-$JAR}"
  local out="$TMP/out"
  if [ -n "$data" ]; then
    STATUS=$(curl -sS -o "$out" -w '%{http_code}' -b "$jar" -c "$jar" \
      -X "$method" "$BASE_URL$path" \
      -H 'Content-Type: application/json' \
      --data-raw "$data" 2>"$TMP/err") || STATUS="000"
  else
    STATUS=$(curl -sS -o "$out" -w '%{http_code}' -b "$jar" -c "$jar" \
      -X "$method" "$BASE_URL$path" 2>"$TMP/err") || STATUS="000"
  fi
  BODY=$(cat "$out" 2>/dev/null || echo "")
}

# expect DESC EXPECTED_STATUS [SUBSTRING_THAT_MUST_APPEAR]
expect() {
  local desc="$1" want="$2" needle="${3:-}"
  if [ "$STATUS" != "$want" ]; then
    printf '  %sFAIL%s %s\n        expected %s, got %s\n        body: %s\n' \
      "$R" "$N" "$desc" "$want" "$STATUS" "${BODY:0:200}"
    FAIL=$((FAIL + 1))
    return 1
  fi
  if [ -n "$needle" ] && ! printf '%s' "$BODY" | grep -qF -- "$needle"; then
    printf '  %sFAIL%s %s\n        status ok but %s not in body\n        body: %s\n' \
      "$R" "$N" "$desc" "'$needle'" "${BODY:0:200}"
    FAIL=$((FAIL + 1))
    return 1
  fi
  printf '  %sPASS%s %s %s(%s)%s\n' "$G" "$N" "$desc" "$B" "$STATUS" "$N"
  PASS=$((PASS + 1))
  return 0
}

skip() { printf '  %sSKIP%s %s\n' "$Y" "$N" "$1"; }

section() { printf '\n%s%s%s\n' "$B" "$1" "$N"; }

b64_str() { printf '%s' "$1" | base64 | tr -d '\n'; }

# ---------------------------------------------------------------- preflight -

section "Preflight"

for tool in curl base64; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf '  %sFAIL%s missing required tool: %s\n' "$R" "$N" "$tool"
    exit 1
  fi
done

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  printf '  %sFAIL%s set EMAIL and PASSWORD, e.g.\n' "$R" "$N"
  printf '        EMAIL=you@example.com PASSWORD=YourPassword1! %s\n' "$0"
  exit 1
fi

printf '  target: %s\n' "$BASE_URL"

code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/auth" 2>/dev/null) || code=000
if [ "$code" = "000" ]; then
  printf '  %sFAIL%s cannot reach %s\n' "$R" "$N" "$BASE_URL"
  printf '        under Docker the web container publishes no host port;\n'
  printf '        use BASE_URL=https://localhost:8443 (NGINX), not :3000\n'
  exit 1
fi

# ------------------------------------------------------------------- login --

section "Authentication"

call POST /api/auth/login "$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PASSWORD")"
if [ "$STATUS" != "200" ]; then
  printf '  %sFAIL%s login returned %s: %s\n' "$R" "$N" "$STATUS" "${BODY:0:200}"
  printf '        Every test below needs a valid session, or they will all\n'
  printf '        return 401 and appear to "pass" for the wrong reason.\n'
  exit 1
fi
printf '  %sPASS%s login %s(%s)%s\n' "$G" "$N" "" "$STATUS" "$N"

if grep -q 'session' "$JAR" 2>/dev/null; then
  printf '  %sPASS%s session cookie stored\n' "$G" "$N"
else
  printf '  %sFAIL%s no session cookie in jar\n' "$R" "$N"
  exit 1
fi

# ---------------------------------------------------------------- payloads --

# 1x1 transparent PNG — genuine PNG signature (\x89PNG\r\n\x1a\n)
PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

# variant N: the same PNG with 4*N filler base64 chars appended.
#
# Needed because the handler treats an identical payload as a no-op:
# `avatarChanged = input.avatarUrl !== user.avatarUrl` is false when the
# submitted value already equals the stored one, so it answers 400
# "Nothing to update". That is correct behaviour, but it means re-running
# this script against a database that already holds PNG_B64 would fail.
# Appending keeps the decoded bytes starting with the PNG signature, so
# validation still passes, while every variant is a distinct string.
RAW="${PNG_B64%%=*}"                 # strip '=' padding
TAILPAD="${PNG_B64#"$RAW"}"          # keep the original padding

variant() {
  printf 'data:image/png;base64,%s%s%s' \
    "$RAW" "$(printf 'AAAA%.0s' $(seq 1 "$1"))" "$TAILPAD"
}

# Reset the avatar so a re-run starts from a known state.
clear_avatar() {
  call PUT /api/profile '{"avatarUrl":null}'
}

# ---------------------------------------------------- 1. remote URL refused --

section "1. Remote URL must be refused (tracking-pixel vector)"

call PUT /api/profile '{"avatarUrl":"https://attacker.example/tracker.gif"}'
expect "https:// avatar rejected" 400 "base64 image data URL"

# --------------------------------------------------------- 2. SVG rejected --

section "2. SVG must be refused (data: URL is same-origin)"

SVG="data:image/svg+xml;base64,$(b64_str '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')"
call PUT /api/profile "{\"avatarUrl\":\"$SVG\"}"
expect "image/svg+xml rejected" 400 "Unsupported image type"

# -------------------------------------------- 3. mislabelled content refused --

section "3. Bytes must match the declared type (polyglot guard)"

FAKE="data:image/png;base64,$(b64_str '<script>alert(document.domain)</script>')"
call PUT /api/profile "{\"avatarUrl\":\"$FAKE\"}"
expect "HTML labelled image/png rejected" 400 "does not match"

# a real PNG signature followed by junk still passes the header check, so this
# only proves the header gate, not full decoding — see README notes
section "4. Structural validation of the data URL itself"

call PUT /api/profile '{"avatarUrl":"data:image/png;base64,!!not-base64!!"}'
expect "non-base64 payload rejected" 400

call PUT /api/profile '{"avatarUrl":"not-a-data-url-at-all"}'
expect "non data: URL rejected" 400

call PUT /api/profile '{"avatarUrl":"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="}'
expect "data:text/html rejected" 400

call PUT /api/profile '{"avatarUrl":"data:image/png;base64","extra":"field"}'
expect "unknown field rejected (.strict)" 400

call PUT /api/profile '{}'
expect "empty body rejected" 400

# -------------------------------------------------------- 5. valid PNG works --

section "5. Valid upload succeeds"

# Clear first so the upload is always a real change (see variant() note).
clear_avatar

call PUT /api/profile "$(printf '{"avatarUrl":"%s"}' "$(variant 1)")"
expect "1x1 PNG accepted" 200 '"ok":true'

if [ "$STATUS" = "200" ]; then
  if printf '%s' "$BODY" | grep -q 'avatarUrl'; then
    printf '  %sFAIL%s response echoes avatarUrl (~683 KB on a real upload)\n' "$R" "$N"
    FAIL=$((FAIL + 1))
  else
    printf '  %sPASS%s response does not echo avatarUrl\n' "$G" "$N"
    PASS=$((PASS + 1))
  fi
else
  printf '  %sSKIP%s avatarUrl echo check (upload did not return 200)\n' "$Y" "$N"
fi

# -------------------------------------------------------------- 6. 413 path --

section "6. Oversized body must not reach the DB"

# 6a. reaches the validator: real PNG, over the decoded limit, under the
#     route's content-length guard. Proves the limit is actually enforced.
call PUT /api/profile "$(printf '{"avatarUrl":"%s"}' "$(variant 175000)")"
if [ "$STATUS" = "400" ] && printf '%s' "$BODY" | grep -qF 'Image too large'; then
  printf '  %sPASS%s validator refused oversized payload %s(400)%s\n' \
    "$G" "$N" "$B" "$N"
  PASS=$((PASS + 1))
else
  printf '  %sFAIL%s validator case: got %s, wanted 400 "Image too large"\n' \
    "$R" "$N" "$STATUS"
  printf '        if this returned 200 the decoded-size limit is gone\n'
  printf '        body: %s\n' "${BODY:0:200}"
  FAIL=$((FAIL + 1))
fi

# 6b. caught earlier, on content-length, before the body is parsed.
call PUT /api/profile "$(printf '{"avatarUrl":"%s"}' "$(variant 200000)")"
if [ "$STATUS" = "413" ] && printf '%s' "$BODY" | grep -qF 'Image too large'; then
  printf '  %sPASS%s content-length guard refused oversized body %s(413)%s\n' \
    "$G" "$N" "$B" "$N"
  PASS=$((PASS + 1))
else
  printf '  %sFAIL%s content-length case: got %s, wanted 413 "Image too large"\n' \
    "$R" "$N" "$STATUS"
  printf '        body: %s\n' "${BODY:0:200}"
  FAIL=$((FAIL + 1))
fi

# ------------------------------------------- 7. success must clear the limiter --

section "7. 22 consecutive valid uploads must NOT rate-limit"

# Each payload must differ from the one currently stored, otherwise
# `avatarChanged` is false and the handler returns 400 "Nothing to update"
# (correct behaviour, but it would mask the result). variant() is defined
# once, with the payloads, so section 5 can use it too.
#
# Indices are offset by 100 because section 5 already stored variant 1 —
# starting the loop at 1 would resubmit that exact string.
FIRST_FAIL=""
for i in $(seq 1 22); do
  call PUT /api/profile "$(printf '{"avatarUrl":"%s"}' "$(variant $((100 + i)))")"
  if [ "$STATUS" != "200" ]; then
    FIRST_FAIL="$i (status $STATUS, body: ${BODY:0:80})"
    break
  fi
  printf '%s' "$i "
done
echo
if [ -z "$FIRST_FAIL" ]; then
  printf '  %sPASS%s all 22 succeeded — limiter cleared on success\n' "$G" "$N"
  PASS=$((PASS + 1))
else
  printf '  %sFAIL%s first failure at upload #%s\n' "$R" "$N" "$FIRST_FAIL"
  printf '        If the status is 400 "Nothing to update" the payloads were\n'
  printf '        identical; if it is 429 the success path is not calling\n'
  printf '        accountLimiter.clear().\n'
  FAIL=$((FAIL + 1))
fi

# -------------------------------------------- 8. removal and server render --

section "8. Removal + server-side render"

call PUT /api/profile '{"avatarUrl":null}'
expect "avatar removed" 200 '"ok":true'

call PUT /api/profile "{\"avatarUrl\":\"data:image/png;base64,$PNG_B64\"}"
expect "re-upload after removal" 200 '"ok":true'

html_status=$(curl -sS -o "$TMP/profile.html" -w '%{http_code}' -b "$JAR" -c "$JAR" \
  "$BASE_URL/profile" 2>/dev/null) || html_status=000
if [ "$html_status" = "200" ] && grep -q 'data:image/png;base64' "$TMP/profile.html"; then
  printf '  %sPASS%s /profile server-renders the stored avatar\n' "$G" "$N"
  PASS=$((PASS + 1))
elif [ "$html_status" = "200" ]; then
  printf '  %sWARN%s /profile rendered but no avatar data URL found\n' "$Y" "$N"
  printf '        expected the profile Avatar to render the stored image\n'
else
  printf '  %sFAIL%s GET /profile returned %s\n' "$R" "$N" "$html_status"
  FAIL=$((FAIL + 1))
fi

# optional: navbar wiring may not be done yet, so this is informational
if curl -sS -b "$JAR" "$BASE_URL/dashboard" 2>/dev/null | grep -q 'data:image/png;base64'; then
  printf '  %sPASS%s navbar also renders the avatar\n' "$G" "$N"
  PASS=$((PASS + 1))
else
  skip "navbar avatar not rendered (expected until UserMenu accepts avatarUrl)"
fi

# ------------------------------------------------------------------- 9. IDOR --

section "9. Cross-account write must be refused"

# Structurally, IDOR is not reachable here: updateProfileSchema is .strict()
# over { username?, avatarUrl? } and the update is keyed
# `where: { id: session.user.id }` — the target id comes from the session and
# never from the request body. So the meaningful runtime check is that
# injected identity fields are rejected outright rather than silently ignored.

call PUT /api/profile '{"userId":"clx0000000000000000000000"}'
expect "injected userId rejected" 400 "Validation failed"

call PUT /api/profile '{"id":"clx0000000000000000000000"}'
expect "injected id rejected" 400 "Validation failed"

call PUT /api/profile '{"email":"attacker@example.com"}'
expect "injected email rejected" 400 "Validation failed"

call PUT /api/profile '{"passwordHash":"x"}'
expect "injected passwordHash rejected" 400 "Validation failed"

# A second account must not be able to claim the first account's username.
if [ -z "$FIRST_USERNAME" ] || [ -z "$SECOND_EMAIL" ] || [ -z "$SECOND_PASSWORD" ]; then
  skip "set FIRST_USERNAME, SECOND_EMAIL and SECOND_PASSWORD for the 409 check"
else
  JAR2="$TMP/jar2"
  code2=$(curl -sS -o /dev/null -w '%{http_code}' -c "$JAR2" \
    -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
    -d "$(printf '{"email":"%s","password":"%s"}' "$SECOND_EMAIL" "$SECOND_PASSWORD")")
  if [ "$code2" != "200" ]; then
    skip "second account login failed ($code2)"
  else
    call PUT /api/profile "$(printf '{"username":"%s"}' "$FIRST_USERNAME")" "$JAR2"
    if [ "$STATUS" = "409" ]; then
      printf '  %sPASS%s second account cannot claim %s %s(409)%s\n' \
        "$G" "$N" "$FIRST_USERNAME" "" "$N"
      PASS=$((PASS + 1))
    else
      printf '  %sFAIL%s second account got %s (expected 409)\n' "$R" "$N" "$STATUS"
      printf '        body: %s\n' "${BODY:0:200}"
      FAIL=$((FAIL + 1))
    fi
  fi
fi

# ----------------------------------------------------------------- summary --

section "Summary"
printf '  passed: %s%d%s   failed: %s%d%s\n' "$G" "$PASS" "$N" \
  "$( [ "$FAIL" -gt 0 ] && printf '%s' "$R" || printf '%s' "$G" )" "$FAIL" "$N"

if [ "$FAIL" -gt 0 ]; then
  echo
  exit 1
fi
exit 0
