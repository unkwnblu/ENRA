import type { EmergencyType, IncidentStatus } from '@/types'

type BadgeVariant = EmergencyType | IncidentStatus | 'on_duty' | 'off_duty' | 'suspended'

const variantClasses: Record<BadgeVariant, string> = {
  medical: 'bg-red-100 text-red-700',
  fire: 'bg-orange-100 text-orange-700',
  security: 'bg-blue-100 text-blue-700',
  accident: 'bg-yellow-100 text-yellow-700',
  active: 'bg-red-100 text-red-700',
  resolved: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-600',
  on_duty: 'bg-green-100 text-green-700',
  off_duty: 'bg-slate-100 text-slate-500',
  suspended: 'bg-red-100 text-red-700',
}

interface BadgeProps {
  variant: BadgeVariant
  label?: string
}

export default function Badge({ variant, label }: BadgeProps) {
  const displayLabel = label ?? variant.replace('_', ' ')
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${variantClasses[variant]}`}>
      {displayLabel}
    </span>
  )
}
