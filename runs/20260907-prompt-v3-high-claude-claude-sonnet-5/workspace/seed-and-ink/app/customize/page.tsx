import { CustomizeForm } from '@/components/CustomizeForm';

export default function CustomizePage() {
  return (
    <div>
      <div className="max-w-5xl mx-auto px-6 pt-10">
        <h1 className="font-display text-3xl">Design your one-of-one</h1>
        <p className="text-neutral-400 mt-2 max-w-2xl">
          Everything below is generated live, from scratch, using only your
          seed phrase. Nothing is pre-made — this exact combination has never
          been printed before.
        </p>
      </div>
      <CustomizeForm />
    </div>
  );
}
