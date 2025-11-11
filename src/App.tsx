import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <h1>Chroma</h1>
        <p>
          Design modal temperaments and calculate the exact cent offsets needed
          to retune MIDI instruments.
        </p>
      </header>

      <section className="callout">
        <h2>Work in progress</h2>
        <p>
          This starter provides the foundations for a dedicated temperament
          designer and detuning calculator. Build controls, visualisations, and
          export tools in the sections below.
        </p>
      </section>

      <section className="grid">
        <div className="panel">
          <h3>Temperament definition</h3>
          <p>
            Allow users to specify modal ratios, octave mappings, and interval
            priorities.
          </p>
        </div>
        <div className="panel">
          <h3>Computation</h3>
          <p>
            Convert the selected temperament into precise cent offsets for each
            MIDI pitch class.
          </p>
        </div>
        <div className="panel">
          <h3>Export &amp; integration</h3>
          <p>
            Generate MIDI tuning tables or SysEx messages to apply the tuning in
            downstream tools.
          </p>
        </div>
      </section>
    </div>
  )
}

export default App
