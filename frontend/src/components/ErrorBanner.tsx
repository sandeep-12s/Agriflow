function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4"
    >
      {message}
    </p>
  )
}

export default ErrorBanner
