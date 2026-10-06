import { Configurator } from '@/components/Configurator';
import { LABEL_PRESETS, PRESET_PLACES } from '@/lib/places';
import { SIZES, SHIRTS } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default function DesignPage() {
  return (
    <div className="bg-bone min-h-[100vh]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="font-mono text-xs uppercase tracking-widest text-rust">CUSTOMIZE</div>
        <h1 className="font-serif text-4xl md:text-5xl mt-1 tracking-tight">Make your shirt.</h1>
        <p className="text-ink/70 mt-1 max-w-xl">All fields have live preview. We don't save anything until you check out.</p>
      </div>
      <Configurator
        labels={LABEL_PRESETS}
        places={PRESET_PLACES}
        shirts={SHIRTS}
        sizes={SIZES}
      />
    </div>
  );
}
