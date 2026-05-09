'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/shared/Modal'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import type { Profile } from '@/types'

interface EmergencyTypeConfig {
  id: string
  name: string
  color: string
}

const DEFAULT_TYPES: EmergencyTypeConfig[] = [
  { id: 'medical', name: 'Medical', color: '#ef4444' },
  { id: 'fire', name: 'Fire', color: '#f97316' },
  { id: 'security', name: 'Security', color: '#3b82f6' },
  { id: 'accident', name: 'Accident', color: '#eab308' },
]

export default function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [admins, setAdmins] = useState<Profile[]>([])
  const [types, setTypes] = useState<EmergencyTypeConfig[]>(DEFAULT_TYPES)

  // Profile form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  // Emergency type modal
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [editingType, setEditingType] = useState<EmergencyTypeConfig | null>(null)
  const [typeName, setTypeName] = useState('')
  const [typeColor, setTypeColor] = useState('#64748b')

  // Add admin modal
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profRes, adminsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profiles').select('*').eq('role', 'admin').order('created_at'),
      ])

      if (profRes.data) {
        const p = profRes.data as Profile
        setProfile(p)
        setFullName(p.full_name ?? '')
        setPhone(p.phone ?? '')
      }
      if (adminsRes.data) setAdmins(adminsRes.data as Profile[])
      setLoading(false)
    }
    fetch()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setProfileSaving(true)
    setProfileMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', profile.id)
    setProfileSaving(false)
    setProfileMsg(error ? error.message : 'Profile updated.')
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setPwMsg('Passwords do not match.'); return }
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters.'); return }
    setPwSaving(true)
    setPwMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwMsg(error.message); return }
    setPwMsg('Password changed successfully.')
    setNewPassword('')
    setConfirmPassword('')
  }

  function handleAddType() {
    setEditingType(null)
    setTypeName('')
    setTypeColor('#64748b')
    setShowTypeModal(true)
  }

  function handleEditType(t: EmergencyTypeConfig) {
    setEditingType(t)
    setTypeName(t.name)
    setTypeColor(t.color)
    setShowTypeModal(true)
  }

  function saveType(e: React.FormEvent) {
    e.preventDefault()
    if (editingType) {
      setTypes((prev) => prev.map((t) => (t.id === editingType.id ? { ...t, name: typeName, color: typeColor } : t)))
    } else {
      setTypes((prev) => [...prev, { id: typeName.toLowerCase().replace(/\s+/g, '_'), name: typeName, color: typeColor }])
    }
    setShowTypeModal(false)
  }

  function deleteType(id: string) {
    if (!confirm('Delete this emergency type?')) return
    setTypes((prev) => prev.filter((t) => t.id !== id))
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault()
    setAdminError('')
    setAdminLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      password: Math.random().toString(36).slice(2) + 'A1!',
    })

    if (error) {
      setAdminError(error.message)
      setAdminLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: adminName,
        email: adminEmail,
        role: 'admin',
      })
      setAdmins((prev) => [...prev, { id: data.user.id, full_name: adminName, email: adminEmail, role: 'admin', phone: '', created_at: new Date().toISOString() }])
    }

    setShowAdminModal(false)
    setAdminName('')
    setAdminEmail('')
    setAdminLoading(false)
  }

  async function removeAdmin(id: string) {
    if (id === profile?.id) { alert('You cannot remove your own admin access.'); return }
    if (!confirm('Remove admin access for this user?')) return
    const supabase = createClient()
    await supabase.from('profiles').update({ role: 'user' }).eq('id', id)
    setAdmins((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner className="h-8 w-8" /></div>

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Emergency Types */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Emergency Types</h3>
          <button onClick={handleAddType}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600">
            <Plus className="h-4 w-4" /> Add Type
          </button>
        </div>
        <div className="space-y-2">
          {types.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm font-medium text-slate-700">{t.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditType(t)} className="p-1 text-slate-400 hover:text-slate-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => deleteType(t.id)} className="p-1 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin Profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Admin Profile</h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          {profileMsg && <p className={`text-sm ${profileMsg.includes('updated') ? 'text-green-600' : 'text-red-600'}`}>{profileMsg}</p>}
          <button type="submit" disabled={profileSaving}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Change Password</h3>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          {pwMsg && <p className={`text-sm ${pwMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</p>}
          <button type="submit" disabled={pwSaving}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Admin Accounts */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Admin Accounts</h3>
          <button onClick={() => { setShowAdminModal(true); setAdminError(''); setAdminName(''); setAdminEmail('') }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600">
            <Plus className="h-4 w-4" /> Add Admin
          </button>
        </div>
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{a.full_name}</p>
                <p className="text-xs text-slate-400">{a.email}</p>
              </div>
              {a.id !== profile?.id && (
                <button onClick={() => removeAdmin(a.id)} className="text-sm font-medium text-orange-500 hover:text-orange-700">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Type Modal */}
      <Modal open={showTypeModal} onClose={() => setShowTypeModal(false)} title={editingType ? 'Edit Emergency Type' : 'Add Emergency Type'}>
        <form onSubmit={saveType} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input required value={typeName} onChange={(e) => setTypeName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={typeColor} onChange={(e) => setTypeColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300" />
              <span className="text-sm text-slate-500">{typeColor}</span>
            </div>
          </div>
          <button type="submit"
            className="w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
            {editingType ? 'Save Changes' : 'Add Type'}
          </button>
        </form>
      </Modal>

      {/* Admin Modal */}
      <Modal open={showAdminModal} onClose={() => setShowAdminModal(false)} title="Add Admin">
        <form onSubmit={addAdmin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input required value={adminName} onChange={(e) => setAdminName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input required type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
          </div>
          {adminError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{adminError}</p>}
          <button type="submit" disabled={adminLoading}
            className="w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {adminLoading ? 'Creating…' : 'Create Admin'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
