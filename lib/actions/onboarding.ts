"use server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import bcrypt from "bcryptjs"

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
    pinCode: bcrypt.hashSync(pin, 10),
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
  if (!stored) return false
  return bcrypt.compare(pin, stored)
}
