import { useContext, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import axiosClient from '../../lib/axiosClient'

import { DoctorContext } from '../../context/DoctorContext'

import { AppContext } from '../../context/AppContext'

import PageHeader from '../../components/admin/PageHeader'

import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'



const TREATMENT_LABELS = {

  allopathic: 'Allopathic',

  homeopathic: 'Homeopathic',

  herbal: 'Herbal',

}



function formatAddress(address) {

  if (!address) return '—'

  const line1 = address.line1?.trim()

  const line2 = address.line2?.trim()

  if (line1 && line2) return `${line1}, ${line2}`

  return line1 || line2 || '—'

}



function formatDisplayName(name) {

  if (!name?.trim()) return 'Doctor'

  return name

    .trim()

    .split(/\s+/)

    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

    .join(' ')

}



export default function DoctorProfile() {

  const { dToken, profileData, setProfileData, getProfileData, backendUrl } = useContext(DoctorContext)

  const { formatMoney } = useContext(AppContext)

  const [isEdit, setIsEdit] = useState(false)

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [availabilitySaving, setAvailabilitySaving] = useState(false)



  useEffect(() => {

    if (!dToken) return

    setLoading(true)

    getProfileData().finally(() => setLoading(false))

  }, [dToken])



  const updateProfile = async () => {

    setSaving(true)

    try {

      const payload = {

        specialization: profileData.speciality || profileData.specialization,

        treatment_type: profileData.treatment_type,

        treatmentType: profileData.treatment_type,

        experience: profileData.experience,

        experience_years: profileData.experience_years,

        fee: profileData.fees,

        bio: profileData.about,

        address: profileData.address,

        available: profileData.available,

        phone: profileData.phone,

      }

      const { data } = await axiosClient.put(`${backendUrl}/api/doctor/profile`, payload, {

        headers: { dtoken: dToken, token: dToken },

      })

      if (data.success) {

        toast.success(data.message || 'Profile saved')

        setIsEdit(false)

        if (data.profile) setProfileData(data.profile)

        await getProfileData()

      } else {

        toast.error(data.message)

      }

    } catch (error) {

      toast.error(error.response?.data?.message || error.message)

    } finally {

      setSaving(false)

    }

  }



  const toggleAvailability = async () => {

    if (!profileData || availabilitySaving) return

    const next = !profileData.available

    setAvailabilitySaving(true)

    try {

      const { data } = await axiosClient.put(

        `${backendUrl}/api/doctor/profile`,

        { available: next },

        { headers: { dtoken: dToken, token: dToken } }

      )

      if (data.success) {

        setProfileData((prev) => ({ ...prev, available: next, ...(data.profile || {}) }))

        toast.success(

          next

            ? 'You are visible to patients for new bookings'

            : 'Availability off — patients will not see you for new bookings'

        )

        if (data.profile) setProfileData(data.profile)

      } else {

        toast.error(data.message)

      }

    } catch (error) {

      toast.error(error.response?.data?.message || error.message)

    } finally {

      setAvailabilitySaving(false)

    }

  }



  if (loading) {

    return (

      <div className="p-4 sm:p-6 lg:p-8">

        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />

        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-slate-200" />

      </div>

    )

  }



  if (!profileData) {

    return (

      <div className="p-4 sm:p-6 lg:p-8">

        <PageHeader title="My profile" description="Could not load your profile." />

        <button type="button" className="dh-btn mt-4" onClick={() => getProfileData()}>

          Retry

        </button>

      </div>

    )

  }



  const displayName = formatDisplayName(profileData.name)

  const treatmentLabel =

    TREATMENT_LABELS[profileData.treatment_type] || profileData.treatment_type || 'Allopathic'



  return (

    <div className="p-4 sm:p-6 lg:p-8">

      <PageHeader

        eyebrow="Account"

        title="My profile"

        description="Your professional details shown to patients and staff."

      >

        {!isEdit ? (

          <button type="button" className="dh-btn py-2 text-sm" onClick={() => setIsEdit(true)}>

            Edit profile

          </button>

        ) : (

          <div className="flex gap-2">

            <button

              type="button"

              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"

              onClick={() => {

                setIsEdit(false)

                getProfileData()

              }}

            >

              Cancel

            </button>

            <button

              type="button"

              disabled={saving}

              className="dh-btn py-2 text-sm"

              onClick={updateProfile}

            >

              {saving ? 'Saving…' : 'Save changes'}

            </button>

          </div>

        )}

      </PageHeader>



      <div className="mt-6 max-w-4xl space-y-5">

        <section className="dh-card p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

            <DoctorPhoto

              src={profileData.image}

              name={displayName}

              variant="thumb"

              className="!h-20 !w-20 shrink-0 rounded-xl ring-2 ring-teal-100"

            />

            <div className="min-w-0 flex-1">

              <h2 className="text-lg font-semibold text-slate-900">{displayName}</h2>

              <p className="text-sm font-medium text-teal-700">{profileData.speciality || '—'}</p>

              {profileData.email && (

                <p className="mt-1 truncate text-xs text-slate-500">{profileData.email}</p>

              )}

              <div className="mt-3 flex flex-wrap gap-2">

                {profileData.is_verified && (

                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 ring-1 ring-teal-200">

                    Verified

                  </span>

                )}

                <span

                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${

                    profileData.available

                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'

                      : 'bg-slate-100 text-slate-600 ring-slate-200'

                  }`}

                >

                  {profileData.available ? 'Accepting bookings' : 'Not on patient site'}

                </span>

              </div>

            </div>

          </div>



          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm min-[400px]:grid-cols-2 sm:grid-cols-3">

            <div>

              <dt className="text-xs text-slate-500">Fee</dt>

              <dd className="mt-0.5 font-medium text-slate-900">{formatMoney(profileData.fees)}</dd>

            </div>

            <div>

              <dt className="text-xs text-slate-500">Experience</dt>

              <dd className="mt-0.5 font-medium text-slate-900">

                {profileData.experience || '—'}

              </dd>

            </div>

            <div>

              <dt className="text-xs text-slate-500">Treatment</dt>

              <dd className="mt-0.5 font-medium text-slate-900">{treatmentLabel}</dd>

            </div>

          </dl>

        </section>



        <section className="dh-card flex flex-wrap items-center justify-between gap-4 p-5">

          <div>

            <h3 className="text-sm font-semibold text-slate-900">Availability for patients</h3>

            <p className="mt-1 text-xs text-slate-500">

              Off = hidden from patient search and cannot book new visits. Saves immediately.

            </p>

          </div>

          <label className="relative inline-flex cursor-pointer items-center">

            <input

              type="checkbox"

              className="peer sr-only"

              disabled={availabilitySaving}

              checked={!!profileData.available}

              onChange={toggleAvailability}

            />

            <span className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-teal-600 peer-disabled:opacity-60" />

            <span className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-5" />

          </label>

        </section>



        <section className="dh-card p-5">

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">

            Professional

          </h3>

          <dl className="mt-3 grid gap-4 sm:grid-cols-2">

            <div>

              <dt className="text-xs font-medium text-slate-500">Specialization</dt>

              <dd className="mt-1 text-sm font-medium text-slate-900">

                {isEdit ? (

                  <input

                    className="dh-input w-full py-2 text-sm"

                    value={profileData.speciality || ''}

                    onChange={(e) =>

                      setProfileData((prev) => ({

                        ...prev,

                        speciality: e.target.value,

                        specialization: e.target.value,

                      }))

                    }

                  />

                ) : (

                  profileData.speciality || '—'

                )}

              </dd>

            </div>

            <div>

              <dt className="text-xs font-medium text-slate-500">Degree</dt>

              <dd className="mt-1 text-sm font-medium text-slate-900">{profileData.degree || '—'}</dd>

            </div>

            <div>

              <dt className="text-xs font-medium text-slate-500">Experience (years)</dt>

              <dd className="mt-1 text-sm font-medium text-slate-900">

                {isEdit ? (

                  <input

                    type="number"

                    min="0"

                    className="dh-input max-w-[100px] py-2 text-sm"

                    value={profileData.experience_years ?? ''}

                    onChange={(e) =>

                      setProfileData((prev) => ({

                        ...prev,

                        experience_years: e.target.value,

                        experience: `${e.target.value} years`,

                      }))

                    }

                  />

                ) : (

                  profileData.experience || '—'

                )}

              </dd>

            </div>

            <div>

              <dt className="text-xs font-medium text-slate-500">Treatment type</dt>

              <dd className="mt-1 text-sm font-medium text-slate-900">

                {isEdit ? (

                  <select

                    className="dh-input w-full py-2 text-sm"

                    value={profileData.treatment_type || 'allopathic'}

                    onChange={(e) =>

                      setProfileData((prev) => ({ ...prev, treatment_type: e.target.value }))

                    }

                  >

                    <option value="allopathic">Allopathic</option>

                    <option value="homeopathic">Homeopathic</option>

                    <option value="herbal">Herbal</option>

                  </select>

                ) : (

                  treatmentLabel

                )}

              </dd>

            </div>

            <div>

              <dt className="text-xs font-medium text-slate-500">Consultation fee</dt>

              <dd className="mt-1 text-sm font-medium text-slate-900">

                {isEdit ? (

                  <input

                    type="number"

                    min="0"

                    className="dh-input max-w-[140px] py-2 text-sm"

                    value={profileData.fees}

                    onChange={(e) =>

                      setProfileData((prev) => ({ ...prev, fees: e.target.value }))

                    }

                  />

                ) : (

                  formatMoney(profileData.fees)

                )}

              </dd>

            </div>

          </dl>



          {profileData.diseases?.length > 0 && (

            <div className="mt-4 border-t border-slate-100 pt-4">

              <p className="text-xs font-medium text-slate-500">Focus areas</p>

              <div className="mt-2 flex flex-wrap gap-1.5">

                {profileData.diseases.map((d) => (

                  <span

                    key={d}

                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"

                  >

                    {d}

                  </span>

                ))}

              </div>

            </div>

          )}

        </section>



        <section className="dh-card p-5">

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">About</h3>

          {isEdit ? (

            <textarea

              className="dh-input mt-2 min-h-[100px] w-full text-sm"

              value={profileData.about || ''}

              onChange={(e) => setProfileData((prev) => ({ ...prev, about: e.target.value }))}

              placeholder="Tell patients about your practice…"

            />

          ) : (

            <p className="mt-2 text-sm leading-relaxed text-slate-700">

              {profileData.about?.trim() || 'No bio added yet.'}

            </p>

          )}

        </section>



        <section className="dh-card p-5">

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>

          <dl className="mt-3 grid gap-4 sm:grid-cols-2">

            <div className="sm:col-span-2">

              <dt className="text-xs font-medium text-slate-500">Email</dt>

              <dd className="mt-1 text-sm text-slate-800">{profileData.email || '—'}</dd>

            </div>

            <div>

              <dt className="text-xs font-medium text-slate-500">Phone</dt>

              <dd className="mt-1 text-sm text-slate-800">

                {isEdit ? (

                  <input

                    className="dh-input w-full py-2 text-sm"

                    value={profileData.phone || ''}

                    onChange={(e) =>

                      setProfileData((prev) => ({ ...prev, phone: e.target.value }))

                    }

                    placeholder="+92 300 0000000"

                  />

                ) : (

                  profileData.phone || '—'

                )}

              </dd>

            </div>

            <div className="sm:col-span-2">

              <dt className="text-xs font-medium text-slate-500">Clinic address</dt>

              <dd className="mt-1 text-sm text-slate-800">

                {isEdit ? (

                  <div className="grid gap-2 sm:grid-cols-2">

                    <input

                      className="dh-input py-2 text-sm"

                      placeholder="Street / area"

                      value={profileData.address?.line1 || ''}

                      onChange={(e) =>

                        setProfileData((prev) => ({

                          ...prev,

                          address: { ...prev.address, line1: e.target.value },

                        }))

                      }

                    />

                    <input

                      className="dh-input py-2 text-sm"

                      placeholder="City"

                      value={profileData.address?.line2 || ''}

                      onChange={(e) =>

                        setProfileData((prev) => ({

                          ...prev,

                          address: { ...prev.address, line2: e.target.value },

                        }))

                      }

                    />

                  </div>

                ) : (

                  formatAddress(profileData.address)

                )}

              </dd>

            </div>

          </dl>

        </section>

      </div>

    </div>

  )

}


