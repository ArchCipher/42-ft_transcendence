import "server-only";
import argon2 from "argon2";

// password storage - argon2id with OWASP recommended minimum config

const OPTIONS: argon2.HashOptions = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  };

let dummyHash: string | null = null;

export async function getDummyHash(): Promise<string> {
  if (dummyHash === null)
    dummyHash = await hashPassword("dummy-password-never-matches");
  return dummyHash;
}

// argon2.hash embeds random salt in the output string
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false; // corrupt/malformed hash considered same as wrong password
  }
}
