import { useCallback, useEffect, useRef, useState } from 'react'
import { HISTORY_PRELOAD, SENSOR_DEFS, SENSOR_DEFS_AFTER } from '../data/mockAQI'
import { computeAQI, generateAfterPurification, generateSensors } from '../services/aqiCalc'
import { fetchLatestReadings, fetchHistory } from '../api/aqiApi'
import { fmtShortTime } from '../utils/format'

const BASE = import.meta.env.VITE_API_URL ?? ''

// Map backend response to the sensor array shape all components expect
function mapToSensors(data) {
  return SENSOR_DEFS.map(def => ({
    ...def,
    value: (() => {
      switch (def.name) {
        case 'PM2.5': return +(data.pm25  ?? 0).toFixed(1)
        case 'PM10':  return +(data.pm10  ?? 0).toFixed(1)
        case 'CO':    return +(data.co    ?? 0).toFixed(2)
        case 'O₃':   return +(data.o3    ?? 0).toFixed(0)
        case 'NO₂':  return +(data.no2   ?? 0).toFixed(0)
        case 'CO₂':  return +(data.co2   ?? 400).toFixed(0)
        default:      return 0
      }
    })(),
  }))
}

function mapToSensorsAfter(data) {
  return SENSOR_DEFS_AFTER.map(def => ({
    ...def,
    value: def.name === 'PM2.5'
      ? +(data.pm25_after ?? 0).toFixed(1)
      : +(data.pm10_after ?? 0).toFixed(1),
  }))
}

const _init = generateSensors()
const _initAQI = computeAQI(_init)

export function useAQIData(intervalMs = 5000) {
  const [sensors, setSensors]             = useState(_init)
  const [sensorsAfter, setSensorsAfter]   = useState(() => generateAfterPurification(_init))
  const [history, setHistory]             = useState(HISTORY_PRELOAD)
  const [aqiValue, setAqiValue]           = useState(_initAQI.aqiValue)
  const [aqiLevel, setAqiLevel]           = useState(_initAQI.aqiLevel)
  const [criticalPollutant, setCritical]  = useState(_initAQI.criticalPollutant)
  const [subIndices, setSubIndices]       = useState(_initAQI.subIndices)
  const [isLoading, setIsLoading]         = useState(false)
  const [lastUpdated, setLastUpdated]     = useState(new Date())
  const timerRef = useRef(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      if (BASE) {
        // Real hardware mode: fetch from Go backend
        const [latest, hist] = await Promise.all([
          fetchLatestReadings('UITS-01'),
          fetchHistory('UITS-01', 1),
        ])

        if (latest) {
          setSensors(mapToSensors(latest))
          setSensorsAfter(mapToSensorsAfter(latest))
          setAqiValue(latest.aqi ?? 0)
          setAqiLevel(latest.aqi_level ?? 'Good')
          setCritical(latest.critical_pollutant ?? 'PM2.5')
          setSubIndices(latest.sub_indices ?? {})
          setLastUpdated(new Date())
        }

        if (hist?.points?.length) {
          setHistory(hist.points)
        }
      } else {
        // Dev mock mode: generate random sensor values
        await new Promise(r => setTimeout(r, 550))
        const next      = generateSensors()
        const nextAfter = generateAfterPurification(next)
        const { aqiValue: av, aqiLevel: al, criticalPollutant: cp, subIndices: si } = computeAQI(next)
        setSensors(next)
        setSensorsAfter(nextAfter)
        setAqiValue(av)
        setAqiLevel(al)
        setCritical(cp)
        setSubIndices(si)
        setLastUpdated(new Date())
        const pm25val = next.find(s => s.name === 'PM2.5').value
        const coVal   = next.find(s => s.name === 'CO').value
        setHistory(prev => [
          ...prev.slice(1),
          { time: fmtShortTime(new Date()), aqi: av, pm25: pm25val, co: coVal },
        ])
      }
    } catch (err) {
      console.error('[useAQIData] fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    timerRef.current = setInterval(refresh, intervalMs)
    return () => clearInterval(timerRef.current)
  }, [refresh, intervalMs])

  const aboveSafe = sensors.filter(s => !s.indoor && s.value > s.safe).length

  return {
    sensors, sensorsAfter, history,
    aqiValue, aqiLevel, criticalPollutant, subIndices,
    aboveSafe, isLoading, lastUpdated, refresh,
  }
}
