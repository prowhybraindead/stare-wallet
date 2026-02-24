"use server"
import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { redirect } from "next/navigation"

export async function checkUserAndSession(idToken: string): Promise<{ redirect: string }> {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()

  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    
    // Create session cookie (7 days)
    const expiresIn = 60 * 60 * 24 * 7 * 1000
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn })
    
    cookies().set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    // Check if user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get()
    
    if (!userDoc.exists) {
      return { redirect: "/onboarding" }
    }

    const userData = userDoc.data()
    if (userData?.isFrozen) {
      cookies().delete("session")
      return { redirect: "/login?error=frozen" }
    }

    return { redirect: "/dashboard" }
  } catch (error) {
    throw new Error("Authentication failed")
  }
}

export async function logout() {
  "use server"
  cookies().delete("session")
  redirect("/login")
}

export async function getServerUser() {
  const sessionCookie = cookies().get("session")?.value
  if (!sessionCookie) return null
  
  try {
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const adminDb = getAdminDb()
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get()
    if (!userDoc.exists) return null
    return { uid: decoded.uid, ...userDoc.data() }
  } catch {
    return null
  }
}
