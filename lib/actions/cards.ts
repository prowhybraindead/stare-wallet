"use server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { v4 as uuidv4 } from "uuid"

function generateCardNumber(): string {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 9000 + 1000)).join(" ")
}

export async function createCard(idToken: string, templateId: string) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)
  const userId = decoded.uid

  // Check user exists
  const userDoc = await adminDb.collection("users").doc(userId).get()
  if (!userDoc.exists) throw new Error("User not found")

  // Get template
  const templateDoc = await adminDb.collection("card_templates").doc(templateId).get()
  if (!templateDoc.exists) throw new Error("Template not found")
  const template = templateDoc.data()!
  if (template.status !== "PUBLISHED") throw new Error("Template not published")

  // Check if user already has a card from this template
  const existing = await adminDb.collection("cards")
    .where("userId", "==", userId)
    .where("templateId", "==", templateId)
    .get()
  if (!existing.empty) throw new Error("Bạn đã có thẻ từ mẫu này")

  const cardId = uuidv4()
  await adminDb.collection("cards").doc(cardId).set({
    cardId,
    userId,
    templateId,
    cardNumber: generateCardNumber(),
    issuer: template.issuer,
    cardDesign: {
      backgroundType: template.backgroundType,
      backgroundValue: template.backgroundValue,
      textTheme: template.textTheme,
      name: template.name,
    },
    isFrozen: false,
    createdAt: FieldValue.serverTimestamp(),
  })

  return cardId
}

export async function toggleCardFreeze(idToken: string, cardId: string) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()
  const decoded = await adminAuth.verifyIdToken(idToken)

  const cardDoc = await adminDb.collection("cards").doc(cardId).get()
  if (!cardDoc.exists) throw new Error("Card not found")
  if (cardDoc.data()!.userId !== decoded.uid) throw new Error("Unauthorized")

  const current = cardDoc.data()!.isFrozen
  await cardDoc.ref.update({ isFrozen: !current })
  return !current
}
