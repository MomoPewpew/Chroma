import {
  DndContext,
  type DragEndEvent,
  type SensorDescriptor,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PitchDefinition, PitchWithComputed } from '../lib/music'
import { formatCents, formatFrequency, formatNumber } from '../lib/music'

type PitchTableProps = {
  pitches: PitchWithComputed[]
  sensors: SensorDescriptor<any>[]
  onDragEnd: (event: DragEndEvent) => void
  onChange: (id: string, patch: Partial<PitchDefinition>) => void
  onReset: (position: number, defaultExpression: string) => void
}

const PitchTable = ({ pitches, sensors, onDragEnd, onChange, onReset }: PitchTableProps) => (
  <section className="pitch-panel">
    <header className="pitch-panel__header">
      <h2>Pitches</h2>
      <p>
        Review the twelve semitone positions derived from the selected key. Expressions resolve to
        target frequencies, contrasted with MIDI standard tuning and cent offsets.
      </p>
    </header>

    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={pitches.map((pitch) => pitch.id)} strategy={verticalListSortingStrategy}>
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
            {pitches.map((pitch) => (
              <SortablePitchRow
                key={pitch.id}
                pitch={pitch}
                onChange={onChange}
                onReset={onReset}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  </section>
)

type PitchRowProps = {
  pitch: PitchWithComputed
  onChange: (id: string, patch: Partial<PitchDefinition>) => void
  onReset: (position: number, defaultExpression: string) => void
}

const SortablePitchRow = ({ pitch, onChange, onReset }: PitchRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pitch.id,
    disabled: pitch.locked,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDefaultState =
    pitch.description.trim() === '' && pitch.expression.trim() === pitch.defaultExpression.trim()

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
        <span className="pitch-row__indicator-dots" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
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
      <div className="pitch-row__value">{pitch.error ? '—' : formatNumber(pitch.normalized)}</div>
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

export default PitchTable

