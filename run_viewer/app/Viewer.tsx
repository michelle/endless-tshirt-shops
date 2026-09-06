"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { suites, type Storefront } from "./data";
import { explainStatus } from "./status";

function RunStatus({ status }: { status: string }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="status-help" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="run-status"
        data-tone={status.startsWith("Paid E2E") ? "complete" : "partial"}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        {status} <span className="status-help-mark" aria-hidden="true">?</span>
      </button>
      <div id={tooltipId} role="tooltip" className="status-tooltip" hidden={!open} onMouseLeave={() => setOpen(false)}>
        {explainStatus(status).map(({ label, definition }) => (
          <p key={label}><strong>{label}</strong> — {definition}</p>
        ))}
      </div>
    </div>
  );
}

function modelName(model: string) {
  return model.split(" · ").at(-1) ?? model;
}

function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

export default function Viewer() {
  const [suiteId, setSuiteId] = useState(suites[0].id);
  const [background, setBackground] = useState("#30363d");
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [captures, setCaptures] = useState<Record<string, Record<string, Storefront>>>({});
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const drawerContent = useRef<HTMLDivElement>(null);

  const suite = useMemo(
    () => suites.find((candidate) => candidate.id === suiteId) ?? suites[0],
    [suiteId],
  );
  const selectedRun = suite.runs.find((run) => run.id === selectedRunId);
  const storefronts = captures[suite.id];
  const selectedStorefront = selectedRun ? storefronts?.[selectedRun.id] : undefined;
  const selectedIndex = suite.runs.findIndex((run) => run.id === selectedRunId);
  const drawerOpen = Boolean(selectedRun);

  function moveRun(direction: number) {
    const nextRun = suite.runs[selectedIndex + direction];
    if (nextRun) setSelectedRunId(nextRun.id);
  }

  useEffect(() => {
    const dialog = drawer.current;
    if (!drawerOpen || !dialog) return;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    drawerContent.current?.scrollTo({ top: 0 });
  }, [selectedRunId]);

  useEffect(() => {
    if (suite.runs.length === 0) return;
    const controller = new AbortController();
    const manifest = `/suites/${suite.id}/storefronts.json`;
    fetch(manifest, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) return {};
        if (!response.ok) throw new Error(`Capture manifest: HTTP ${response.status}`);
        return await response.json() as Record<string, Storefront>;
      })
      .then((entries) => setCaptures((current) => ({ ...current, [suite.id]: entries })))
      .catch((error) => {
        if (!controller.signal.aborted) console.error(error);
      });
    return () => controller.abort();
  }, [suite]);

  useEffect(() => {
    let current = true;
    const paths = [suite.summary, ...suite.runs.map((run) => run.finalOutput)];
    const missing = paths.filter((documentPath) => documents[documentPath] === undefined);

    if (missing.length > 0) {
      Promise.all(missing.map(async (documentPath) => {
        try {
          const response = await fetch(documentPath);
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          return [documentPath, await response.text()] as const;
        } catch (error) {
          return [documentPath, `Could not load ${documentPath}: ${error}`] as const;
        }
      }))
        .then((entries) => {
          if (current) setDocuments((existing) => ({ ...existing, ...Object.fromEntries(entries) }));
        });
    }

    return () => {
      current = false;
    };
  }, [documents, suite]);

  return (
    <main>
      <h1 className="viewer-title">Benchmark runs</h1>

      <section className="controls" aria-label="Viewer controls">
        <label>
          <span className="sr-only">Suite</span>
          <select value={suite.id} onChange={(event) => {
            setSelectedRunId(null);
            setSuiteId(event.target.value);
          }}>
            {suites.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </select>
        </label>
        <label className="color-control">
          Background
          <span>
            <input
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              aria-label="Design background color"
            />
          </span>
        </label>
        <div className="suite-meta">
          <a href="#suite-summary">Summary</a>
          <a href={suite.summary} download aria-label="Download suite summary as Markdown">.md ↓</a>
        </div>
      </section>

      {suite.runs.length > 0 ? (
        <section className="design-grid" aria-label={`${suite.label} designs`}>
          {suite.runs.map((run) => {
            const storefront = storefronts?.[run.id];
            return (
            <article className="design-card" key={run.id}>
              <div className="card-heading">
                <h3 className="model-title">
                  {storefront && (storefront.favicon ? (
                    <Image src={storefront.favicon.path} width={16} height={16} unoptimized alt="" className="storefront-favicon" />
                  ) : (
                    <span className="missing-favicon" role="img" aria-label={storefront.faviconStatus === "unavailable" ? "Favicon could not be retrieved" : "No favicon published"} title={storefront.faviconStatus === "unavailable" ? "Favicon could not be retrieved" : "No favicon published"} />
                  ))}
                  <span>{modelName(run.model)}</span>
                </h3>
                <RunStatus status={run.status} />
              </div>

              <div className="card-content">
              {storefront && (
                <button
                  type="button"
                  className="storefront-thumbnail"
                  aria-label={`View storefront screenshot for ${modelName(run.model)}`}
                  aria-haspopup="dialog"
                  aria-controls="run-drawer"
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <Image
                    src={storefront.screenshot}
                    alt={`Above-the-fold storefront by ${modelName(run.model)}`}
                    width={storefront.width}
                    height={storefront.height}
                    sizes="(max-width: 680px) 100vw, (max-width: 900px) 25vw, 14vw"
                    unoptimized
                  />
                </button>
              )}

              <div
                className="art-canvas"
                style={{ aspectRatio: `${run.width} / ${run.height}`, backgroundColor: background }}
              >
                <Image
                  src={run.design}
                  alt={`Full print canvas generated by ${run.model}`}
                  fill
                  sizes="(max-width: 680px) 100vw, (max-width: 900px) 25vw, 14vw"
                  unoptimized
                />
              </div>

              <button
                type="button"
                className="run-details-button"
                aria-label={`View details and final output for ${run.model}`}
                aria-haspopup="dialog"
                aria-controls="run-drawer"
                onClick={() => setSelectedRunId(run.id)}
              >
                Details <span aria-hidden="true">↗</span>
              </button>
              </div>
            </article>
            );
          })}
        </section>
      ) : (
        <section className="summary-only">
          <p>Artwork not recovered.</p>
        </section>
      )}

      <section className="summary-section" id="suite-summary" aria-label="Suite summary">
        <div className="markdown">
          <Markdown source={documents[suite.summary] ?? "Loading…"} />
        </div>
      </section>

      <dialog
        ref={drawer}
        id="run-drawer"
        className="run-drawer"
        aria-labelledby="run-drawer-title"
        onClose={() => setSelectedRunId(null)}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || target.closest("input, textarea, select, [contenteditable=true]")) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveRun(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {selectedRun && (
          <>
            <div className="drawer-heading">
              <div>
                <p className="drawer-suite">{suite.label}</p>
                <h2 id="run-drawer-title">{modelName(selectedRun.model)}</h2>
              </div>
              <div className="drawer-actions">
                <span className="run-position" aria-live="polite">{selectedIndex + 1}/{suite.runs.length}</span>
                <button type="button" className="drawer-close" aria-label="Previous run" title="Previous run (←)" disabled={selectedIndex === 0} onClick={() => moveRun(-1)}>←</button>
                <button type="button" className="drawer-close" aria-label="Next run" title="Next run (→)" disabled={selectedIndex === suite.runs.length - 1} onClick={() => moveRun(1)}>→</button>
                <button type="button" className="drawer-close" aria-label="Close run details" onClick={() => drawer.current?.close()}>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>
            <div className="drawer-content" ref={drawerContent}>
              {selectedStorefront && (
                <figure className="storefront-preview">
                  <a href={selectedStorefront.screenshot} target="_blank" rel="noreferrer" aria-label="Open full-size storefront screenshot">
                    <Image
                      src={selectedStorefront.screenshot}
                      alt={`Above-the-fold storefront by ${modelName(selectedRun.model)}`}
                      width={selectedStorefront.width}
                      height={selectedStorefront.height}
                      sizes="(max-width: 760px) 100vw, 704px"
                      unoptimized
                    />
                  </a>
                  <figcaption>
                    {selectedStorefront.width} × {selectedStorefront.height} · Captured {selectedStorefront.capturedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}
                    {!selectedStorefront.favicon && (selectedStorefront.faviconStatus === "unavailable" ? " · Favicon unavailable" : " · No favicon published")}
                  </figcaption>
                </figure>
              )}
              <section className="drawer-evidence" aria-label="Run details">
                <RunStatus key={selectedRun.id} status={selectedRun.status} />
                <p className="image-meta">{selectedRun.width} × {selectedRun.height}px · {selectedRun.alpha} · <code>{selectedRun.commit}</code></p>
                <p className="evidence">{selectedRun.evidence}</p>
                <div className="card-links">
                  <a href={selectedRun.design} download>Design ↓</a>
                  <a href={selectedRun.finalOutput} download>final.md ↓</a>
                  <a href={selectedRun.deployment} target="_blank" rel="noreferrer">Storefront ↗</a>
                </div>
              </section>
              <section aria-labelledby="final-output-title">
                <h3 id="final-output-title" className="final-output-title">Final output</h3>
                <div className="markdown final-output">
                  <Markdown source={documents[selectedRun.finalOutput] ?? "Loading…"} />
                </div>
              </section>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
