export default function WorkspaceLoading() {
  return (
    <div className="workspace-loading" role="status" aria-label="Loading workspace">
      <span className="sr-only">Loading workspace…</span>
      <div className="workspace-loading-line workspace-loading-title" />
      <div className="workspace-loading-line workspace-loading-subtitle" />
      <div className="workspace-loading-grid">
        <div className="workspace-loading-panel" />
        <div className="workspace-loading-panel" />
      </div>
      <div className="workspace-loading-panel workspace-loading-wide" />
    </div>
  );
}
