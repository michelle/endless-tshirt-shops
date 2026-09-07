"use client";

import Image from "./ArchiveImage";
import { assetUrl } from "./asset-url";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { suites, type Storefront } from "./data";
import { explainStatus } from "./status";
import { rateRun } from "./ratings";
import { summaryHeadings } from "./summary-headings";
import { useDrawerSwipe } from "./use-drawer-swipe";
import { viewerLink } from "./permalinks";
import { useModalDrawer } from "./use-modal-drawer";
import { changeTheme, readTheme, subscribeTheme } from "./theme";

function ignoreShortcut(event: KeyboardEvent) {
  const target = event.target;
  return event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
    (target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('input, textarea, select, [role="textbox"]'))));
}

function subscribeToNavigation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

function navigationFromUrl() {
  return window.location.search + window.location.hash;
}

function navigateToRun(suiteId: string, runId?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("suite", suiteId);
  if (runId) url.searchParams.set("run", runId);
  else url.searchParams.delete("run");
  url.hash = "";
  if (url.href === window.location.href) return;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function RunStatus({ status, suiteId, runId }: { status: string; suiteId: string; runId: string }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const rating = rateRun(suiteId, runId);
  return (
    <div className="status-help" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="run-status"
        data-tone={rating.tone}
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
        {rating.label} · {rating.passed}/3 <span className="status-help-mark" aria-hidden="true">?</span>
      </button>
      <div id={tooltipId} role="tooltip" className="status-tooltip" hidden={!open} onMouseLeave={() => setOpen(false)}>
        {rating.checks.map((check) => (
          <p key={check.id}><strong>{check.result === "pass" ? "✓" : check.result === "fail" ? "✕" : "?"} {check.label}: {check.result}</strong> — {check.reason}</p>
        ))}
        <p>Green = 3/3; yellow = 2/3; red = 0–1/3. Unverified checks do not pass. Sandbox evidence, not physical print or launch certification.</p>
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

function CopyPermalink({ suiteId, runId }: { suiteId: string; runId: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return (
    <button
      type="button"
      className="drawer-permalink"
      aria-label="Copy permalink"
      aria-live="polite"
      title={status === "failed" ? "Clipboard unavailable. Copy the address from your browser instead." : "Copy a direct link to this run"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(viewerLink(suiteId, runId), window.location.href).href);
          setStatus("copied");
        } catch { setStatus("failed"); }
      }}
    >
      {status === "copied" ? "Copied!" : status === "failed" ? "Copy failed" : "Copy permalink"}
    </button>
  );
}

function Markdown({ source, summarySuite }: { source: string; summarySuite?: string }) {
  const components: Components = {
    a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
    // Scrollable tables need a focus target for keyboard-only horizontal reading.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    table: ({ children }) => <table tabIndex={0} aria-label="Scrollable data table">{children}</table>,
  };
  if (summarySuite) {
    for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
      const Heading = tag;
      components[tag] = ({ children, id }) => (
        <Heading id={id} className="summary-heading">
          <a className="heading-link" href={viewerLink(summarySuite, undefined, id)}>{children}<span aria-hidden="true" className="heading-link-mark"> #</span></a>
        </Heading>
      );
    }
  }
  return (
    <ReactMarkdown
      remarkPlugins={summarySuite ? [remarkGfm, summaryHeadings] : [remarkGfm]}
      components={components}
    >
      {source}
    </ReactMarkdown>
  );
}

