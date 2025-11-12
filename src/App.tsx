import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { evaluate } from 'mathjs'
import './App.css'

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const
const BLACK_KEY_STEPS = new Set([1, 3, 6, 8, 10])
const MIN_KEY_NOTE = 69 // A4
const MAX_KEY_NOTE = 80 // G#5 / Ab5
const TOTAL_PITCHES = 12
const OCTAVE_EPSILON = 1e-6

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'chroma:theme'

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

type IntervalDefinition = {
  id: string
  description: string
  expression: string
  disabled: boolean
}

type IntervalDefinitionWithComputed = IntervalDefinition & {
  resolved: number | null
  normalized: number | null
  error: string | null
}

type PitchDefinition = {
  id: string
  description: string
  expression: string
  locked: boolean
}

type PitchWithComputed = PitchDefinition & {
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

const createIntervalDefinition = (
  defaults?: Partial<IntervalDefinition>,
): IntervalDefinition => ({
  id: crypto.randomUUID(),
  description: '',
  expression: '',
  disabled: false,
  ...defaults,
})

const createPitchDefinition = (defaults?: Partial<PitchDefinition>): PitchDefinition => ({
  id: crypto.randomUUID(),
  description: '',
  expression: '',
  locked: false,
  ...defaults,
})

const deriveBaseFrequency = (concertPitch: number, midiNote: number) =>
  concertPitch * Math.pow(2, (midiNote - 69) / 12)

const getDefaultExpression = (index: number): string => {
  if (index === 0) {
    return '1'
  }

  return `2^(${index}/12)`
}

const normalizeToOctave = (value: number | null): number | null => {
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

const resolveExpression = (expression: string): { value: number | null; error: string | null } => {
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

const formatNumber = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: Math.abs(value) >= 100 ? 4 : 6,
    useGrouping: false,
  }).format(value)
}

const formatFrequency = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

const formatCents = (value: number | null): string => {
  if (value === null) {
    return '—'
  }

  const formatted = value.toFixed(2)
  return value > 0 ? `+${formatted}` : formatted
}

