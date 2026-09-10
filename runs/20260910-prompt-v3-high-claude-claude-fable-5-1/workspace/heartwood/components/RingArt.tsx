/** Renders generator output (trusted markup: all user text is XML-escaped in lib/rings). */
export function RingArt({ svg, className, style }: { svg: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: svg }} />;
}
