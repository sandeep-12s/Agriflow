import { ReactNode } from 'react'

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-soil/20 p-8 text-center">
      <p className="text-soil font-medium mb-1">{title}</p>
      {description && <p className="text-sm text-soil/60 mb-4">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState
