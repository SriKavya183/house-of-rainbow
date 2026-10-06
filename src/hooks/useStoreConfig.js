import { useEffect, useState } from 'react'

export function useStoreConfig() {
  const [config, setConfig] = useState({
    razorpayConfigured: false,
    mode: 'test',
    paymentsLive: false,
    testModeBanner: true,
    razorpayKeyId: '',
  })

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => {})
  }, [])

  return config
}
