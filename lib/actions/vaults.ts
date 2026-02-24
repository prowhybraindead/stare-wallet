"use server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { v4 as uuidv4 } from "uuid"

export async function createVault(idToken: string, name: string, targetAmount: number) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)
  const userId = decoded.uid

  if (!name.trim()) throw new Error("Tên ví không được trống")
  if (targetAmount <= 0) throw new Error("Mục tiêu phải > 0")

  const vaultId = uuidv4()
  await adminDb.collection("users").doc(userId).collection("vaults").doc(vaultId).set({
    vaultId,
    name: name.trim(),
    balance: 0,
    targetAmount,
    createdAt: FieldValue.serverTimestamp(),
  })

  return vaultId
}

export async function depositToVault(idToken: string, pin: string, vaultId: string, amount: number) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)
  const userId = decoded.uid

  if (amount <= 0) throw new Error("Số tiền không hợp lệ")

  const [userDoc, vaultDoc] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("users").doc(userId).collection("vaults").doc(vaultId).get(),
  ])

  if (!userDoc.exists) throw new Error("User not found")
  if (!vaultDoc.exists) throw new Error("Vault not found")

  const userData = userDoc.data()!
  const crypto = require("crypto")
  const hashedPin = crypto.createHash("sha256").update(pin + "sharkfintech").digest("hex")
  if (userData.pinCode !== hashedPin) throw new Error("PIN không đúng")
  if (userData.mainBalance < amount) throw new Error("Số dư không đủ")

  await adminDb.runTransaction(async (t) => {
    t.update(userDoc.ref, { mainBalance: FieldValue.increment(-amount) })
    t.update(vaultDoc.ref, { balance: FieldValue.increment(amount) })
  })
}

export async function withdrawFromVault(idToken: string, pin: string, vaultId: string, amount: number) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)
  const userId = decoded.uid

  const [userDoc, vaultDoc] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("users").doc(userId).collection("vaults").doc(vaultId).get(),
  ])

  if (!userDoc.exists) throw new Error("User not found")
  if (!vaultDoc.exists) throw new Error("Vault not found")

  const userData = userDoc.data()!
  const vaultData = vaultDoc.data()!
  const crypto = require("crypto")
  const hashedPin = crypto.createHash("sha256").update(pin + "sharkfintech").digest("hex")
  if (userData.pinCode !== hashedPin) throw new Error("PIN không đúng")
  if (vaultData.balance < amount) throw new Error("Số dư vault không đủ")

  await adminDb.runTransaction(async (t) => {
    t.update(userDoc.ref, { mainBalance: FieldValue.increment(amount) })
    t.update(vaultDoc.ref, { balance: FieldValue.increment(-amount) })
  })
}
