import { useMemo, useState } from 'react'
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

const createIntervalDefinition = (
  defaults?: Partial<IntervalDefinition>,
): IntervalDefinition => ({
  id: crypto.randomUUID(),
  description: '',
  expression: '',
  disabled: false,
  ...defaults,
})

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

function App() {
  const [intervals, setIntervals] = useState<IntervalDefinition[]>([
    createIntervalDefinition({ description: 'Tonic', expression: '1' }),
    createIntervalDefinition({ description: 'Perfect fifth', expression: '3/2' }),
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

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

  const handleDragEnd = (event: DragEndEvent) => {
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

  return (
    <div className="app-shell">
      <header className="hero">
        <h1>Chroma</h1>
        <p>
          Design modal temperaments and calculate the exact cent offsets needed
          to retune MIDI instruments.
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
            <button type="button" className="btn secondary" disabled title="Coming soon">
              Autofill
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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

      <section className="callout">
        <h2>Next steps</h2>
        <p>
          Extend this tool with cent offset calculations, temperament visualisations, and export
          helpers for tuning tables, CSV, Scala, or SysEx messages.
        </p>
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

export default App
