import { evaluate } from 'mathjs'

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
export const BLACK_KEY_STEPS = new Set([1, 3, 6, 8, 10])
export const MIN_KEY_NOTE = 69 // A4
export const MAX_KEY_NOTE = 80 // G#5 / Ab5
export const TOTAL_PITCHES = 12
export const OCTAVE_EPSILON = 1e-6

export type IntervalDefinition = {
  id: string
  description: string
  expression: string
  disabled: boolean
}

export type IntervalDefinitionWithComputed = IntervalDefinition & {
  resolved: number | null
  normalized: number | null
  error: string | null
}

export type PitchDefinition = {
  id: string
  description: string
  expression: string
  locked: boolean
}

export type PitchWithComputed = PitchDefinition & {
  position: number
  midiNote: number
  noteName: string
  isBlackKey: boolean
  resolved: number | null
  normalized: number | null
  error: string | null
  targetFrequency: number | null
  standardFrequency: number
  centsOffset: number | null
  defaultExpression: string
}

export const createIntervalDefinition = (
  defaults?: Partial<IntervalDefinition>,
): IntervalDefinition => ({
  id: crypto.randomUUID(),
  description: '',
  expression: '',
  disabled: false,
  ...defaults,
})

export const createPitchDefinition = (defaults?: Partial<PitchDefinition>): PitchDefinition => ({
  id: crypto.randomUUID(),
  description: '',
  expression: '',
  locked: false,
  ...defaults,
})

export const deriveBaseFrequency = (concertPitch: number, midiNote: number) =>
  concertPitch * Math.pow(2, (midiNote - 69) / 12)

export const getDefaultExpression = (index: number): string => {
  if (index === 0) {
    return '1'
  }

  return `2^(${index}/12)`
}

export const normalizeToOctave = (value: number | null): number | null => {
  if (!Number.isFinite(value ?? NaN) || value === null || value <= 0) {
    return null
  }

  let normalized = value

  while (normalized < 1) {
    normalized *= 2
  }

  while (normalized > 2) {
    normalized /= 2
  }

  return normalized
}

export const resolveExpression = (
  expression: string,
): { value: number | null; error: string | null } => {
  const trimmed = expression.trim()

  if (!trimmed) {
    return { value: null, error: null }
  }

  try {
    const evaluated = evaluate(trimmed)
    const numeric = typeof evaluated === 'number' ? evaluated : Number(evaluated)

    if (!Number.isFinite(numeric)) {
      return { value: null, error: 'Result is not a finite number' }
    }

    return { value: numeric, error: null }
  } catch {
    return { value: null, error: 'Unable to parse expression' }
  }
}

export const formatNumber = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Math.abs(value) >= 100 ? 4 : 6,
    useGrouping: false,
  }).format(value)
}

export const formatFrequency = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export const formatCents = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  const formatted = value.toFixed(2)
  return value > 0 ? `+${formatted}` : formatted
}

export const getNoteName = (midiNote: number): string => {
  const step = ((midiNote % 12) + 12) % 12
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[step]}${octave}`
}

export const isBlackKey = (midiNote: number): boolean =>
  BLACK_KEY_STEPS.has(((midiNote % 12) + 12) % 12)

export const getDefaultPitchDefinitions = () =>
  Array.from({ length: TOTAL_PITCHES }, (_, index) =>
    createPitchDefinition({
      expression: index === 0 ? '1' : `2^(${index}/12)`,
      locked: index === 0,
    }),
  )

