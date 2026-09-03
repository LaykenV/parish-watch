import { env } from '../_generated/server'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function hashAddress(address: string): Promise<string> {
  return await hmacHex(`address:${address}`)
}

export async function hashVerificationCode(
  challengeId: string,
  code: string,
): Promise<string> {
  return await hmacHex(`verification:${challengeId}:${code}`)
}

export async function hashAccessToken(token: string): Promise<string> {
  return await hmacHex(`access:${token}`)
}

export async function deriveEmailReplyToken(threadId: string): Promise<string> {
  return await hmacHex(`email-reply:${threadId}`)
}

export async function encryptAddress(address: string): Promise<string> {
  return await encryptPrivateText(address)
}

export async function encryptPrivateText(value: string): Promise<string> {
  const key = await importAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(value),
  )
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`
}

export async function decryptAddress(value: string): Promise<string> {
  return await decryptPrivateText(value)
}

export async function decryptPrivateText(value: string): Promise<string> {
  const [version, ivValue, ciphertextValue] = value.split('.')
  if (version !== 'v1' || !ivValue || !ciphertextValue) {
    throw new Error('Encrypted delivery address is invalid')
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivValue) },
    await importAesKey(),
    fromBase64Url(ciphertextValue),
  )
  return decoder.decode(plaintext)
}

export function createOpaqueToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

export function createVerificationCode(): string {
  const range = 900_000
  const limit = Math.floor(0x1_0000_0000 / range) * range
  const values = new Uint32Array(1)
  do crypto.getRandomValues(values)
  while (values[0] >= limit)
  return String(100_000 + (values[0] % range))
}

export function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error('Enter a valid email address')
  }
  return normalized
}

async function hmacHex(value: string): Promise<string> {
  const secret = readKey(env.EMAIL_ADDRESS_HMAC_KEY, 'EMAIL_ADDRESS_HMAC_KEY')
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toHex(new Uint8Array(signature))
}

async function importAesKey(): Promise<CryptoKey> {
  const bytes = readKey(env.EMAIL_ENCRYPTION_KEY, 'EMAIL_ENCRYPTION_KEY')
  if (bytes.byteLength !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY must decode to 32 bytes')
  }
  return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

function readKey(
  value: string | undefined,
  name: string,
): Uint8Array<ArrayBuffer> {
  if (!value) throw new Error(`${name} is not configured`)
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
  } catch {
    throw new Error(`${name} must be base64 encoded`)
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

function toBase64Url(bytes: Uint8Array): string {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const decoded = atob(
    value.replaceAll('-', '+').replaceAll('_', '/') + padding,
  )
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
}
