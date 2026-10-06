export type QuotaWindow = { pct: number; resetAt: number }

/** One snapshot of the cc-zaiquota daemon's quota.cache (read-only, no network). */
export type QuotaState = {
  /** 5-hour tokens window (sooner nextResetTime); parseQuota only builds a state when one exists. */
  h5: QuotaWindow
  /** Weekly tokens window (later nextResetTime). */
  wk: QuotaWindow | null
  /** MCP monthly TIME_LIMIT percentage. */
  mcp: number | null
  /** When the cache was fetched, seconds since the epoch; 0 when unknown. */
  fetchedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'cc-contextbar': { quota: QuotaState | null }
  }
}
