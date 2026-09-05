export default function Footer({ testMode }: { testMode: boolean }) {
  return (
    <footer>
      <span>Printed on demand by Prodigi.</span>
      <span>Payments by Stripe.</span>
      <span>Every shirt is unique: the print is the millisecond you bought it.</span>
      {testMode ? <span>Test mode: cards are not charged and orders go to Prodigi&apos;s sandbox.</span> : null}
      <a href="https://github.com/michelle/datetime.store" rel="noreferrer">
        Inspired by the original datetime.store
      </a>
    </footer>
  );
}
