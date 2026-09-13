import { useCallback, useEffect, useRef, useState } from 'react'
import { HISTORY_PRELOAD } from '../data/mockAQI'
import { computeAQI, generateAfterPurification, generateSensors } from '../services/aqiCalc'
import { fmtShortTime } from '../utils/format'

export function useAQIData(intervalMs = 8000) {
  const [sensors, setSensors]           = useState(generateSensors)
  const [sensorsAfter, setSensorsAfter] = useState(() => generateAfterPurification(generateSensors()))
  const [history, setHistory]           = useState(HISTORY_PRELOAD)
  const [isLoading, setIsLoading]       = useState(false)
  const [lastUpdated, setLastUpdated]   = useState(new Date())
  const timerRef = useRef(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const next      = generateSensors()
      const nextAfter = generateAfterPurification(next)
      setSensors(next)
      setSensorsAfter(nextAfter)
      setLastUpdated(new Date())
      const { aqiValue } = computeAQI(next)
      const pm25val = next.find(s => s.name === 'PM2.5').value
      const coVal   = next.find(s => s.name === 'CO').value
      setHistory(prev => [
        ...prev.slice(1),
        { time: fmtShortTime(new Date()), aqi: aqiValue, pm25: pm25val, co: coVal },
      ])
      setIsLoading(false)
    }, 550)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(refresh, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [refresh, intervalMs])

  const { aqiValue, aqiLevel, criticalPollutant, subIndices } = computeAQI(sensors)
  // CO₂ is a ventilation metric — excluded from "above safe" AQI pollutant count
  const aboveSafe = sensors.filter(s => !s.indoor && s.value > s.safe).length

  return { sensors, sensorsAfter, history, aqiValue, aqiLevel, criticalPollutant, subIndices, aboveSafe, isLoading, lastUpdated, refresh }
}
