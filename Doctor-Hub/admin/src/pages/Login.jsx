import axiosClient from '../lib/axiosClient'

import { useContext, useState } from 'react'

import { Link, useLocation, useNavigate } from 'react-router-dom'

import { DoctorContext } from '../context/DoctorContext'

import { AdminContext } from '../context/AdminContext'

import { toast } from 'react-toastify'

import BrandLogo from '../components/BrandLogo'

import { persistStaffToken, staffDashboardPath } from '../utils/staffTokenStorage.js'

import { API_BASE_URL } from '../utils/constants.js'



const STAFF_ROLES = {

  admin: ['admin', 'super_admin', 'assistant'],

  doctor: ['doctor'],

}



function staffHomePath(role) {

  return staffDashboardPath(role)

}



const features = [

  'Verify payments & confirm patient visits',

  'Manage doctor schedules & departments',

  'Track appointments & clinical workflow',

  'Hospital analytics & staff administration',

]



export default function Login() {

  const location = useLocation()

  const initialTab = location.state?.tab === 'Doctor' ? 'Doctor' : 'Admin'

  const [state, setState] = useState(initialTab)

  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)



  const backendUrl =

    import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')

  const { setDToken } = useContext(DoctorContext)

  const { setAToken } = useContext(AdminContext)

  const navigate = useNavigate()



  const onSubmitHandler = async (event) => {

    event.preventDefault()

    setLoading(true)

    try {

      const { data } = await axiosClient.post(`${backendUrl}/api/auth/login`, {

        email,

        password,

      })



      const role = data?.user?.role

      const token = data?.token



      if (!token || !role) {

        toast.error(data?.message || 'Login failed')

        return

      }



      const allowed =

        state === 'Admin' ? STAFF_ROLES.admin : STAFF_ROLES.doctor



      if (!allowed.includes(role)) {

        toast.error(

          state === 'Admin'

            ? 'This account is not an admin or assistant. Use the Doctor tab.'

            : 'This account is not a doctor. Use the Admin tab or register as a doctor.'

        )

        return

      }



      persistStaffToken(token, { setAToken, setDToken })



      if (role === 'doctor') {

        toast.success('Doctor portal ready')

      } else if (role === 'super_admin') {

        toast.success('Welcome — Super Admin')

      } else if (role === 'assistant') {

        toast.success('Welcome — Assistant portal')

      } else {

        toast.success(`Welcome — ${role}`)

      }



      navigate(staffHomePath(role), { replace: true })

    } catch (err) {

      const msg = err.response?.data?.message || err.message || 'Login failed'

      toast.error(msg)

    } finally {

      setLoading(false)

    }

  }



  return (

    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">

      <div className="hidden flex-1 flex-col justify-between bg-gradient-to-br from-teal-900 via-teal-800 to-sky-900 p-12 text-white lg:flex">

        <div>

          <BrandLogo subtitle="Staff Portal" light />

          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            Hospital staff access

          </p>

        </div>

        <div>

          <h1 className="font-display text-4xl font-semibold leading-tight">

            Doctor Hub Medical Center — staff portal

          </h1>

          <p className="mt-4 max-w-md text-teal-100/90">

            Secure tools for doctors, assistants, and administrators — manage visits, verify

            payments, and coordinate patient care.

          </p>

          <ul className="mt-8 space-y-3">

            {features.map((f) => (

              <li key={f} className="flex items-start gap-3 text-sm text-teal-50">

                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/40 text-xs">

                  ✓

                </span>

                {f}

              </li>

            ))}

          </ul>

        </div>

        <p className="text-sm text-teal-300">© {new Date().getFullYear()} Doctor Hub</p>

      </div>



      <form

        onSubmit={onSubmitHandler}

        className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-16"

      >

        <div className="mx-auto w-full max-w-md">

          <div className="mb-8 lg:hidden">

            <BrandLogo subtitle="Staff Portal" />

          </div>



          <div className="dh-portal-panel p-8">

            <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">

              {['Admin', 'Doctor'].map((tab) => (

                <button

                  key={tab}

                  type="button"

                  onClick={() => setState(tab)}

                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${

                    state === tab

                      ? 'bg-white text-teal-800 shadow-sm'

                      : 'text-slate-600 hover:text-slate-900'

                  }`}

                >

                  {tab}

                </button>

              ))}

            </div>



            <h2 className="font-display text-2xl font-semibold text-slate-900">

              {state} sign in

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              {state === 'Admin'

                ? 'Sign in with your hospital admin or assistant account.'

                : 'Use the email and password from your doctor registration.'}

            </p>



            <div className="mt-6 space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700">Email</label>

                <input

                  type="email"

                  required

                  autoComplete="email"

                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"

                  value={email}

                  onChange={(e) => setEmail(e.target.value)}

                />

              </div>

              <div>

                <label className="text-sm font-medium text-slate-700">Password</label>

                <input

                  type="password"

                  required

                  autoComplete="current-password"

                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"

                  value={password}

                  onChange={(e) => setPassword(e.target.value)}

                />

                <p className="mt-2 text-right text-sm">

                  <Link to="/forgot-password" className="font-medium text-teal-700 hover:underline">

                    Forgot password?

                  </Link>

                </p>

              </div>

            </div>



            <button type="submit" disabled={loading} className="dh-btn mt-6 w-full">

              {loading ? 'Signing in…' : 'Sign in to Doctor Hub'}

            </button>



            {state === 'Admin' && (

              <p className="mt-4 text-center text-sm text-slate-600">

                Want to provide admin services?{' '}

                <Link to="/register-admin" className="font-semibold text-teal-700 hover:underline">

                  Register for approval

                </Link>

              </p>

            )}



            {state === 'Doctor' && (

              <p className="mt-4 text-center text-sm text-slate-600">

                New doctor?{' '}

                <Link to="/register-doctor" className="font-semibold text-teal-700 hover:underline">

                  Create doctor account

                </Link>

              </p>

            )}

          </div>



          <a

            href={import.meta.env.VITE_FRONTEND_URL}

            className="mt-6 block text-center text-sm font-medium text-teal-700 hover:underline"

          >

            ← Patient website

          </a>

        </div>

      </form>

    </div>

  )

}


