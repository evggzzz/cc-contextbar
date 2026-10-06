import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { barFill, costText, parseQuota, prettyModel, quotaColor, rateLimitSegs, remainText } from './lib'
import type { QuotaState } from '../types'

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
    // windows the API itself reported — falling back to the cache when the plan
    // has none (e.g. before the session's first API response).
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
