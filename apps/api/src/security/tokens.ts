import { createHmac, randomBytes } from "node:crypto";

export const DEFAULT_OPAQUE_TOKEN_BYTES = 32;
export const URL_SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

export function generateOpaqueToken(byteLength = DEFAULT_OPAQUE_TOKEN_BYTES): string {
  if (!Number.isSafeInteger(byteLength) || byteLength < 16) {
    throw new Error("Opaque tokens must use at least 16 random bytes.");
  }

  return randomBytes(byteLength).toString("base64url");
}

export function hashOpaqueToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

export function createTokenPreview(token: string): string {
  if (token.length <= 12) {
    return `${token.slice(0, 4)}…`;
  }

  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}
