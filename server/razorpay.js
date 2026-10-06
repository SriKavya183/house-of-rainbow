import Razorpay from 'razorpay'

export function isRazorpayConfigured() {
  const id = process.env.RAZORPAY_KEY_ID || ''
  const secret = process.env.RAZORPAY_KEY_SECRET || ''
  return Boolean(id.startsWith('rzp_') && secret.length > 8 && !id.includes('xxxx'))
}

export function getRazorpayMode() {
  const keyId = process.env.RAZORPAY_KEY_ID || ''
  if (keyId.startsWith('rzp_live_')) return 'live'
  const mode = (process.env.RAZORPAY_MODE || 'test').toLowerCase()
  return mode === 'live' ? 'live' : 'test'
}

export function getPublicKeyId() {
  return isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : ''
}

export function createRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured. Add test keys in .env')
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}
