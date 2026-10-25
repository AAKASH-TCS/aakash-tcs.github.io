import { useCallback, useEffect, useState } from 'react'
import { getProfile } from '../lib/api'

export function useProfile() {
  const [state, setState] = useState({ data: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ data: null, error: null })
    getProfile(ctrl.signal)
      .then((data) => setState({ data, error: null }))
      .catch((error) => {
        if (!ctrl.signal.aborted) setState({ data: null, error })
      })
    return () => ctrl.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, retry }
}
