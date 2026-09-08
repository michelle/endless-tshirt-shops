export function Footer() {
  return (
    <footer className="mt-24 border-t-4 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="font-display text-sm uppercase tracking-wide">
              The Bureau of Ordinary Monsters
            </div>
            <p className="mt-2 text-sm text-paper/70">
              A fictional federal agency for cryptid HR compliance. Est. never,
              technically. All shirts printed and shipped to order — nothing
              sits in a warehouse cursed or otherwise.
            </p>
          </div>
          <div>
            <div className="font-display text-xs uppercase tracking-wide text-paper/60">
              Divisions
            </div>
            <ul className="mt-2 space-y-1 text-sm text-paper/80">
              <li>Field Operations</li>
              <li>Underwater Compliance</li>
              <li>Livestock Loss Prevention</li>
              <li>Night Shift Supervision</li>
            </ul>
          </div>
          <div>
            <div className="font-display text-xs uppercase tracking-wide text-paper/60">
              Fine Print
            </div>
            <p className="mt-2 text-sm text-paper/70">
              Demo store. Orders are placed against Prodigi&apos;s sandbox
              print-on-demand API for testing — no real charge is made and
              nothing is physically printed or shipped.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-paper/20 pt-4 text-xs text-paper/50">
          © {new Date().getFullYear()} The Bureau of Ordinary Monsters. Not a
          real government agency. Cryptids depicted are fictional (probably).
        </div>
      </div>
    </footer>
  );
}
