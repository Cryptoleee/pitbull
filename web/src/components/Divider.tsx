/** The jiggling bits between windows: spinning coins, a hue-cycling rainbow bar and a scrolling line. */
export function Divider({ label, text }: { label?: string; text?: string }) {
  return (
    <div className="divider" aria-hidden="true">
      <span className="spincoin">$</span>
      <div className="rainbow" />
      {text ? (
        <div className="marquee" style={{ ['--ms' as string]: '16s' }}>
          <span>{text}</span>
        </div>
      ) : null}
      {label ? <span className="tag blink">{label}</span> : null}
      <div className="rainbow" />
      <span className="spincoin">$</span>
    </div>
  );
}
