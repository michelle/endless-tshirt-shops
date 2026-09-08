import Image from "next/image";
import { ShirtCustomizer } from "@/components/shirt-customizer";

const steps = [
  ["01", "Mark a moment", "Choose a place, date, and the words that belong to it."],
  ["02", "We map the orbit", "Your details become a unique, print-ready orbital composition."],
  ["03", "Made only for you", "Printed on demand and shipped directly—no dead stock, no duplicate story."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Orbit One home">ORBIT<span>/</span>ONE</a>
        <nav aria-label="Primary navigation"><a href="#studio">Create yours</a><a href="#story">The idea</a></nav>
        <a className="header-cta" href="#studio">Design a shirt</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> ONE MOMENT. ONE ORBIT.</p>
          <h1>Your coordinates,<br /><em>in motion.</em></h1>
          <p className="hero-deck">Turn a place, a date, and a few true words into a wearable map that belongs to no one else.</p>
          <a className="button button-lime" href="#studio">Make your orbit <span aria-hidden="true">↘</span></a>
          <div className="hero-notes"><span>Heavyweight cotton</span><span>DTG printed to order</span><span>Ships worldwide</span></div>
        </div>
        <div className="hero-image-wrap">
          <Image src="/orbit-one-hero.png" alt="Model wearing a black t-shirt with a vivid orbital line design" fill sizes="(max-width: 900px) 100vw, 48vw" priority className="hero-image" />
          <p className="image-caption">THE ORIGINAL ORBIT / CUSTOM SERIES 001</p>
        </div>
      </section>

      <section className="studio" id="studio">
        <div className="section-heading">
          <p className="eyebrow"><span /> YOUR ORBIT STUDIO</p>
          <h2>Make the invisible<br /><em>visible.</em></h2>
          <p>Every input changes the composition. Your final design is generated at production resolution after checkout.</p>
        </div>
        <ShirtCustomizer />
      </section>

      <section className="story" id="story">
        <div className="story-intro"><p className="eyebrow"><span /> FROM MEMORY TO MATTER</p><h2>Not merch.<br /><em>A record.</em></h2></div>
        <div className="steps">
          {steps.map(([number, title, copy]) => <article key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <footer><a className="wordmark" href="#top">ORBIT<span>/</span>ONE</a><p>Personalized in your browser. Printed only when ordered.</p><p>© {new Date().getFullYear()} ORBIT/ONE</p></footer>
    </main>
  );
}