const getNoteName = (midiNote: number): string => {
  const step = ((midiNote % 12) + 12) % 12
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[step]}${octave}`
}

const isBlackKey = (midiNote: number): boolean => BLACK_KEY_STEPS.has(((midiNote % 12) + 12) % 12)

const getDefaultPitchDefinitions = () =>
  Array.from({ length: TOTAL_PITCHES }, (_, index) =>
    createPitchDefinition({
      expression: index === 0 ? '1' : `2^(${index}/12)`,
      locked: index === 0,
    }),
  )

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const preferred = getPreferredTheme()
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = preferred
    }
    return preferred
  })
  const [intervals, setIntervals] = useState<IntervalDefinition[]>([
    createIntervalDefinition({ description: 'Tonic', expression: '1' }),
    createIntervalDefinition({ description: 'Perfect fifth', expression: '3/2' }),
  ])
  const [keyRoot, setKeyRoot] = useState<number>(72)
  const [concertPitch, setConcertPitch] = useState<number>(440)
  const [keyFrequency, setKeyFrequency] = useState<number>(() =>
    deriveBaseFrequency(440, 72),
  )
  const [pitches, setPitches] = useState<PitchDefinition[]>(() => getDefaultPitchDefinitions())

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // no-op: storage might be unavailable
    }
  }, [theme])

  const intervalSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const pitchSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const isDarkTheme = theme === 'dark'
  const themeToggleLabel = isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleAutofill = () => {
    if (computedIntervals.length === 0) {
      setPitches((prev) =>
        prev.map((pitch, index) => ({
          ...pitch,
          description: '',
          expression: pitch.locked ? '1' : getDefaultExpression(index),
        })),
      )
      return
    }

    const resetPitches = pitches.map((pitch, index) => ({
      ...pitch,
      description: '',
      expression: pitch.locked ? '1' : getDefaultExpression(index),
    }))

    const pitchSlots = resetPitches.map((pitch, index) => {
      if (pitch.locked) {
        return {
          index,
          locked: true,
          normalized: 1,
        }
      }

      const { value } = resolveExpression(pitch.expression)
      const normalized = normalizeToOctave(value)

      return {
        index,
        locked: false,
        normalized,
      }
    })

    const candidates = computedIntervals
      .filter((interval) => !interval.disabled)
      .filter((interval) => interval.normalized !== null)
      .filter(
        (interval) =>
          interval.normalized !== null &&
          Math.abs(interval.normalized - 1) > OCTAVE_EPSILON &&
          Math.abs(interval.normalized - 2) > OCTAVE_EPSILON,
      )

    const unique: typeof candidates = []
    candidates.forEach((candidate) => {
      if (
        !unique.some(
          (existing) =>
            existing.normalized !== null &&
            candidate.normalized !== null &&
            Math.abs(existing.normalized - candidate.normalized) < OCTAVE_EPSILON,
        )
      ) {
        unique.push(candidate)
      }
    })

    unique.sort((a, b) => {
      if (a.normalized === null || b.normalized === null) {
        return 0
      }
      return a.normalized - b.normalized
    })

    const selected = unique.slice(0, 11)
    const assigned = new Set<number>()

    selected.forEach((interval) => {
      if (interval.normalized === null) {
        return
      }

      let bestIndex: number | null = null
      let bestDelta = Number.POSITIVE_INFINITY

      pitchSlots.forEach((slot) => {
        if (slot.locked || slot.normalized === null || assigned.has(slot.index)) {
          return
        }

        const delta = Math.abs(slot.normalized - interval.normalized!)
        if (delta < bestDelta) {
          bestDelta = delta
          bestIndex = slot.index
        }
      })

      if (bestIndex !== null) {
        resetPitches[bestIndex] = {
          ...resetPitches[bestIndex],
          description: interval.description,
          expression: interval.expression,
        }
        assigned.add(bestIndex)
      }
    })

    setPitches(resetPitches)
  }

  const computedIntervals: IntervalDefinitionWithComputed[] = useMemo(
    () =>
      intervals.map((interval) => {
        const { value, error } = resolveExpression(interval.expression)
        const normalized = normalizeToOctave(value)
        return {
          ...interval,
          resolved: value,
          normalized,
          error,
        }
      }),
    [intervals],
  )

  const baseFrequency = useMemo(() => {
    if (Number.isFinite(keyFrequency) && keyFrequency > 0) {
      return keyFrequency
    }
    return deriveBaseFrequency(concertPitch, keyRoot)
  }, [keyFrequency, concertPitch, keyRoot])

  const computedPitches: PitchWithComputed[] = useMemo(
    () =>
      pitches.map((pitch, index) => {
        const midiNote = keyRoot + index
        const noteName = getNoteName(midiNote)
        const { value, error } = resolveExpression(pitch.expression)
        const resolved = pitch.locked ? 1 : value
        const normalized =
          pitch.locked || index === 0 ? 1 : normalizeToOctave(resolved ?? null)
        const standardFrequency = 440 * Math.pow(2, (midiNote - 69) / 12)
        const targetFrequency =
          normalized !== null && typeof normalized === 'number'
            ? baseFrequency * normalized
            : null
        const centsOffset =
          targetFrequency && targetFrequency > 0
            ? (1200 * Math.log(targetFrequency / standardFrequency)) / Math.log(2)
            : null

        return {
          ...pitch,
          position: index,
          midiNote,
          noteName,
          isBlackKey: isBlackKey(midiNote),
          resolved: pitch.locked ? 1 : resolved ?? null,
          normalized: pitch.locked ? 1 : normalized,
          error: pitch.locked ? null : error,
          targetFrequency,
          standardFrequency,
          centsOffset,
          defaultExpression: getDefaultExpression(index),
        }
      }),
    [pitches, keyRoot, baseFrequency],
  )

  const handleIntervalChange = (id: string, patch: Partial<IntervalDefinition>) => {
    setIntervals((prev) =>
      prev.map((interval) => (interval.id === id ? { ...interval, ...patch } : interval)),
    )
  }

  const handleIntervalDelete = (id: string) => {
    setIntervals((prev) => prev.filter((interval) => interval.id !== id))
  }

  const handleAddInterval = () => {
    setIntervals((prev) => [...prev, createIntervalDefinition()])
  }

  const handlePitchChange = (id: string, patch: Partial<PitchDefinition>) => {
    setPitches((prev) =>
      prev.map((pitch) => {
        if (pitch.id !== id) {
          return pitch
        }

        if (pitch.locked && patch.expression !== undefined) {
          return pitch
        }

        return { ...pitch, ...patch }
      }),
    )
  }

  const syncFromConcertPitch = (pitch: number, root: number) => {
    const base = deriveBaseFrequency(pitch, root)
    setConcertPitch(pitch)
    setKeyFrequency(base)
  }

  const syncFromKeyFrequency = (frequency: number, root: number) => {
    const concert = frequency / Math.pow(2, (root - 69) / 12)
    setKeyFrequency(frequency)
    setConcertPitch(concert)
  }

  const handleConcertPitchChange = (value: string) => {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && numeric > 0) {
      syncFromConcertPitch(numeric, keyRoot)
    }
  }

  const handleKeyFrequencyChange = (value: string) => {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && numeric > 0) {
      syncFromKeyFrequency(numeric, keyRoot)
    }
  }

  const handleKeyChange = (value: string) => {
    const numeric = Number(value)
    if (!Number.isNaN(numeric)) {
      const clamped = Math.min(Math.max(numeric, MIN_KEY_NOTE), MAX_KEY_NOTE)
      setKeyRoot(clamped)
      syncFromConcertPitch(concertPitch, clamped)
    }
  }

  const keyOptions = useMemo(
    () =>
      Array.from({ length: MAX_KEY_NOTE - MIN_KEY_NOTE + 1 }, (_, index) => {
        const midiNote = MIN_KEY_NOTE + index
        return {
          value: midiNote,
          label: `${getNoteName(midiNote)} (MIDI ${midiNote})`,
        }
      }),
    [],
  )

  const rangeStartName = getNoteName(keyRoot)
  const rangeEndName = getNoteName(keyRoot + TOTAL_PITCHES - 1)

  const handleIntervalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    setIntervals((prev) => {
      const oldIndex = prev.findIndex((interval) => interval.id === active.id)
      const newIndex = prev.findIndex((interval) => interval.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const handlePitchDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const activePitch = computedPitches.find((pitch) => pitch.id === active.id)
    const overPitch = computedPitches.find((pitch) => pitch.id === over.id)

    if (!activePitch || !overPitch) {
      return
    }

    if (activePitch.locked || overPitch.locked) {
      return
    }

    setPitches((prev) => {
      const next = prev.map((pitch) => ({ ...pitch }))
      const movableIndices = next
        .map((pitch, index) => ({ pitch, index }))
        .filter(({ pitch }) => !pitch.locked)
        .map(({ index }) => index)

      const fromIndex = movableIndices.indexOf(activePitch.position)
      const toIndex = movableIndices.indexOf(overPitch.position)

      if (fromIndex === -1 || toIndex === -1) {
        return prev
      }

      const values = movableIndices.map((idx) => ({
        description: next[idx].description,
        expression: next[idx].expression,
      }))

      const reordered = arrayMove(values, fromIndex, toIndex)

      movableIndices.forEach((idx, orderIdx) => {
        const defaults = reordered[orderIdx]
        next[idx].description = defaults.description
        if (!next[idx].locked) {
          next[idx].expression = defaults.expression
        } else {
          next[idx].expression = '1'
        }
      })

      return next
    })
  }

  const handlePitchReset = (position: number, defaultExpression: string) => {
    setPitches((prev) =>
      prev.map((pitch, index) => {
        if (index !== position) {
          return pitch
        }

        return {
          ...pitch,
          description: '',
          expression: pitch.locked ? '1' : defaultExpression,
        }
      }),
    )
  }

  return (
    <div className="app-shell">
      <div className="app-toolbar">
        <button
          type="button"
          className="theme-toggle"
          onClick={handleToggleTheme}
          aria-pressed={isDarkTheme}
          title={themeToggleLabel}
        >
          <span className="theme-toggle__icon" aria-hidden="true">
            {isDarkTheme ? '🌙' : '☀️'}
          </span>
          <span className="theme-toggle__label">{isDarkTheme ? 'Dark' : 'Light'} mode</span>
        </button>
      </div>
      <header className="hero">
        <h1>Chroma</h1>
        <p>
          Design modal temperaments and calculate the exact cent offsets needed to retune MIDI instruments.
        </p>
      </header>

      <section className="interval-tool">
        <div className="interval-tool__header">
      <div>
            <h2>Intervals</h2>
            <p>
              Define modal intervals as expressions relative to the tonic. The resolved value and
              octave-normalised ratio update automatically.
            </p>
          </div>
          <div className="interval-tool__actions">
            <button type="button" className="btn" onClick={handleAddInterval}>
              Add interval
            </button>
            <button type="button" className="btn secondary" onClick={handleAutofill}>
              Autofill
            </button>
          </div>
        </div>

        <DndContext sensors={intervalSensors} onDragEnd={handleIntervalDragEnd}>
          <SortableContext
            items={computedIntervals.map((interval) => interval.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="interval-list">
              {computedIntervals.map((interval) => (
                <SortableIntervalRow
                  key={interval.id}
                  interval={interval}
                  onChange={handleIntervalChange}
                  onDelete={handleIntervalDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <section className="pitch-config">
        <div className="pitch-config__field">
          <label htmlFor="key-note">Key</label>
          <select id="key-note" value={keyRoot} onChange={(event) => handleKeyChange(event.target.value)}>
            {keyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pitch-config__field">
          <label htmlFor="concert-pitch">Concert pitch A</label>
          <div className="pitch-config__input">
            <input
              id="concert-pitch"
              type="number"
              min={300}
              max={520}
              step={0.1}
              value={concertPitch}
              onChange={(event) => handleConcertPitchChange(event.target.value)}
            />
            <span>Hz</span>
          </div>
        </div>

        <div className="pitch-config__field">
          <label htmlFor="key-frequency">Key note frequency</label>
          <div className="pitch-config__input">
            <input
              id="key-frequency"
              type="number"
              min={10}
              max={20000}
              step={0.01}
              value={Number.isFinite(keyFrequency) ? keyFrequency : ''}
              onChange={(event) => handleKeyFrequencyChange(event.target.value)}
            />
            <span>Hz</span>
          </div>
        </div>
      </section>

      <section className="pitch-panel">
        <header className="pitch-panel__header">
          <h2>Pitches</h2>
          <p>
            Review the twelve semitone positions derived from the selected key. Expressions resolve
            to target frequencies, contrasted with MIDI standard tuning and cent offsets.
          </p>
        </header>

        <DndContext sensors={pitchSensors} onDragEnd={handlePitchDragEnd}>
          <SortableContext
            items={computedPitches.map((pitch) => pitch.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="pitch-table__scroll">
              <div className="pitch-table">
                <div className="pitch-table__header-row">
                  <div className="pitch-table__cell heading">Key</div>
                  <div className="pitch-table__cell heading">Note</div>
                  <div className="pitch-table__cell heading">Description</div>
                  <div className="pitch-table__cell heading">Expression</div>
                  <div className="pitch-table__cell heading">Resolved</div>
                  <div className="pitch-table__cell heading">Octave</div>
                  <div className="pitch-table__cell heading">Target (Hz)</div>
                  <div className="pitch-table__cell heading">MIDI (Hz)</div>
                  <div className="pitch-table__cell heading">Detune (¢)</div>
                  <div className="pitch-table__cell heading">Reset</div>
                </div>
                {computedPitches.map((pitch) => (
                  <SortablePitchRow
                    key={pitch.id}
                    pitch={pitch}
                    onChange={handlePitchChange}
                    onReset={handlePitchReset}
                  />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  )
}

type IntervalRowProps = {
  interval: IntervalDefinitionWithComputed
  onChange: (id: string, patch: Partial<IntervalDefinition>) => void
  onDelete: (id: string) => void
}

function SortableIntervalRow({ interval, onChange, onDelete }: IntervalRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: interval.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`interval-row${isDragging ? ' is-dragging' : ''}`}
      aria-label="Interval definition row"
    >
      <button
        type="button"
        className="drag-handle"
        aria-label="Reorder interval"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <div className="interval-row__field">
        <label htmlFor={`description-${interval.id}`}>Description</label>
        <input
          id={`description-${interval.id}`}
          type="text"
          placeholder="e.g. Perfect fifth"
          value={interval.description}
          onChange={(event) => onChange(interval.id, { description: event.target.value })}
        />
      </div>

      <div className="interval-row__field">
        <label htmlFor={`expression-${interval.id}`}>Expression</label>
        <input
          id={`expression-${interval.id}`}
          type="text"
          placeholder="e.g. 3/2"
          value={interval.expression}
          onChange={(event) => onChange(interval.id, { expression: event.target.value })}
        />
      </div>

      <div className="interval-row__field interval-row__value">
        <label>Resolved</label>
        <output
          title={interval.error ?? (interval.resolved !== null ? String(interval.resolved) : '')}
        >
          {interval.error ? 'Error' : formatNumber(interval.resolved)}
        </output>
      </div>

      <div className="interval-row__field interval-row__value">
        <label>Octave</label>
        <output>
          {interval.error
            ? '—'
            : interval.resolved === null
            ? '—'
            : formatNumber(interval.normalized)}
        </output>
      </div>

      <div className="interval-row__field interval-row__controls">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={interval.disabled}
            onChange={(event) => onChange(interval.id, { disabled: event.target.checked })}
          />
          Disable
        </label>
        <button
          type="button"
          className="btn tertiary"
          onClick={() => onDelete(interval.id)}
          aria-label="Delete interval"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

type PitchRowProps = {
  pitch: PitchWithComputed
  onChange: (id: string, patch: Partial<PitchDefinition>) => void
  onReset: (position: number, defaultExpression: string) => void
}

function SortablePitchRow({ pitch, onChange, onReset }: PitchRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pitch.id,
    disabled: pitch.locked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDefaultState =
    pitch.description.trim() === '' &&
    pitch.expression.trim() === pitch.defaultExpression.trim()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pitch-row${isDragging ? ' is-dragging' : ''}${pitch.locked ? ' is-locked' : ''}`}
    >
      <button
        type="button"
        className={`pitch-row__indicator${pitch.isBlackKey ? ' black' : ' white'}`}
        aria-label={`Reorder pitch ${pitch.noteName}`}
        {...attributes}
        {...listeners}
        disabled={pitch.locked}
      >
        <span className="sr-only">Drag handle</span>
      </button>

      <div className="pitch-row__note">
        <div className="pitch-row__note-name">{pitch.noteName}</div>
        <div className="pitch-row__note-meta">MIDI {pitch.midiNote}</div>
      </div>

      <div className="pitch-row__field">
        <label htmlFor={`pitch-description-${pitch.id}`} className="sr-only">
          Description for {pitch.noteName}
        </label>
        <input
          id={`pitch-description-${pitch.id}`}
          type="text"
          value={pitch.description}
          onChange={(event) => onChange(pitch.id, { description: event.target.value })}
        />
      </div>

      <div className="pitch-row__field">
        <label htmlFor={`pitch-expression-${pitch.id}`} className="sr-only">
          Expression for {pitch.noteName}
        </label>
        <input
          id={`pitch-expression-${pitch.id}`}
          type="text"
          value={pitch.expression}
          onChange={(event) => onChange(pitch.id, { expression: event.target.value })}
          disabled={pitch.locked}
        />
      </div>

      <div className="pitch-row__value">{pitch.error ? 'Error' : formatNumber(pitch.resolved)}</div>
      <div className="pitch-row__value">
        {pitch.error ? '—' : formatNumber(pitch.normalized)}
      </div>
      <div className="pitch-row__value">{formatFrequency(pitch.targetFrequency)}</div>
      <div className="pitch-row__value">{formatFrequency(pitch.standardFrequency)}</div>
      <div className="pitch-row__value">{pitch.error ? '—' : formatCents(pitch.centsOffset)}</div>
      <div className="pitch-row__actions">
        <button
          type="button"
          className="pitch-row__reset"
          onClick={() => onReset(pitch.position, pitch.defaultExpression)}
          disabled={isDefaultState}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

export default App
