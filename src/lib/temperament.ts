import {
  TOTAL_PITCHES,
  createIntervalDefinition,
  createPitchDefinition,
  type IntervalDefinition,
  type PitchDefinition,
} from './music'

export type TemperamentSnapshot = {
  schema: 'chroma-temperament'
  version: 1
  metadata: {
    title: string
    description: string
  }
  config: {
    keyRoot: number
    concertPitch: number
    keyFrequency: number
  }
  intervals: Array<{
    description: string
    expression: string
    disabled: boolean
  }>
  pitches: Array<{
    description: string
    expression: string
  }>
}

export type LoadedTemperament = {
  metadata: TemperamentSnapshot['metadata']
  config: TemperamentSnapshot['config']
  intervals: IntervalDefinition[]
  pitches: PitchDefinition[]
}

const SNAPSHOT_SCHEMA = 'chroma-temperament'
const SNAPSHOT_VERSION = 1

type SerializeInput = {
  metadata: TemperamentSnapshot['metadata']
  config: TemperamentSnapshot['config']
  intervals: IntervalDefinition[]
  pitches: PitchDefinition[]
}

export const serializeTemperament = (input: SerializeInput): string => {
  const snapshot: TemperamentSnapshot = {
    schema: SNAPSHOT_SCHEMA,
    version: SNAPSHOT_VERSION,
    metadata: {
      title: input.metadata.title ?? '',
      description: input.metadata.description ?? '',
    },
    config: {
      keyRoot: input.config.keyRoot,
      concertPitch: input.config.concertPitch,
      keyFrequency: input.config.keyFrequency,
    },
    intervals: input.intervals.map((interval) => ({
      description: interval.description ?? '',
      expression: interval.expression ?? '',
      disabled: Boolean(interval.disabled),
    })),
    pitches: input.pitches.map((pitch, index) => ({
      description: pitch.description ?? '',
      expression: index === 0 ? '1' : pitch.expression ?? '',
    })),
  }

  return JSON.stringify(snapshot, null, 2)
}

export const deserializeTemperament = (raw: string): LoadedTemperament => {
  let parsed: TemperamentSnapshot

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (parsed.schema !== SNAPSHOT_SCHEMA) {
    throw new Error('Unsupported temperament schema.')
  }

  if (parsed.version !== SNAPSHOT_VERSION) {
    throw new Error('Unsupported temperament version.')
  }

  if (!Array.isArray(parsed.intervals) || parsed.intervals.length === 0) {
    throw new Error('Temperament must include at least one interval.')
  }

  if (!Array.isArray(parsed.pitches) || parsed.pitches.length !== TOTAL_PITCHES) {
    throw new Error(`Temperament must include exactly ${TOTAL_PITCHES} pitch entries.`)
  }

  const intervals = parsed.intervals.map((interval) =>
    createIntervalDefinition({
      description: typeof interval.description === 'string' ? interval.description : '',
      expression: typeof interval.expression === 'string' ? interval.expression : '',
      disabled: Boolean(interval.disabled),
    }),
  )

  const pitches = parsed.pitches.map((pitch, index) =>
    createPitchDefinition({
      description: typeof pitch.description === 'string' ? pitch.description : '',
      expression: index === 0 ? '1' : typeof pitch.expression === 'string' ? pitch.expression : '',
      locked: index === 0,
    }),
  )

  const config = parsed.config ?? ({} as TemperamentSnapshot['config'])
  const metadata = parsed.metadata ?? ({} as TemperamentSnapshot['metadata'])

  if (
    typeof config.keyRoot !== 'number' ||
    typeof config.concertPitch !== 'number' ||
    typeof config.keyFrequency !== 'number'
  ) {
    throw new Error('Temperament config is missing required numeric values.')
  }

  return {
    metadata: {
      title: typeof metadata.title === 'string' ? metadata.title : '',
      description: typeof metadata.description === 'string' ? metadata.description : '',
    },
    config: {
      keyRoot: config.keyRoot,
      concertPitch: config.concertPitch,
      keyFrequency: config.keyFrequency,
    },
    intervals,
    pitches,
  }
}

