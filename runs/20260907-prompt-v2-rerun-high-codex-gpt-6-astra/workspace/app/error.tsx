'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="empty-state"><h1>A little bump in the trail.</h1><p>The page couldn’t load. Please give it another try.</p><button className="button" onClick={reset}>Try again</button></main>}
