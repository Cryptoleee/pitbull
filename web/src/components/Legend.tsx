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
    <section className="win section" id="legend">
      <div className="bar">
        <span>LEGEND.TXT - Notepad</span>
        <span className="btns">
          <i>_</i>
          <i>[]</i>
          <i>X</i>
        </span>
      </div>
      <div className="body">
        <div className="hgroup">
          <div className="wordart">
            <span className="ext">The Legend</span>
            <span className="fill">The Legend</span>
          </div>
          <p>Three chapters. Everything else is rumour.</p>
        </div>
        <div className="scroll">
          <div className="chapters">
            {CHAPTERS.map((c) => (
              <article className="chapter" key={c.n}>
                <span className="n">{c.n}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
          <p className="quote">&ldquo;He doesn&apos;t watch the chart. The chart watches him.&rdquo;</p>
        </div>
      </div>
    </section>
  );
}
