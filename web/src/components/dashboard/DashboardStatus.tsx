export function LoadingRow() {
  return (
    <div className="dashboard-loading-row">
      <div className="spinner dashboard-loading-spinner" />
      <span>Loading…</span>
    </div>
  )
}

export function ErrorRow({ msg }: { msg: string }) {
  return <div className="dashboard-error-row">{msg}</div>
}
