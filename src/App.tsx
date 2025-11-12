import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import ThemeToggle from './components/ThemeToggle'
import IntervalWorkspace from './components/IntervalWorkspace'
import TemperamentMeta from './components/TemperamentMeta'
import PitchConfig, { type KeyOption } from './components/PitchConfig'
import PitchTable from './components/PitchTable'
import AppFooter from './components/AppFooter'
import {
  MAX_KEY_NOTE,
  MIN_KEY_NOTE,
  OCTAVE_EPSILON,
  TOTAL_PITCHES,
  createIntervalDefinition,
  deriveBaseFrequency,
  getDefaultExpression,
  getDefaultPitchDefinitions,
  getNoteName,
  isBlackKey,
  normalizeToOctave,
  resolveExpression,
  type IntervalDefinition,
  type IntervalDefinitionWithComputed,
  type PitchDefinition,
  type PitchWithComputed,
} from './lib/music'
import {
  getPreferredTheme,
  persistTheme,
  type Theme,
} from './lib/theme'
import {
  deserializeTemperament,
  serializeTemperament,
  type LoadedTemperament,
} from './lib/temperament'
import './App.css'

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
  const [temperamentTitle, setTemperamentTitle] = useState<string>('')
  const [temperamentDescription, setTemperamentDescription] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<'json'>('json')
  const [exampleQuery, setExampleQuery] = useState<string>('')
  const [loadedExampleId, setLoadedExampleId] = useState<string | null>(null)
  const [keyRoot, setKeyRoot] = useState<number>(72)
  const [concertPitch, setConcertPitch] = useState<number>(440)
  const [keyFrequency, setKeyFrequency] = useState<number>(() =>
    deriveBaseFrequency(440, 72),
  )
  const [pitches, setPitches] = useState<PitchDefinition[]>(() => getDefaultPitchDefinitions())

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const exampleOptions = useMemo(
    () => [
      { value: 'just-intonation-in-c', label: 'Just Intonation in C' },
      { value: 'pythagorean-cycle', label: 'Pythagorean Cycle' },
      { value: 'quarter-comma-meantone', label: 'Quarter-comma Meantone' },
    ],
    [],
  )

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
    if (typeof window !== 'undefined') {
      persistTheme(theme)
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

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const applyLoadedTemperament = (loaded: LoadedTemperament) => {
    setTemperamentTitle(loaded.metadata.title ?? '')
    setTemperamentDescription(loaded.metadata.description ?? '')
    setIntervals(loaded.intervals)
    setPitches(loaded.pitches)
    setKeyRoot(loaded.config.keyRoot)
    setConcertPitch(loaded.config.concertPitch)
    setKeyFrequency(loaded.config.keyFrequency)
  }

  const handleExportTemperament = () => {
    const payload = serializeTemperament({
      metadata: { title: temperamentTitle, description: temperamentDescription },
      config: { keyRoot, concertPitch, keyFrequency },
      intervals,
      pitches,
    })

    const baseName =
      temperamentTitle.trim() ||
      (loadedExampleId ? loadedExampleId.replace(/_/g, '-') : '') ||
      'temperament'
    const safeBase = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const fileName = `${safeBase || 'temperament'}.${exportFormat}`

    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const loaded = deserializeTemperament(text)
      applyLoadedTemperament(loaded)
      setExampleQuery(loaded.metadata.title ?? '')
      setLoadedExampleId(null)
    } catch (error) {
      console.error(error)
      alert(`Unable to import temperament: ${(error as Error).message}`)
    } finally {
      event.target.value = ''
    }
  }

  const loadExampleTemperament = async (exampleId: string) => {
    try {
      const response = await fetch(`/examples/${exampleId}.json`)
      if (!response.ok) {
        throw new Error('Request failed')
      }
      const text = await response.text()
      const loaded = deserializeTemperament(text)
      applyLoadedTemperament(loaded)
      const option = exampleOptions.find((item) => item.value === exampleId)
      if (option) {
        setExampleQuery(option.label)
      }
      setLoadedExampleId(exampleId)
    } catch (error) {
      console.error(error)
      alert('Unable to load the selected example temperament.')
    }
  }

  const handleExampleQueryChange = (query: string) => {
    setExampleQuery(query)
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) {
      return
    }
    const match =
      exampleOptions.find((option) => option.label.toLowerCase() === trimmed) ??
      exampleOptions.find((option) => option.value.toLowerCase() === trimmed)
    if (match) {
      void loadExampleTemperament(match.value)
    }
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

  const keyOptions = useMemo<KeyOption[]>(
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

  const rangeStartLabel = `${getNoteName(keyRoot)} (MIDI ${keyRoot})`
  const rangeEndLabel = `${getNoteName(keyRoot + TOTAL_PITCHES - 1)} (MIDI ${
    keyRoot + TOTAL_PITCHES - 1
  })`

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

    if (!activePitch || !overPitch || activePitch.locked || overPitch.locked) {
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
        next[idx].expression = next[idx].locked ? '1' : defaults.expression
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
        <ThemeToggle isDark={isDarkTheme} onToggle={handleToggleTheme} />
      </div>

      <header className="hero">
        <h1>Chroma</h1>
        <p>
          Design modal temperaments and calculate the exact cent offsets needed to retune MIDI
          instruments.
        </p>
      </header>

      <TemperamentMeta
        title={temperamentTitle}
        description={temperamentDescription}
        onTitleChange={setTemperamentTitle}
        onDescriptionChange={setTemperamentDescription}
        format={exportFormat}
        onFormatChange={setExportFormat}
        onImport={handleImportClick}
        onExport={handleExportTemperament}
        exampleQuery={exampleQuery}
        onExampleQueryChange={handleExampleQueryChange}
        exampleOptions={exampleOptions}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFromFile}
      />

      <IntervalWorkspace
        intervals={computedIntervals}
        sensors={intervalSensors}
        onDragEnd={handleIntervalDragEnd}
        onAddInterval={handleAddInterval}
        onAutofill={handleAutofill}
        onChange={handleIntervalChange}
        onDelete={handleIntervalDelete}
      />

      <PitchConfig
        keyRoot={keyRoot}
        concertPitch={concertPitch}
        keyFrequency={keyFrequency}
        keyOptions={keyOptions}
        rangeStartLabel={rangeStartLabel}
        rangeEndLabel={rangeEndLabel}
        onKeyChange={handleKeyChange}
        onConcertPitchChange={handleConcertPitchChange}
        onKeyFrequencyChange={handleKeyFrequencyChange}
      />

      <PitchTable
        pitches={computedPitches}
        sensors={pitchSensors}
        onDragEnd={handlePitchDragEnd}
        onChange={handlePitchChange}
        onReset={handlePitchReset}
      />

      <AppFooter />
      </div>
  )
}

export default App

