import { useContext, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AppContext } from '../context/AppContext'
import DoctorCard from './doctors/DoctorCard'
import { DOCTOR_CARD_GRID_CLASS } from './doctors/doctorCardGrid.js'
import { EASE_OUT } from './animations/motionPresets.js'

function AnimatedDoctorCard({ doctor, index }) {
  const reduceMotion = useReducedMotion()
  const fromLeft = index % 2 === 0

  if (reduceMotion) {
    return <DoctorCard doctor={doctor} />
  }

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, x: fromLeft ? -36 : 36 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: EASE_OUT }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="h-full rounded-2xl transition-colors duration-300 [&_article]:hover:border-teal-400">
        <DoctorCard doctor={doctor} />
      </div>
    </motion.div>
  )
}

function TopDoctors({ animated = false }) {
  const { doctors, getDoctorsData } = useContext(AppContext)

  useEffect(() => {
    if (!doctors.length && getDoctorsData) getDoctorsData()
  }, [doctors.length, getDoctorsData])

  const top = doctors.filter((d) => d.available).slice(0, 6)

  if (!top.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
        No doctors yet — add them from the staff portal.
      </p>
    )
  }

  return (
    <div>
      <div className={DOCTOR_CARD_GRID_CLASS}>
        {top.map((doc, i) =>
          animated ? (
            <AnimatedDoctorCard key={doc.id} doctor={doc} index={i} />
          ) : (
            <DoctorCard key={doc.id} doctor={doc} />
          )
        )}
      </div>
      <div className="mt-10 text-center">
        <Link
          to="/doctors"
          onClick={() => window.scrollTo(0, 0)}
          className="dh-btn-outline inline-flex"
        >
          View all doctors
        </Link>
      </div>
    </div>
  )
}

export default memo(TopDoctors)
