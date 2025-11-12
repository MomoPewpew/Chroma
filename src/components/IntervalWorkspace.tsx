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
import type {
  IntervalDefinition,
  IntervalDefinitionWithComputed,
} from '../lib/music'
import { formatNumber } from '../lib/music'

type IntervalWorkspaceProps = {
  intervals: IntervalDefinitionWithComputed[]
  sensors: SensorDescriptor<any>[]
  onDragEnd: (event: DragEndEvent) => void
  onAddInterval: () => void
  onAutofill: () => void
  onChange: (id: string, patch: Partial<IntervalDefinition>) => void
  onDelete: (id: string) => void
}

const IntervalWorkspace = ({
  intervals,
  sensors,
  onDragEnd,
  onAddInterval,
  onAutofill,
  onChange,
  onDelete,
}: IntervalWorkspaceProps) => (
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
        <button type="button" className="btn" onClick={onAddInterval}>
          Add interval
        </button>
        <button type="button" className="btn secondary" onClick={onAutofill}>
          Autofill
        </button>
      </div>
    </div>

    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext
        items={intervals.map((interval) => interval.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="interval-list">
          {intervals.map((interval) => (
            <SortableIntervalRow
              key={interval.id}
              interval={interval}
              onChange={onChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  </section>
)

type IntervalRowProps = {
  interval: IntervalDefinitionWithComputed
  onChange: (id: string, patch: Partial<IntervalDefinition>) => void
  onDelete: (id: string) => void
}

const SortableIntervalRow = ({ interval, onChange, onDelete }: IntervalRowProps) => {
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
        <output title={interval.error ?? (interval.resolved !== null ? String(interval.resolved) : '')}>
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

export default IntervalWorkspace

