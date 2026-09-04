import { createContext, useContext, useState } from 'react'
import { STATIONS } from '../data/mockAQI'

const StationContext = createContext(null)

export function StationProvider({ children }) {
  const [activeStation, setActiveStation] = useState(STATIONS[0])

  return (
    <StationContext.Provider value={{ activeStation, setActiveStation, stations: STATIONS }}>
      {children}
    </StationContext.Provider>
  )
}

export function useStation() {
  return useContext(StationContext)
}
