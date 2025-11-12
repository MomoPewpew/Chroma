type KeyOption = {
  value: number
  label: string
}

type PitchConfigProps = {
  keyRoot: number
  concertPitch: number
  keyFrequency: number
  rangeStartLabel: string
  rangeEndLabel: string
  keyOptions: KeyOption[]
  onKeyChange: (value: string) => void
  onConcertPitchChange: (value: string) => void
  onKeyFrequencyChange: (value: string) => void
}

const PitchConfig = ({
  keyRoot,
  concertPitch,
  keyFrequency,
  rangeStartLabel,
  rangeEndLabel,
  keyOptions,
  onKeyChange,
  onConcertPitchChange,
  onKeyFrequencyChange,
}: PitchConfigProps) => (
  <section className="pitch-config">
    <div className="pitch-config__field">
      <label htmlFor="key-note">Key</label>
      <select id="key-note" value={keyRoot} onChange={(event) => onKeyChange(event.target.value)}>
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
          onChange={(event) => onConcertPitchChange(event.target.value)}
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
          onChange={(event) => onKeyFrequencyChange(event.target.value)}
        />
        <span>Hz</span>
      </div>
    </div>
  </section>
)

export type { KeyOption }
export default PitchConfig

