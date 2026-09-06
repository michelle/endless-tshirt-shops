export function Faq({ supportEmail }: { supportEmail?: string }) {
  const contact = supportEmail ? (
    <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
  ) : (
    <>the email on your receipt</>
  );
  return (
    <section className="faq" id="faq">
      <h2>Frequently asked questions</h2>
      <details>
        <summary>Is the time on the shirt accurate?</summary>
        <p>It was.</p>
      </details>
      <details>
        <summary>What timezone is it in?</summary>
        <p>
          None. It&rsquo;s the number of milliseconds since January 1, 1970 (UTC). We sell
          datetimes, not timezones. Timezones are a separate store we are not going to build.
        </p>
      </details>
      <details>
        <summary>Can I choose a different time?</summary>
        <p>
          No. This is a store for the current datetime. For other datetimes, please wait, or try to
          remember.
        </p>
      </details>
      <details>
        <summary>What if I want the same shirt as my friend?</summary>
        <p>Click at the same millisecond. Good luck.</p>
      </details>
      <details>
        <summary>How is it made?</summary>
        <p>
          When you click Buy, we freeze the number, charge your card with Stripe, and hand a very
          large PNG of that number to our printer (Prodigi), who puts it on a black 100% cotton tee
          and ships it to you. Standard shipping takes a few business days, which is a lot of
          milliseconds.
        </p>
      </details>
      <details>
        <summary>Why is it on sale?</summary>
        <p>The sale ends soon. It has been ending soon since 2017.</p>
      </details>
      <details>
        <summary>Can I return it?</summary>
        <p>
          You cannot return to that moment. The shirt, however, is printed on demand just for you,
          so we can only take it back if it arrives damaged or wrong. If so, write to {contact} and
          we&rsquo;ll sort it out.
        </p>
      </details>
      <details>
        <summary>Why?</summary>
        <p>Why not.</p>
      </details>
    </section>
  );
}
