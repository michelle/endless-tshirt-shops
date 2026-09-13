export default function ShirtMockup({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shirt-mockup">
      <div className="shirt-mockup-body" style={{ background: color }} />
      <div className="shirt-mockup-art">{children}</div>
    </div>
  );
}
