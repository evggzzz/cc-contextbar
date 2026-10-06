import type { QuotaState, QuotaWindow } from '../types'

// quota.cache (written by the cc-zaiquota daemon) -> band state; null when unreadable.
// Shape: data.limits[] with TOKENS_LIMIT x2 (5h = sooner nextResetTime, weekly = later)
// and TIME_LIMIT (MCP monthly). Mirrors ~/.claude/zaiquota/quota.sh's jq logic.
export function parseQuota(text: string): QuotaState | null {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  const limits: any[] = Array.isArray(data?.data?.limits) ? data.data.limits : []
  const tokens = limits
    .filter((l) => l?.type === 'TOKENS_LIMIT')
    .sort((a, b) => (a?.nextResetTime ?? 0) - (b?.nextResetTime ?? 0))
  if (tokens.length === 0) return null
  const mcp = limits.find((l) => l?.type === 'TIME_LIMIT')
  const win = (l: any): QuotaWindow => ({
    pct: Math.floor(l?.percentage ?? 0),
    resetAt: typeof l?.nextResetTime === 'number' ? l.nextResetTime : 0,
  })
  return {
    h5: win(tokens[0]),
    wk: tokens.length > 1 ? win(tokens[1]) : null,
    mcp: mcp ? Math.floor(mcp?.percentage ?? 0) : null,
    fetchedAt: typeof data?.fetched_at === 'number' ? data.fetched_at : 0,
  }
}

// The engine's own rate-limit readings (from the last API response) -> segments.
// Only these kinds are drawn; anything else a gateway invents is skipped.
export type RateLimitLike = { kind: string; percentUsed?: number; resetsAt?: string }
export type LimitSeg = { label: string; pct: number; resetAt: number | null }

const RL_ORDER = ['five_hour', 'seven_day', 'spend_limit']
const RL_LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'wk', spend_limit: 'spend' }

export function rateLimitSegs(limits: readonly RateLimitLike[]): LimitSeg[] {
  return [...limits]
    .filter((l) => RL_ORDER.includes(l?.kind))
    .sort((a, b) => RL_ORDER.indexOf(a.kind) - RL_ORDER.indexOf(b.kind))
    .map((l) => ({
      label: RL_LABELS[l.kind] ?? l.kind,
      pct: Math.floor(l.percentUsed ?? 0),
      resetAt: l.resetsAt ? Date.parse(l.resetsAt) : null,
    }))
}

// Filled segments of a 10-segment bar, bash's `pct * SEGMENTS / 100` capped.
export function barFill(pct: number, segments = 10): number {
  return Math.min(segments, Math.floor((Math.max(0, pct) * segments) / 100))
}

// <50 green / <80 yellow / >=80 red — the statusline's thresholds.
export function quotaColor(pct: number): string {
  return pct < 50 ? 'green' : pct < 80 ? 'yellow' : 'red'
}

// Time to a reset epoch (ms) from nowSec: "2h26m" / "6d7h" / "12m".
export function remainText(resetMs: number, nowSec: number): string {
  let r = Math.floor(resetMs / 1000) - nowSec
  if (r < 0) r = 0
  const d = Math.floor(r / 86400)
  const h = Math.floor((r % 86400) / 3600)
  const m = Math.floor((r % 3600) / 60)
  if (d > 0) return `${d}d${h}h`
  if (h > 0) return `${h}h${m}m`
  return `${m}m`
}

// "glm-5.3-flashx[1m]" -> "GLM-5.3-FlashX (1M)"; unknown ids just get capitalized.
const PRETTY: Record<string, string> = { glm: 'GLM', flash: 'Flash', flashx: 'FlashX' }
export function prettyModel(model: string): string {
  const tag = model.match(/\[(.+)\]$/)?.[1]
  const base = tag ? model.slice(0, model.length - tag.length - 2) : model
  const pretty = base
    .split('-')
    .map((t) => PRETTY[t.toLowerCase()] ?? t.charAt(0).toUpperCase() + t.slice(1))
    .join('-')
  return tag ? `${pretty} (${tag.toUpperCase()})` : pretty
}

export function costText(usd: number | undefined): string {
  return typeof usd === 'number' ? `$${usd.toFixed(2)}` : '$--'
}
