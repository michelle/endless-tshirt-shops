type Fit = 'fitted' | 'unisex';

type Props = {
  fit: Fit;
  timestamp: { date: string; time: string; ms: string };
};

export default function TimestampShirt({ fit, timestamp }: Props) {
  const path = fit === 'fitted'
    ? 'M79.312 15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31 8.721-11.66 8.721-11.66-8.721-11.66-8.721-15.354 4.936-16.486 6.068C22.259 16.2 9.677 32.061 9.677 32.061l10.081 8.37 6.614-5.518s14.411 23.971 1.384 58.875c0 0 43.546 10.767 47.434 0-9.689-43.26 1.379-58.613 1.379-58.613l6.267 5.228 9.35-11.117c0 0-14.24-12.505-15.874-14.137Z'
    : 'M79.313 6.142C77.683 4.511 63.196 4 63.196 4S53.352 17.724 51.535 17.724 39.875 4 39.875 4 24.521 4.932 23.389 6.064C22.259 7.194.562 30.954.562 30.954L16.71 42.975l9.662-8.06 1.384 58.875s43.541 10.705 47.433 0l1.379-58.613 9.347 7.797L99.438 30.953S80.945 7.774 79.313 6.142Z';

  return (
    <div className="shirt-wrap" aria-label={`Black ${fit} t-shirt with the current datetime`}>
      <div className="shirt-art">
        <div className="shirt-time"><div>{timestamp.date}</div><div>{timestamp.time}</div><small>{timestamp.ms}</small></div>
      </div>
      <svg className="shirt-svg" viewBox="0 0 100 125" aria-hidden="true"><path d={path} /></svg>
      <div className="shirt-tag">DT / 001</div>
    </div>
  );
}
