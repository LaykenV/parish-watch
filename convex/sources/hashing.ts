const encoder = new TextEncoder()

export async function sha256HexOfBytes(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(digest))
}

export async function sha256HexOfText(text: string): Promise<string> {
  return sha256HexOfBytes(encoder.encode(text))
}

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return hex
}
