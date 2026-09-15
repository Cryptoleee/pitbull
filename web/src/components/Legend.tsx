const CHAPTERS = [
  {
    n: 'I',
    title: 'The Road',
    text: 'Somewhere between the last gas station and the moon there is a road nobody drives. That is where he was found. Horns like a bull, ears like a dog, arms like a man who never skipped a day. Aviators. Always aviators.',
  },
  {
    n: 'II',
    title: 'The Blessing',
    text: 'The legend is short. Those who hold the Pitbull get rich. Not because of a chart. Because of him. He flexes, and somewhere a bag doubles. He grins, and a wallet wakes up green.',
  },
  {
    n: 'III',
    title: 'The Rules',
    text: 'You do not buy the Pitbull. You get chosen. You do not sell the Pitbull. Nobody has ever tried. You do not explain the Pitbull. You just say the word. Dale.',
  },
];

export function Legend() {
  return (
    <section className="pb-section pb-legend" id="legend" aria-label="the legend">
      <div className="pb-section-head">
        <h2>The Legend</h2>
        <p>Three chapters. Everything else is rumour.</p>
      </div>
      <div className="pb-chapters">
        {CHAPTERS.map((c) => (
          <article key={c.n} className="pb-chapter">
            <span className="pb-chapter-n">{c.n}</span>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))}
      </div>
      <blockquote className="pb-quote">
        <p>&ldquo;He doesn&apos;t watch the chart. The chart watches him.&rdquo;</p>
        <cite>— every believer, eventually</cite>
      </blockquote>
    </section>
  );
}
