import { useEffect, useRef } from 'react'

type TemperamentMetaProps = {
  title: string
  description: string
  format: 'json'
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onImport: () => void
  onExport: () => void
  onFormatChange: (value: 'json') => void
  exampleQuery: string
  onExampleQueryChange: (value: string) => void
  exampleOptions: Array<{ value: string; label: string }>
}

const TemperamentMeta = ({
  title,
  description,
  format,
  onTitleChange,
  onDescriptionChange,
  onImport,
  onExport,
  onFormatChange,
  exampleQuery,
  onExampleQueryChange,
  exampleOptions,
}: TemperamentMetaProps) => {
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const element = descriptionRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [description])

  return (
    <section className="temperament-meta">
      <div className="temperament-meta__field">
        <label htmlFor="temperament-title">Temperament title</label>
        <input
          id="temperament-title"
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </div>
      <div className="temperament-meta__field">
        <label htmlFor="temperament-description">Description</label>
        <textarea
          id="temperament-description"
          ref={descriptionRef}
          rows={1}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </div>
      <div className="temperament-meta__actions">
        <div className="temperament-meta__import">
          <button type="button" className="btn secondary" onClick={onImport}>
            Import temperament
          </button>
          <div className="temperament-meta__examples">
            <label htmlFor="temperament-examples-input" className="sr-only">
              Load an example temperament
            </label>
            <input
              id="temperament-examples-input"
              type="search"
              list="temperament-examples"
              placeholder="Browse examples…"
              value={exampleQuery}
              onChange={(event) => onExampleQueryChange(event.target.value)}
            />
            <datalist id="temperament-examples">
              {exampleOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="temperament-meta__export">
          <label htmlFor="export-format">Export as</label>
          <div className="temperament-meta__export-controls">
            <select
              id="export-format"
              value={format}
              onChange={(event) => onFormatChange(event.target.value as 'json')}
            >
              <option value="json">JSON</option>
            </select>
            <button type="button" className="btn" onClick={onExport}>
              Export
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TemperamentMeta
