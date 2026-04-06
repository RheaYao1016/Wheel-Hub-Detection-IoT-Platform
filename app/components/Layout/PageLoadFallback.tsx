import BackButton from "./BackButton";

type PageLoadFallbackProps = {
  fallbackHref?: string;
  title?: string;
  description?: string;
};

export default function PageLoadFallback({
  fallbackHref = "/workspace",
  title = "Loading workspace",
  description = "Verifying your session and preparing the page layout...",
}: PageLoadFallbackProps) {
  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref={fallbackHref} />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">Workspace Loading</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>Layout</span>
            <strong>...</strong>
          </div>
          <div>
            <span>Session</span>
            <strong>...</strong>
          </div>
          <div>
            <span>Data</span>
            <strong>...</strong>
          </div>
        </div>
      </section>

      <div className="empty-state">
        <span>...</span>
        {description}
      </div>
    </div>
  );
}
