import { crypto as stdCrypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hmacSha256Hex(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

export async function sha256Hex(payload: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)));
}

export async function sha512Hex(payload: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-512', new TextEncoder().encode(payload)));
}

export async function md5Hex(payload: string): Promise<string> {
  const digest = await stdCrypto.subtle.digest('MD5', new TextEncoder().encode(payload));
  return toHex(digest as ArrayBuffer);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x.length !== y.length) return false;
  let result = 0;
  for (let i = 0; i < x.length; i++) result |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return result === 0;
}

export function base64(value: string): string {
  return btoa(value);
}
