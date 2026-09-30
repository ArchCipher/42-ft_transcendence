import "server-only";

import {
  AVATAR_MAX_BYTES, AVATAR_MIME_TYPES
} from "@synctext/shared/constants";

/*
Avatar validation
==================
`User.avatarUrl` stores an image as a data URL. Two independent checks:

  1. FORMAT  the string must be `data:<mime>;base64,<payload>` with an
     allow-listed mime. This is not a security control on its own: the mime
     is attacker-controlled.
  2. CONTENT the decoded bytes must start with the magic number of the
     declared mime. This is the real control. A PNG header cannot
     be produced by HTML, SVG or JavaScript, so a polyglot that also parses
     as a document cannot get through.

SVG is intentionally NOT allow-listed. A data: URL is same-origin, so
navigating to an SVG data URL executes its script in our origin. Nothing in
the product needs it, and PNG/JPEG cover every real use case.

Size is checked on the DECODED length, not the base64 string, so the limit
means what it says (500 KB of pixels, not 500 KB of base64).
*/

const MIME_TO_SIGNATURE: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) =>
    // 89 50 4E 47 0D 0A 1A 0A
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a,
  "image/jpeg": (b) =>
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};

const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/;

export type AvatarCheck =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string };

export function validateAvatarDataUrl(value: string): AvatarCheck {
  const match = DATA_URL.exec(value);
  if (!match) {
    return {
      ok: false,
      error: "Avatar must be a base64 image data URL",
    };
  }

  const mime = match[1]!.toLowerCase();
  const isKnown = Object.prototype.hasOwnProperty.call(
    MIME_TO_SIGNATURE,
    mime,
  );
  if (!isKnown) {
    return {
      ok: false,
      error: `Unsupported image type. Use one of: ${AVATAR_MIME_TYPES.join(", ")}`,
    };
  }

  const payload = match[2]!;
  if (payload.length === 0 || payload.length % 4 !== 0) {
    return { ok: false, error: "Malformed base64 payload" };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(payload, "base64"));
  } catch {
    return { ok: false, error: "Malformed base64 payload" };
  }

  if (bytes.byteLength === 0) {
    return { ok: false, error: "Avatar is empty" };
  }
  if (bytes.byteLength > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image too large" };
  }

  // The declared mime is attacker-controlled; the bytes decide.
  if (!MIME_TO_SIGNATURE[mime]!(bytes)) {
    return { ok: false, error: "File content does not match its image type" };
  }

  return { ok: true, bytes };
}
