import { expect, test } from 'vitest'

import { sha256HexOfBytes, sha256HexOfText } from './hashing'

test('computes the standard sha-256 digest of text', async () => {
  expect(await sha256HexOfText('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  )
  expect(await sha256HexOfText('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  )
})

test('hashes bytes and text consistently and distinguishes content', async () => {
  const bytes = new TextEncoder().encode('lafayette council hub')
  expect(await sha256HexOfBytes(bytes)).toBe(
    await sha256HexOfText('lafayette council hub'),
  )
  expect(await sha256HexOfText('lafayette council hub')).not.toBe(
    await sha256HexOfText('lafayette council hub updated'),
  )
})
