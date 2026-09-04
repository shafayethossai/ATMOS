import { useCallback, useEffect, useRef, useState } from 'react'
import { HISTORY_PRELOAD } from '../data/mockAQI'
import { aqiFromPM25, classifyAQI, generateSensors, getPrimaryPollutant } from '../services/aqiCalc'
import { fmtShortTime } from '../utils/format'

export function useAQIData(intervalMs = 8000) {
  const [sensors, setSensors]       = useState(generateSensors)
  const [history, setHistory]       = useState(HISTORY_PRELOAD)
  const [isLoading, setIsLoading]   = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const timerRef = useRef(null)

  const refresh = useCallback(() => {
    setIsLoading(true)
    setTimeout(() => {
      const next = generateSensors()
      setSensors(next)
      setLastUpdated(new Date())
      const pm25val = next.find(s => s.name === 'PM2.5').value
      const coVal   = next.find(s => s.name === 'CO').value
      setHistory(prev => [
        ...prev.slice(1),
        {
          time: fmtShortTime(new Date()),
          aqi:  aqiFromPM25(pm25val),
          pm25: pm25val,
          co:   coVal,
        },
      ])
      setIsLoading(false)
    }, 550)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(refresh, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [refresh, intervalMs])

  const pm25val   = sensors.find(s => s.name === 'PM2.5')?.value ?? 0
  const aqiValue  = aqiFromPM25(pm25val)
  const aqiLevel  = classifyAQI(aqiValue)
  const primary   = getPrimaryPollutant(sensors)
  const aboveSafe = sensors.filter(s => s.value > s.safe).length

  return { sensors, history, aqiValue, aqiLevel, primary, aboveSafe, isLoading, lastUpdated, refresh }
}
