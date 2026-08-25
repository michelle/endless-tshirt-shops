import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'datetime.store — a moment you can wear',
  description: 'A shirt printed with the exact moment you made it yours.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
