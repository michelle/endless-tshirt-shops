'use client';

import { useEffect, useState } from 'react';

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 47);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className={className}>&nbsp;</span>;
  }

  const time = now.toLocaleTimeString('en-US', { hour12: false });
  const ms = String(now.getMilliseconds()).padStart(3, '0');

  return (
    <span className={className} suppressHydrationWarning>
      {time}
      <span className="opacity-50">.{ms}</span>
    </span>
  );
}
