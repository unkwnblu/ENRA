export type UserRole = 'user' | 'responder' | 'admin'
export type EmergencyType = 'medical' | 'fire' | 'security' | 'accident'
export type IncidentStatus = 'active' | 'resolved' | 'cancelled'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string
  role: UserRole
  suspended?: boolean
  created_at: string
}

export interface Incident {
  id: string
  victim_id: string
  emergency_type: EmergencyType
  status: IncidentStatus
  latitude: number
  longitude: number
  address: string
  responder_id: string | null
  created_at: string
  resolved_at: string | null
  victim?: Profile
  responder?: Profile
}

export interface IncidentUpdate {
  id: string
  incident_id: string
  actor_id: string
  message: string
  status: string
  created_at: string
  actor?: Profile
}

export interface Responder {
  id: string
  is_on_duty: boolean
  total_handled: number
  avg_response_time: number
  profile?: Profile
}

export interface EmergencyContact {
  id: string
  user_id: string
  name: string
  phone: string
  relationship: string
}
