import { expect, test } from 'claude-code/testing'

import { barFill, costText, parseQuota, prettyModel, quotaColor, rateLimitSegs, remainText } from './lib'

// Real quota.cache shape (2026-10-06), names untouched.
const FIXTURE = JSON.stringify({
  fetched_at: 1791249974,
  data: {
    limits: [
      { type: 'TIME_LIMIT', unit: 5, number: 1, usage: 4000, currentValue: 924, remaining: 3076, percentage: 23, nextResetTime: 1793041520983 },
      { type: 'TOKENS_LIMIT', unit: 3, number: 5, percentage: 12, nextResetTime: 1791255619129 },
      { type: 'TOKENS_LIMIT', unit: 6, number: 1, percentage: 28, nextResetTime: 1791420081999 },
    ],
    level: 'max',
  },
})

test('parseQuota reads the zaiquota cache shape', () => {
  expect(parseQuota(FIXTURE)).toEqual({
    h5: { pct: 12, resetAt: 1791255619129 },
    wk: { pct: 28, resetAt: 1791420081999 },
    mcp: 23,
    fetchedAt: 1791249974,
  })
})

test('parseQuota survives broken json and an empty limits array', () => {
  expect(parseQuota('not json')).toEqual(null)
  expect(parseQuota(JSON.stringify({ fetched_at: 1, data: { limits: [] } }))).toEqual(null)
})

test('rateLimitSegs maps and orders the API rate-limit kinds', () => {
  const h5 = '2026-10-06T03:00:19.129Z'
  const wk = '2026-10-08T00:41:21.999Z'
  expect(
    rateLimitSegs([
      { kind: 'seven_day', percentUsed: 7, resetsAt: wk },
      { kind: 'five_hour', percentUsed: 23.5, resetsAt: h5 },
      { kind: 'mystery', percentUsed: 90 },
    ]),
  ).toEqual([
    { label: '5h', pct: 23, resetAt: Date.parse(h5) },
    { label: 'wk', pct: 7, resetAt: Date.parse(wk) },
  ])
})

test('rateLimitSegs tolerates missing resetsAt and an empty list', () => {
  expect(rateLimitSegs([{ kind: 'five_hour', percentUsed: 12 }])).toEqual([{ label: '5h', pct: 12, resetAt: null }])
  expect(rateLimitSegs([])).toEqual([])
})

test('barFill caps at the segment count', () => {
  expect(barFill(0)).toBe(0)
  expect(barFill(12)).toBe(1)
  expect(barFill(55)).toBe(5)
  expect(barFill(100)).toBe(10)
  expect(barFill(140)).toBe(10)
})

test('quotaColor follows the 50/80 thresholds', () => {
  expect(quotaColor(49)).toBe('green')
  expect(quotaColor(50)).toBe('yellow')
  expect(quotaColor(79)).toBe('yellow')
  expect(quotaColor(80)).toBe('red')
})

test('remainText formats like the statusline', () => {
  const now = 1791255000
  expect(remainText(1791255619129, now)).toBe('10m')
  expect(remainText(1791260000000, now)).toBe('1h23m')
  expect(remainText(1791500000000, now)).toBe('2d20h')
  expect(remainText(0, now)).toBe('0m')
})

test('prettyModel formats engine model ids', () => {
  expect(prettyModel('glm-5.3-flashx[1m]')).toBe('GLM-5.3-FlashX (1M)')
  expect(prettyModel('claude-sonnet-5-5')).toBe('Claude-Sonnet-5-5')
})

test('costText shows a dash for unknown cost', () => {
  expect(costText(5.486627)).toBe('$5.49')
  expect(costText(undefined)).toBe('$--')
})
