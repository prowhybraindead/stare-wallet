"use server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import * as crypto from "crypto"

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin + (process.env.PIN_SALT || "sharkfintech")).digest("hex")
}

export async function completeOnboarding(idToken: string, displayName: string, pin: string) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()

  const decoded = await adminAuth.verifyIdToken(idToken)
  const { uid, email } = decoded

  const userRef = adminDb.collection("users").doc(uid)
  const existing = await userRef.get()
  if (existing.exists) throw new Error("User already onboarded")

  await userRef.set({
    uid,
    email: email || "",
    displayName: displayName.trim(),
    pinCode: hashPin(pin),
    mainBalance: 0,
    isFrozen: false,
    createdAt: FieldValue.serverTimestamp(),
  })
}

export async function verifyPin(idToken: string, pin: string): Promise<boolean> {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get()
  if (!userDoc.exists) return false
  const stored = userDoc.data()?.pinCode
  return stored === hashPin(pin)
}
