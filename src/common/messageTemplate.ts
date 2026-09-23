import {playbackProviderMeta, type PlaybackMediaField, type PlaybackState} from './playback.ts'

export type TemplateVars = Record<string, string | number | null | undefined>

// Available for every source, whatever the provider reports
export const COMMON_TEMPLATE_FIELDS: PlaybackMediaField[] = [
  {key: 'media_title', label: 'Media title'},
  {key: 'source_name', label: 'Source name'},
  {key: 'duration', label: 'Duration'},
]

export function templateFieldsFor(providerId: string | null | undefined): PlaybackMediaField[] {
  const meta = providerId ? playbackProviderMeta(providerId) : null
  return [...COMMON_TEMPLATE_FIELDS, ...(meta?.mediaFields ?? [])]
}

export function renderMessageTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{([a-z0-9_]+)\}/gi, (_, key: string) => {
      const value = vars[key]
      return value === null || value === undefined ? '' : String(value)
    })
    .trim()
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

export function playbackTemplateVars(state: PlaybackState, sourceName: string): TemplateVars {
  return {
    ...(state.media ?? {}),
    media_title: state.title,
    source_name: sourceName,
    duration: formatDuration(state.totalSeconds),
  }
}
