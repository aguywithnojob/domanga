import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  linkWithCredential,
  signOut,
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { auth } from './config'
import { checkOtpRateLimit, recordOtpSend } from './db'

let googleAuthInitialized = false

/**
 * Sign in with Google.
 * - Web (browser / PWA): uses Firebase's own OAuth popup — no extra config needed
 *   beyond enabling the Google provider in the Firebase console.
 * - Native (Capacitor/Android): uses the native Google Sign-In SDK via
 *   @codetrix-studio/capacitor-google-auth, then exchanges the idToken for a
 *   Firebase credential so the result lands in the same `auth` instance used
 *   everywhere else (AuthContext, RequireAuth, etc).
 * Returns a Firebase UserCredential in both cases.
 */
export async function googleSignIn() {
  if (Capacitor.isNativePlatform()) {
    if (!googleAuthInitialized) {
      GoogleAuth.initialize()
      googleAuthInitialized = true
    }
    const googleUser = await GoogleAuth.signIn()
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
    return signInWithCredential(auth, credential)
  }
  return signInWithPopup(auth, new GoogleAuthProvider())
}

/**
 * Link a Google account to the currently signed-in user — used by existing
 * Phone-OTP users who want to also be able to sign in with Google, without
 * losing their uid (and therefore their mobile number + expenses, which are
 * all keyed off that uid in Firestore).
 * Throws `auth/credential-already-in-use` if that Google account is already
 * tied to a different Firebase user — Firebase refuses to link in that case
 * since it would silently merge two separate accounts.
 */
export async function linkGoogleAccount() {
  if (!auth.currentUser) throw new Error('You must be signed in to link an account.')
  if (Capacitor.isNativePlatform()) {
    if (!googleAuthInitialized) {
      GoogleAuth.initialize()
      googleAuthInitialized = true
    }
    const googleUser = await GoogleAuth.signIn()
    const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
    return linkWithCredential(auth.currentUser, credential)
  }
  return linkWithPopup(auth.currentUser, new GoogleAuthProvider())
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
