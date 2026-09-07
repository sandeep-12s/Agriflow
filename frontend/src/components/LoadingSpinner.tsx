function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-soil/60 py-6" role="status" aria-live="polite">
      <span className="w-4 h-4 border-2 border-soil/20 border-t-leaf rounded-full animate-spin" />
      {label}
    </div>
  )
}

export default LoadingSpinner
