import { useEffect, useRef } from 'react'

type TemperamentMetaProps = {
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

const TemperamentMeta = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
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
    </section>
  )
}

export default TemperamentMeta
