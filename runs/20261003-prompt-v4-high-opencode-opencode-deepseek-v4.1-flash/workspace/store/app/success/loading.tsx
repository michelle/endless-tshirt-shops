export default function Loading() {
  return (
    <div className="result">
      <div className="result-card">
        <div
          className="check"
          style={{ background: 'rgba(124,156,255,0.12)', borderColor: 'rgba(124,156,255,0.4)', color: '#a9c0ff' }}
        >
          ✦
        </div>
        <h1>Preparing your artwork…</h1>
        <p>
          Payment received. We are generating your one-of-one print file and sending it to the press. This can take
          a few moments.
        </p>
      </div>
    </div>
  );
}
