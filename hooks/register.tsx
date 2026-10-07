import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import {
  STORE_KEY,
  agoText,
  barFill,
  costText,
  parseQuota,
  prettyModel,
  quotaColor,
  rateLimitSegs,
  remainText,
} from './lib'
import type { QuotaState } from '../types'
import type { StoredLimits } from './lib'

const quota = atom({ plugin: 'cc-contextbar', key: 'quota' } as const, null)

export const register: Register = on => {
  // Poll the cc-zaiquota daemon's cache file every 30s into the `quota` atom.
  // No network here — the daemon (launchd, 600s) is the only fetcher (ban-safe).
  on('session.start', async ($, e, next) => {
    const started = await next(e)

    const home = (await $.process.run(['sh', '-c', 'printf %s "$HOME"'])).stdout.trim()
    const cache = `${home}/.claude/zaiquota/quota.cache`

    const refresh = async () => {
      let state: QuotaState | null = null
      try {
        const stat = await $.fs.stat(cache)
        if (stat.kind === 'file') state = parseQuota(await $.fs.read(cache))
      } catch {
        state = null
      }
      await update($, quota, () => state)
    }

    await refresh()
    $.clock.every(30_000, () => {
      void refresh().catch(() => {})
    })

    return started
  })

  // Keep the plan's latest rate-limit reading across sessions: a fresh desktop
  // session has none until its first API response, and the last one is a better
  // stand-in than nothing. The terminal reads z.ai, whose readings are empty,
  // so its turns never pollute the stored plan limits.
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined) return done
    try {
      const usage = await $.session.usage()
      if (usage.rateLimits.length > 0) {
        const stored: StoredLimits = { segs: rateLimitSegs(usage.rateLimits), at: await $.clock.now() }
        await $.store.set(STORE_KEY, stored)
      }
    } catch {
      // the previous reading stays; nothing to report
    }
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)

    const [usage, model, state] = await Promise.all([
      $.session.usage(),
      $.session.model(),
      read($, quota),
    ])

    // line 1: 🤖 model · [████░░░░░░] pct% · $cost
    const pct = Math.min(100, Math.floor(usage.context.percent ?? 0))
    const filled = barFill(pct)
    const line1 = (
      <Text>
        🤖 {prettyModel(model)} ·{' '}
        <Text color={quotaColor(pct)}>{'█'.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(10 - filled)}</Text> {pct}% · {costText(usage.cost?.usd)}
      </Text>
    )

    const nowSec = Math.floor((await $.clock.now()) / 1000)
    const seg = (label: string, p: number, resetMs: number | null) => (
      <Text>
        {label}{' '}
        <Text color={quotaColor(p)}>{'█'.repeat(barFill(p))}</Text>
        <Text dimColor>{'░'.repeat(10 - barFill(p))}</Text>{' '}
        <Text bold color={quotaColor(p)}>
          {p}%
        </Text>
        {resetMs !== null && Number.isFinite(resetMs) ? (
          <Text dimColor> {remainText(resetMs, nowSec)}</Text>
        ) : null}
      </Text>
    )

    // Quota source by surface: the terminal session runs on the z.ai gateway, so
    // line 2 there reads the cc-zaiquota daemon's cache. Every other surface
    // (desktop Code tab on a Claude plan, vscode, mobile) shows the rate-limit
    // windows the API itself reported — never the cache, which belongs to the
    // CLI's gateway and would mislead here. Before the session's first API
    // response no reading exists, so the previous turn's stored reading stands
    // in (marked with its age); on a first-ever run a dim waiting hint does.
    const rlSegs = e.surface === 'terminal' ? [] : rateLimitSegs(usage.rateLimits ?? [])

    let line2
    if (rlSegs.length > 0) {
      const parts: any[] = []
      rlSegs.forEach((s, i) => {
        if (i > 0) parts.push(' · ')
        parts.push(seg(s.label, s.pct, s.resetAt))
      })
      line2 = (
        <Text>
          ⏳ {parts}
        </Text>
      )
    } else if (e.surface !== 'terminal') {
      let line2Waiting: boolean = true
      const parts: any[] = []
      try {
        const stored = (await $.store.get(STORE_KEY)) as StoredLimits | undefined
        if (stored && Array.isArray(stored.segs) && stored.segs.length > 0) {
          line2Waiting = false
          stored.segs.forEach((s, i) => {
            if (i > 0) parts.push(' · ')
            parts.push(seg(s.label, s.pct, s.resetAt))
          })
          if (typeof stored.at === 'number' && stored.at > 0) {
            const agoM = Math.max(0, Math.floor((nowSec * 1000 - stored.at) / 60_000))
            parts.push(<Text dimColor> · {agoText(agoM)}</Text>)
          }
        }
      } catch {
        // fall through to the waiting hint
      }
      line2 = line2Waiting ? (
        <Text dimColor>⏳ plan limits: waiting for this session's first reply</Text>
      ) : (
        <Text>
          ⏳ {parts}
        </Text>
      )
    } else if (!state) {
      line2 = <Text color="yellow">⏳ z.ai quota: run /cc-zaiquota:refresh</Text>
    } else {
      const parts: any[] = [seg('5h', state.h5.pct, state.h5.resetAt > 0 ? state.h5.resetAt : null)]
      if (state.wk) parts.push(' · ', seg('wk', state.wk.pct, state.wk.resetAt > 0 ? state.wk.resetAt : null))
      if (state.mcp !== null) parts.push(' · ', <Text bold color="green">MCP {state.mcp}%</Text>)
      if (state.fetchedAt > 0) {
        const agoM = Math.max(0, Math.floor((nowSec - state.fetchedAt) / 60))
        parts.push(<Text dimColor> · {agoM}m</Text>)
      }
      line2 = (
        <Text>
          ⏳ {parts}
        </Text>
      )
    }

    return (
      <Box flexDirection="column">
        {line1}
        {line2}
      </Box>
    )
  })
}
