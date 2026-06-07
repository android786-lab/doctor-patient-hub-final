import { createContext } from 'react'
import { formatMoney } from '../../../shared/constants/currency.js'
import { API_BASE_URL } from '../utils/constants.js'

export const AppContext = createContext()

const AppContextProvider = (props) => {

    const currency = import.meta.env.VITE_CURRENCY || 'Rs'
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api$/, '')
const months = [" ","Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        if (slotDate == null || slotDate === '') return '—'
        if (typeof slotDate === 'string' && slotDate.includes('_')) {
            const dateArray = slotDate.split('_')
            if (dateArray.length === 3) {
                return `${dateArray[0]} ${months[Number(dateArray[1])] || dateArray[1]} ${dateArray[2]}`
            }
        }
        const d = new Date(slotDate)
        if (!Number.isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        }
        return String(slotDate)
    }


// Function to calculate the age eg. ( 20_01_2000 => 24 )
    const calculateAge = (dob) => {
        const today = new Date()
        const birthDate = new Date(dob)
        let age = today.getFullYear() - birthDate.getFullYear()
        return age
    }

  const value={
    calculateAge,
    slotDateFormat,
    currency,
    formatMoney,
    backendUrl,
  }
  return (
<AppContext.Provider value= {value}>
    {props.children}
</AppContext.Provider>

  )

}
export default AppContextProvider