export default function Viewer() {
  const navigation = useSyncExternalStore(subscribeToNavigation, navigationFromUrl, () => "");
  const [search, hash = ""] = navigation.split("#");
  const params = new URLSearchParams(search);
  const suiteId = params.get("suite") ?? suites[0].id;
  const [background, setBackground] = useState("#30363d");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");
  const [promptNavigation, setPromptNavigation] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [captures, setCaptures] = useState<Record<string, Record<string, Storefront>>>({});
  const selectedRunId = params.get("run");
  const drawer = useRef<HTMLDialogElement>(null);
  const drawerContent = useRef<HTMLDivElement>(null);
  const promptDrawer = useRef<HTMLDialogElement>(null);
  const promptContent = useRef<HTMLDivElement>(null);

  const suite = useMemo(
    () => suites.find((candidate) => candidate.id === suiteId) ?? suites[0],
    [suiteId],
  );
  const selectedRun = suite.runs.find((run) => run.id === selectedRunId);
  const storefronts = captures[suite.id];
  const selectedStorefront = selectedRun ? storefronts?.[selectedRun.id] : undefined;
  const selectedIndex = suite.runs.findIndex((run) => run.id === selectedRunId);
  const drawerOpen = Boolean(selectedRun);
  const promptOpen = promptNavigation !== null && promptNavigation === navigation && !drawerOpen;
  const closeRun = useCallback(() => navigateToRun(suite.id), [suite.id]);
  const closePrompt = useCallback(() => setPromptNavigation(null), [setPromptNavigation]);
  useModalDrawer(drawer, drawerOpen, closeRun);
  useModalDrawer(promptDrawer, promptOpen, closePrompt);
  useEffect(() => {
    if (!promptOpen) return;
    return subscribeToNavigation(closePrompt);
  }, [promptOpen, closePrompt]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const moveRun = useCallback((direction: number) => {
    const nextRun = suite.runs[selectedIndex + direction];
    if (nextRun) navigateToRun(suite.id, nextRun.id);
  }, [suite, selectedIndex]);
  useDrawerSwipe(drawerContent, moveRun);

  useEffect(() => {
    function scrollPage(event: KeyboardEvent) {
      if (drawer.current?.open || promptDrawer.current?.open || ignoreShortcut(event) || !["j", "k"].includes(event.key)) return;
      event.preventDefault();
      window.scrollBy({ top: event.key === "j" ? 80 : -80, behavior: "instant" });
    }
    window.addEventListener("keydown", scrollPage);
    return () => window.removeEventListener("keydown", scrollPage);
  }, []);

  useEffect(() => {
    drawerContent.current?.scrollTo({ top: 0 });
  }, [selectedRunId, suiteId]);

  const summarySource = documents[suite.summary];
  useEffect(() => {
    if (!hash || drawerOpen || !summarySource) return;
    let id: string;
    try { id = decodeURIComponent(hash); } catch { return; }
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash, drawerOpen, summarySource, suiteId]);

  useEffect(() => {
    if (suite.runs.length === 0) return;
    const controller = new AbortController();
    const manifest = `/suites/${suite.id}/storefronts.json`;
    fetch(assetUrl(manifest), { signal: controller.signal, cache: "no-store" })
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
    const paths = [suite.summary, suite.prompt.path, ...suite.runs.map((run) => run.finalOutput)];
    const missing = paths.filter((documentPath) => documents[documentPath] === undefined);

    if (missing.length > 0) {
      Promise.all(missing.map(async (documentPath) => {
        try {
          const response = await fetch(assetUrl(documentPath));
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
    <main aria-keyshortcuts="j k">
      <h1 className="viewer-title">endless tshirt shops</h1>

      <section className="controls" aria-label="Viewer controls">
        <label>
          <span className="sr-only">Suite</span>
          <select value={suite.id} onChange={(event) => {
            navigateToRun(event.target.value);
          }}>
            {suites.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}{candidate.runs.length === 0 ? " (legacy)" : ""}</option>
            ))}
          </select>
        </label>
        <button type="button" className="control-button" aria-haspopup="dialog" aria-controls="prompt-drawer" onClick={() => setPromptNavigation(navigation)}>Show prompt</button>
        <label className="color-control">
          T-shirt background
          <span>
            <input
              type="color"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              aria-label="T-shirt background color"
            />
          </span>
        </label>
        <button type="button" className="control-button theme-toggle" aria-pressed={theme === "dark"} onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}>
          Dark mode
        </button>
        <div className="suite-meta">
          <a href={viewerLink(suite.id, undefined, "suite-summary")}>Summary</a>
          <a href={assetUrl(suite.summary)} download aria-label="Download suite summary as Markdown">.md ↓</a>
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
                <RunStatus status={run.status} suiteId={suite.id} runId={run.id} />
              </div>

              <div className="card-content">
              {storefront && (
                <button
                  type="button"
                  className="storefront-thumbnail"
                  aria-label={`View storefront screenshot for ${modelName(run.model)}`}
                  aria-haspopup="dialog"
                  aria-controls="run-drawer"
                  onClick={() => navigateToRun(suite.id, run.id)}
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
                onClick={() => navigateToRun(suite.id, run.id)}
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
          <Markdown source={documents[suite.summary] ?? "Loading…"} summarySuite={suite.id} />
        </div>
      </section>

      <dialog
        ref={drawer}
        id="run-drawer"
        className="run-drawer"
        aria-labelledby="run-drawer-title"
        onCancel={(event) => { event.preventDefault(); navigateToRun(suite.id); }}
        onKeyDown={(event) => {
          if (ignoreShortcut(event.nativeEvent)) return;
          if (["ArrowLeft", "ArrowRight", "h", "l"].includes(event.key)) {
            event.preventDefault();
            moveRun(event.key === "ArrowLeft" || event.key === "h" ? -1 : 1);
          } else if (event.key === "j" || event.key === "k") {
            event.preventDefault();
            drawerContent.current?.scrollBy({ top: event.key === "j" ? 80 : -80, behavior: "instant" });
          }
        }}
      >
        {selectedRun && (
          <>
            <div className="drawer-heading">
              <div>
                <p className="drawer-suite">{suite.label} <a href={selectedRun.deployment} target="_blank" rel="noreferrer">Storefront ↗</a></p>
                <h2 id="run-drawer-title">{modelName(selectedRun.model)}</h2>
              </div>
              <div className="drawer-actions">
                <CopyPermalink key={`${suite.id}/${selectedRun.id}`} suiteId={suite.id} runId={selectedRun.id} />
                <span className="run-position" aria-live="polite">{selectedIndex + 1}/{suite.runs.length}</span>
                {/* Keep boundary buttons focusable so disabling navigation never ejects keyboard focus from the dialog. */}
                <button type="button" className="drawer-close" aria-label="Previous run" aria-keyshortcuts="ArrowLeft h" title="Previous run (← or h)" aria-disabled={selectedIndex === 0} onClick={() => moveRun(-1)}>←</button>
                <button type="button" className="drawer-close" aria-label="Next run" aria-keyshortcuts="ArrowRight l" title="Next run (→ or l)" aria-disabled={selectedIndex === suite.runs.length - 1} onClick={() => moveRun(1)}>→</button>
                <button type="button" className="drawer-close" aria-label="Close run details" aria-keyshortcuts="Escape" title="Close (Esc)" onClick={() => navigateToRun(suite.id)}>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>
            <div className="drawer-content" ref={drawerContent} role="region" aria-label="Run details and final output (swipe left/right for runs, j/k to scroll)" aria-keyshortcuts="j k">
              {selectedStorefront && (
                <figure className="storefront-preview">
                  <a href={selectedRun.deployment} target="_blank" rel="noreferrer" aria-label="Open storefront from screenshot">
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
                <RunStatus key={selectedRun.id} status={selectedRun.status} suiteId={suite.id} runId={selectedRun.id} />
                <dl className="rating-checks" aria-label="Run acceptance checks">
                  {rateRun(suite.id, selectedRun.id).checks.map((check) => (
                    <div key={check.id}>
                      <dt title={check.definition}>{check.label} · {check.result}</dt>
                      <dd>{check.reason}</dd>
                    </div>
                  ))}
                </dl>
                <p className="image-meta">{selectedRun.width} × {selectedRun.height}px · {selectedRun.alpha} · <code>{selectedRun.commit}</code></p>
                <p className="evidence">{selectedRun.evidence}</p>
                <div className="card-links">
                  <a href={assetUrl(selectedRun.design)} download>Design ↓</a>
                  <a href={assetUrl(selectedRun.finalOutput)} download>final.md ↓</a>
                </div>
              </section>
              <section className="social-preview" aria-labelledby="social-preview-title">
                <h3 id="social-preview-title" className="final-output-title">Social preview</h3>
                {selectedStorefront?.socialPreview ? (
                  <figure className="storefront-preview">
                    <a href={assetUrl(selectedStorefront.socialPreview.path)} target="_blank" rel="noreferrer" aria-label="Open full-size social preview">
                      <Image src={selectedStorefront.socialPreview.path} alt={`Published social preview by ${modelName(selectedRun.model)}`} width={selectedStorefront.socialPreview.width} height={selectedStorefront.socialPreview.height} unoptimized />
                    </a>
                    <figcaption>{selectedStorefront.socialPreview.width} × {selectedStorefront.socialPreview.height} · Published {selectedStorefront.socialPreview.tag} image, not print artwork</figcaption>
                  </figure>
                ) : (
                  <p className="image-meta">{selectedStorefront?.socialPreviewStatus === "missing" ? "No social preview image published." : selectedStorefront?.socialPreviewStatus === "unavailable" ? "Published social preview could not be retrieved." : "Social preview not captured yet."}</p>
                )}
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

      <dialog ref={promptDrawer} id="prompt-drawer" className="run-drawer prompt-drawer" aria-labelledby="prompt-drawer-title"
        onCancel={(event) => { event.preventDefault(); closePrompt(); }}
        onKeyDown={(event) => {
          if (ignoreShortcut(event.nativeEvent) || !["j", "k"].includes(event.key)) return;
          event.preventDefault();
          promptContent.current?.scrollBy({ top: event.key === "j" ? 80 : -80, behavior: "instant" });
        }}>
        {promptOpen && <>
          <div className="drawer-heading">
            <div><p className="drawer-suite">{suite.label}</p><h2 id="prompt-drawer-title">{suite.prompt.file}</h2></div>
            <button type="button" className="drawer-close" aria-label="Close prompt" title="Close (Esc)" onClick={closePrompt}>×</button>
          </div>
          <div className="drawer-content" ref={promptContent} role="region" aria-label="Suite prompt" aria-keyshortcuts="j k">
            <div className="markdown"><Markdown source={documents[suite.prompt.path] ?? "Loading…"} /></div>
          </div>
        </>}
      </dialog>
    </main>
  );
}
