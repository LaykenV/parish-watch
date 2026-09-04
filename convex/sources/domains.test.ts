import { expect, test } from 'vitest'

import {
  canonicalizeUrl,
  isAllowedOfficialHost,
  isRegisteredSourceUrl,
} from './domains'

const LAFAYETTE_DOMAINS = ['lafayettela.gov', 'apps.lafayettela.gov']

test('allows exact and subdomain official hosts', () => {
  expect(
    isAllowedOfficialHost(
      'https://www.lafayettela.gov/your-government/city-and-parish-councils/',
      LAFAYETTE_DOMAINS,
    ),
  ).toBe(true)
  expect(
    isAllowedOfficialHost('https://lafayettela.gov/', LAFAYETTE_DOMAINS),
  ).toBe(true)
  expect(
    isAllowedOfficialHost(
      'https://apps.lafayettela.gov/obcouncil/index.html',
      LAFAYETTE_DOMAINS,
    ),
  ).toBe(true)
})

test('rejects hosts outside the registered official domains', () => {
  expect(
    isAllowedOfficialHost('https://evillafayettela.gov/', LAFAYETTE_DOMAINS),
  ).toBe(false)
  expect(
    isAllowedOfficialHost(
      'https://lafayettela.gov.attacker.example/',
      LAFAYETTE_DOMAINS,
    ),
  ).toBe(false)
  expect(
    isAllowedOfficialHost('https://example.com/agenda.html', LAFAYETTE_DOMAINS),
  ).toBe(false)
  expect(isAllowedOfficialHost('not a url', LAFAYETTE_DOMAINS)).toBe(false)
  expect(isAllowedOfficialHost('https://lafayettela.gov/', [])).toBe(false)
})

test('canonicalizes seed urls deterministically', () => {
  expect(canonicalizeUrl('  https://Example.com/Path#section ')).toBe(
    'https://example.com/Path',
  )
  expect(canonicalizeUrl('ftp://example.com/file')).toBeNull()
  expect(canonicalizeUrl('   ')).toBeNull()
})

test('allows a vendor document only when its full url is registered', () => {
  const seedUrl =
    'https://vendor.example/api/documents/checked-agenda.pdf'
  expect(
    isRegisteredSourceUrl(seedUrl, LAFAYETTE_DOMAINS, [seedUrl]),
  ).toBe(true)
  expect(
    isRegisteredSourceUrl(
      'https://vendor.example/api/documents/other.pdf',
      LAFAYETTE_DOMAINS,
      [seedUrl],
    ),
  ).toBe(false)
})
