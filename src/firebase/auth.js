import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './config'
import { checkOtpRateLimit, recordOtpSend } from './db'

/**
 * Sign in with email + password. Creates account if it does not exist yet.
 * Returns { userCredential, isNew } — isNew=true means account was just created.
 */
export async function emailSignIn(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return { userCredential: cred, isNew: false }
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      return { userCredential: cred, isNew: true }
    }
    throw err
  }
}

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
