import LoadingSpinner from '@/components/shared/LoadingSpinner'

export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  )
}
