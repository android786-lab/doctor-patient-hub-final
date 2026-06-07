import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import DoctorPhoto from '@doctor-hub/ui/DoctorPhoto.jsx'

const RelatedDoctors = ({ speciality, docId }) => {
  const { doctors } = useContext(AppContext)
  const navigate = useNavigate()

  const [relDoc, setRelDoc] = useState([])

  useEffect(() => {
    if (doctors.length > 0 && speciality) {
      const doctorsData = doctors.filter(
        (doc) => doc.speciality === speciality && doc.id !== docId
      )
      setRelDoc(doctorsData)
    }
  }, [doctors, speciality, docId])

  return (
    <div className='flex flex-col items-center gap-4 my-16 text-[#262626]'>
      <h1 className='text-3xl font-medium'>Related Doctors</h1>
      <p className='sm:w-1/3 text-center text-sm'>Simply browse through our extensive list of trusted doctors.</p>
      <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6 px-3 sm:px-0'>
        {relDoc.map((item, index) => (
          <div onClick={() => { navigate(`/appointment/${item.id}`); scrollTo(0, 0) }} className='border border-[#C9D8FF] rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500' key={index}>
            <DoctorPhoto src={item.image} name={item.name} variant="card" />
            <div className='p-4'>
              <div
                className={`flex items-center gap-2 text-sm text-center ${
                  item.available !== false && item.is_active !== false
                    ? 'text-green-500'
                    : 'text-gray-500'
                }`}
              >
                <p
                  className={`h-2 w-2 rounded-full ${
                    item.available !== false && item.is_active !== false
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }`}
                />
                <p>
                  {item.available !== false && item.is_active !== false
                    ? 'Available'
                    : 'Not Available'}
                </p>
              </div>
              <p className='text-[#262626] text-lg font-medium'>{item.name}</p>
              <p className='text-[#5C5C5C] text-sm'>{item.speciality}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RelatedDoctors
