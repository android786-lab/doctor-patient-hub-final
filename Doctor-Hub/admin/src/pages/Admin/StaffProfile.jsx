import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import { DoctorContext } from '../../context/DoctorContext'
import PageHeader from '../../components/admin/PageHeader'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'
import { roleFromToken } from '../../utils/staffRole.js'

function roleLabel(role) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  if (role === 'assistant') return 'Assistant'
  if (role === 'doctor') return 'Doctor'
  return 'Staff'
}

export default function StaffProfile() {
  const { aToken, backendUrl: adminBackend } = useContext(AdminContext)
  const { dToken, backendUrl: doctorBackend } = useContext(DoctorContext)
  const token = aToken || dToken
  const backendUrl = adminBackend || doctorBackend
  const role = aToken ? roleFromToken(aToken) : 'doctor'

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEdit, setIsEdit] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const headers = () => {
    if (aToken) return { atoken: aToken, token: aToken }
    return { dtoken: dToken, token: dToken }
  }

  const loadProfile = async () => {
    if (!token) return
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`${backendUrl}/api/auth/me`, { headers: headers() })
      const user = data.user || data
      setProfile(user)
      setName(user.name || user.full_name || '')
      setPhone(user.phone && user.phone !== '000000000' ? user.phone : '')
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [token, backendUrl])

  const saveProfile = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('phone', phone || '')
      if (imageFile) formData.append('image', imageFile)

      const { data } = await axiosClient.post(`${backendUrl}/api/auth/profile`, formData, {
        headers: headers(),
      })

      if (data.success) {
        toast.success(data.message || 'Profile updated')
        setProfile(data.user)
        setIsEdit(false)
        setImageFile(null)
      } else {
        toast.error(data.message || 'Update failed')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setSaving(false)
    }
  }

  const previewImage = imageFile
    ? URL.createObjectURL(imageFile)
    : profile?.image

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-8 h-72 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <PageHeader title="My profile" description="Could not load profile." />
        <button type="button" className="dh-btn mt-4" onClick={loadProfile}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow={roleLabel(role)}
        title="My profile"
        description="Update your name, phone, and profile photo."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <aside className="dh-card flex flex-col items-center p-6 text-center">
          {isEdit ? (
            <label className="group relative block cursor-pointer">
              <DoctorPhoto
                src={previewImage}
                name={name}
                className="h-32 w-32 rounded-2xl object-cover ring-4 ring-teal-50 shadow-md"
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Change photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <DoctorPhoto
              src={profile.image}
              name={profile.name || profile.full_name}
              className="h-32 w-32 rounded-2xl object-cover ring-4 ring-teal-50 shadow-md"
            />
          )}

          {isEdit ? (
            <input
              type="text"
              className="dh-input mt-5 w-full text-center text-lg font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : (
            <h2 className="mt-5 font-display text-xl font-semibold text-slate-900">
              {profile.name || profile.full_name}
            </h2>
          )}

          <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-teal-700">
            {roleLabel(role)}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2">
            {isEdit ? (
              <>
                <button type="button" disabled={saving} onClick={saveProfile} className="dh-btn w-full py-2.5 text-sm">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEdit(false)
                    setImageFile(null)
                    loadProfile()
                  }}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setIsEdit(true)} className="dh-btn w-full py-2.5 text-sm">
                Edit profile
              </button>
            )}
          </div>
        </aside>

        <section className="dh-card p-6 lg:p-8">
          <h3 className="font-display text-lg font-semibold text-slate-900">Contact</h3>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
              <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                {profile.email || '—'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
              {isEdit ? (
                <input
                  type="tel"
                  className="dh-input mt-1 w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+923001234567"
                />
              ) : (
                <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                  {phone || '—'}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
