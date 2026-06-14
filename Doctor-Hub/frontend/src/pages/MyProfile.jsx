import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../context/AppContext'
import PageHeader from '../components/layout/PageHeader.jsx'
import UserAvatar from '../components/ui/UserAvatar.jsx'
import { getAvatarUrl } from '../utils/avatar.js'

function displayName(user) {
  return (user?.name || user?.full_name || 'User').trim()
}

function formatDob(dob) {
  if (!dob || dob === 'Not Selected') return '—'
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return dob
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  )
}

export default function MyProfile() {
  const { token, backendUrl, userData, setUserData, loadUserProfileData, isLoading } =
    useContext(AppContext)

  const [isEdit, setIsEdit] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (token) loadUserProfileData()
  }, [token])

  const phoneDisplay =
    userData?.phone && userData.phone !== '000000000' ? userData.phone : ''
  const genderDisplay =
    userData?.gender === 'Not Selecte' ? 'Not Selected' : userData?.gender || 'Not Selected'

  const updateUserProfileData = async () => {
    if (!userData?.name?.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', userData.name.trim())
      formData.append('phone', userData.phone || '')
      formData.append(
        'address',
        JSON.stringify({
          line1: userData.address?.line1 || '',
          line2: userData.address?.line2 || '',
        })
      )
      formData.append('gender', userData.gender || 'Not Selected')
      formData.append('dob', userData.dob || 'Not Selected')
      if (imageFile) formData.append('image', imageFile)

      const { data } = await axios.patch(`${backendUrl}/api/auth/profile`, formData, {
        headers: { token },
      })

      if (data.success) {
        toast.success(data.message || 'Profile updated')
        await loadUserProfileData()
        setIsEdit(false)
        setImageFile(null)
      } else {
        toast.error(data.message || 'Update failed')
      }
    } catch (error) {
      toast.error(error.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setIsEdit(false)
    setImageFile(null)
    loadUserProfileData()
  }

  if (isLoading && !userData) {
    return (
      <div className="pb-12">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="dh-card px-8 py-16 text-center">
        <p className="font-semibold text-slate-900">Could not load profile</p>
        <button type="button" className="dh-btn mt-4" onClick={() => loadUserProfileData()}>
          Retry
        </button>
      </div>
    )
  }

  const name = displayName(userData)
  const previewImage = imageFile ? URL.createObjectURL(imageFile) : getAvatarUrl(name, userData.image)

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Manage your contact details and personal information."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
        {/* Profile card */}
        <aside className="dh-card flex flex-col items-center p-6 text-center lg:p-8">
          <div className="relative">
            {isEdit ? (
              <label className="group relative block cursor-pointer">
                <img
                  src={previewImage}
                  alt=""
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
              <UserAvatar
                name={name}
                image={userData.image}
                className="h-32 w-32 rounded-2xl object-cover ring-4 ring-teal-50 shadow-md"
              />
            )}
          </div>

          {isEdit ? (
            <input
              type="text"
              className="dh-input mt-5 w-full text-center text-lg font-semibold"
              value={userData.name || ''}
              onChange={(e) => setUserData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
            />
          ) : (
            <h2 className="mt-5 font-display text-xl font-semibold text-slate-900">{name}</h2>
          )}

          <p className="mt-1 text-sm text-slate-500">{userData.email}</p>

          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row lg:flex-col">
            {isEdit ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={updateUserProfileData}
                  className="dh-btn w-full py-2.5 text-sm"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEdit(true)}
                className="dh-btn w-full py-2.5 text-sm"
              >
                Edit profile
              </button>
            )}
          </div>
        </aside>

        {/* Details */}
        <div className="space-y-6">
          <section className="dh-card p-6 lg:p-8">
            <h3 className="font-display text-lg font-semibold text-slate-900">Contact information</h3>
            <p className="mt-1 text-sm text-slate-500">How doctors and support can reach you.</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Email">
                <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                  {userData.email || '—'}
                </p>
              </Field>

              <Field label="Phone">
                {isEdit ? (
                  <input
                    type="tel"
                    className="dh-input w-full"
                    placeholder="03XX XXXXXXX"
                    value={phoneDisplay}
                    onChange={(e) => setUserData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                    {phoneDisplay || '—'}
                  </p>
                )}
              </Field>

              <Field label="Address line 1">
                {isEdit ? (
                  <input
                    type="text"
                    className="dh-input w-full"
                    placeholder="Street, area"
                    value={userData.address?.line1 || ''}
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        address: { ...(prev.address || {}), line1: e.target.value },
                      }))
                    }
                  />
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                    {userData.address?.line1 || '—'}
                  </p>
                )}
              </Field>

              <Field label="Address line 2">
                {isEdit ? (
                  <input
                    type="text"
                    className="dh-input w-full"
                    placeholder="City, postal code"
                    value={userData.address?.line2 || ''}
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        address: { ...(prev.address || {}), line2: e.target.value },
                      }))
                    }
                  />
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                    {userData.address?.line2 || '—'}
                  </p>
                )}
              </Field>
            </div>
          </section>

          <section className="dh-card p-6 lg:p-8">
            <h3 className="font-display text-lg font-semibold text-slate-900">Basic information</h3>
            <p className="mt-1 text-sm text-slate-500">Used for appointments and medical records.</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Gender">
                {isEdit ? (
                  <select
                    className="dh-input w-full"
                    value={genderDisplay}
                    onChange={(e) => setUserData((prev) => ({ ...prev, gender: e.target.value }))}
                  >
                    <option value="Not Selected">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                    {genderDisplay === 'Not Selected' ? '—' : genderDisplay}
                  </p>
                )}
              </Field>

              <Field label="Date of birth">
                {isEdit ? (
                  <input
                    type="date"
                    className="dh-input w-full"
                    value={
                      userData.dob && userData.dob !== 'Not Selected'
                        ? userData.dob.slice(0, 10)
                        : ''
                    }
                    onChange={(e) => setUserData((prev) => ({ ...prev, dob: e.target.value }))}
                  />
                ) : (
                  <p className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
                    {formatDob(userData.dob)}
                  </p>
                )}
              </Field>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
