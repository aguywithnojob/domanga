import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth'
import { auth } from './config'
import { checkOtpRateLimit, recordOtpSend } from './db'

/**
 * Set up invisible reCAPTCHA on the given container element id.
 * Stores the verifier on window so it can be cleared later.
 */
export function setupRecaptcha(containerId) {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear()
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {},
  })
  return window.recaptchaVerifier
}

/**
 * Send OTP to phoneNumber (E.164 format, e.g. "+919876543210").
 * Returns the confirmationResult object.
 */
export async function sendOTP(phoneNumber, containerId) {
  await checkOtpRateLimit(phoneNumber)
  const appVerifier = setupRecaptcha(containerId)
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
  window.confirmationResult = confirmationResult
  await recordOtpSend(phoneNumber)
  return confirmationResult
}

/**
 * Verify the OTP the user entered.
 * Returns the UserCredential.
 */
export async function verifyOTP(otp) {
  if (!window.confirmationResult) throw new Error('No OTP request found. Please request OTP again.')
  return window.confirmationResult.confirm(otp)
}

export async function logout() {
  await signOut(auth)
}
