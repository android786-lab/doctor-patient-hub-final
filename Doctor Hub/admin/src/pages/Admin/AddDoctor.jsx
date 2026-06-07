import { useContext, useState } from 'react'
import { toast } from 'react-toastify'
import axiosClient from '../../lib/axiosClient'
import { AdminContext } from '../../context/AdminContext'
import PageHeader from '../../components/admin/PageHeader'
import { FormField, inputClass, selectClass } from '../../components/admin/FormField'
import { assets } from '../../assets/assets'
import CreatableSelect from '@doctor-hub/ui/CreatableSelect.jsx'
import DiseaseTagsField from '@doctor-hub/ui/DiseaseTagsField.jsx'
import { useDoctorCatalog } from '../../../../shared/hooks/useDoctorCatalog.js'

const experienceOptions = [
  '1 Year',
  '2 Year',
  '3 Year',
  '4 Year',
  '5 Year',
  '6 Year',
  '8 Year',
  '9 Year',
  '10 Year',
]

function slugifyTreatment(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export default function AddDoctor() {
  const [docImg, setDocImg] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [experience, setExperience] = useState('1 Year')
  const [fees, setFees] = useState('')
  const [about, setAbout] = useState('')
  const [speciality, setSpeciality] = useState('General physician')
  const [degree, setDegree] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [treatmentType, setTreatmentType] = useState('allopathic')
  const [diseases, setDiseases] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { backendUrl, aToken, getAllDoctors } = useContext(AdminContext)

  const { catalog, addSpeciality, addTreatmentType, addDisease } = useDoctorCatalog({
    apiBase: `${backendUrl}/api`,
    token: aToken,
    adminCatalog: true,
  })

  const specialityOptions = catalog.specialities.length
    ? catalog.specialities
    : ['General physician']

  const treatmentOptions =
    catalog.treatmentTypes.length > 0
      ? catalog.treatmentTypes
      : [
          { value: 'allopathic', label: 'Allopathic' },
          { value: 'homeopathic', label: 'Homeopathic' },
          { value: 'herbal', label: 'Herbal' },
        ]

  const resetForm = () => {
    setDocImg(null)
    setName('')
    setEmail('')
    setPassword('')
    setFees('')
    setAbout('')
    setDegree('')
    setAddress1('')
    setAddress2('')
    setDiseases('')
  }

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    if (!docImg) return toast.error('Please upload a doctor photo')

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('image', docImg)
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('experience', experience)
      formData.append('fees', Number(fees))
      formData.append('about', about)
      formData.append('speciality', speciality)
      formData.append('degree', degree)
      formData.append('address', JSON.stringify({ line1: address1, line2: address2 }))
      formData.append('treatmentType', treatmentType)
      formData.append('diseases', diseases)

      const { data } = await axiosClient.post(`${backendUrl}/api/admin/add-doctor`, formData, {
        headers: { atoken: aToken },
      })

      if (data.success) {
        toast.success(data.message)
        resetForm()
        getAllDoctors?.()
      } else toast.error(data.message)
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        eyebrow="Staff · Doctors"
        title="Register new doctor"
        description="Add a specialist to the public directory. Use “Add new” when speciality, treatment system, or disease is not in the list."
      />

      <form onSubmit={onSubmitHandler} className="max-w-5xl space-y-6">
        <section className="dh-card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Profile photo</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label
              htmlFor="doc-img"
              className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/50 transition hover:border-teal-400"
            >
              {docImg ? (
                <img
                  src={URL.createObjectURL(docImg)}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={assets.upload_area} alt="" className="h-10 w-10 opacity-50" />
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100">
                Change
              </span>
            </label>
            <input
              id="doc-img"
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setDocImg(e.target.files?.[0] || null)}
            />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">Upload professional headshot</p>
              <p className="mt-1 text-xs">JPG or PNG · shown on patient booking page</p>
            </div>
          </div>
        </section>

        <section className="dh-card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Account & credentials</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" required>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Sarah Khan"
                required
              />
            </FormField>
            <FormField label="Email" required>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@doctorhub.com"
                required
              />
            </FormField>
            <FormField label="Portal password" hint="Min 8 characters — doctor uses this to login" required>
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </FormField>
          </div>
        </section>

        <section className="dh-card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Professional details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CreatableSelect
              label="Speciality"
              required
              value={speciality}
              onChange={setSpeciality}
              options={specialityOptions}
              placeholder="Choose speciality"
              addLabel="+ Add new speciality…"
              inputClassName={selectClass}
              onAddNew={async (name) => {
                await addSpeciality(name)
                return name
              }}
            />
            <FormField label="Degree" required>
              <input
                className={inputClass}
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="MBBS, FCPS…"
                required
              />
            </FormField>
            <FormField label="Experience" required>
              <select
                className={inputClass}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                {experienceOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Consultation fee (PKR)" required>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="2500"
                required
              />
            </FormField>
            <CreatableSelect
              label="Treatment system"
              value={treatmentType}
              onChange={setTreatmentType}
              options={treatmentOptions}
              placeholder="Choose treatment system"
              addLabel="+ Add new treatment system…"
              inputClassName={selectClass}
              onAddNew={async (label) => {
                await addTreatmentType(label, label)
                return slugifyTreatment(label)
              }}
            />
            <div className="sm:col-span-2">
              <DiseaseTagsField
                value={diseases}
                onChange={setDiseases}
                suggestions={catalog.diseases}
                onAddSuggestion={addDisease}
                inputClassName={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="dh-card p-6">
          <h2 className="text-sm font-semibold text-slate-900">Clinic address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Address line 1" required>
              <input
                className={inputClass}
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="Street, building"
                required
              />
            </FormField>
            <FormField label="Address line 2" required>
              <input
                className={inputClass}
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="City, region"
                required
              />
            </FormField>
          </div>
          <FormField label="About doctor" className="mt-4">
            <textarea
              className={`${inputClass} min-h-[120px] resize-y`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Short bio for patients…"
              rows={4}
              required
            />
          </FormField>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="dh-btn px-8">
            {submitting ? 'Saving…' : 'Add doctor to Doctor Hub'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Reset form
          </button>
        </div>
      </form>
    </div>
  )
}
