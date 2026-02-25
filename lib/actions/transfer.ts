"use server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

const PLATFORM_FEE_RATE = 0.001 // 0.1%

function getTreasuryUid(): string {
  const uid = process.env.TREASURY_UID
  if (!uid) throw new Error("System Error: Treasury UID not configured.")
  return uid
}

export async function p2pTransfer(
  idToken: string,
  pin: string,
  receiverEmail: string,
  amount: number,
  note?: string
) {
  if (amount <= 0) throw new Error("Số tiền không hợp lệ")
  if (amount < 10000) throw new Error("Số tiền tối thiểu là 10,000 VND")

  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()

  const decoded = await adminAuth.verifyIdToken(idToken)
  const senderId = decoded.uid

  // Verify PIN
  const senderDoc = await adminDb.collection("users").doc(senderId).get()
  if (!senderDoc.exists) throw new Error("Người dùng không tồn tại")
  const senderData = senderDoc.data()!

  if (!senderData.pinCode) throw new Error("Tài khoản chưa thiết lập mã PIN")
  const pinValid = await bcrypt.compare(pin, senderData.pinCode)
  if (!pinValid) throw new Error("Mã PIN không đúng")
  if (senderData.isFrozen) throw new Error("Tài khoản của bạn đang bị khóa")
  if (senderData.mainBalance < amount) throw new Error("Số dư không đủ")

  // Find receiver
  const receiverQuery = await adminDb.collection("users").where("email", "==", receiverEmail).limit(1).get()
  if (receiverQuery.empty) throw new Error("Không tìm thấy người nhận")
  const receiverDoc = receiverQuery.docs[0]
  const receiverData = receiverDoc.data()
  if (receiverData.isFrozen) throw new Error("Tài khoản người nhận đang bị khóa")
  if (receiverDoc.id === senderId) throw new Error("Không thể tự chuyển tiền cho mình")

  const fee = Math.round(amount * PLATFORM_FEE_RATE)
  const netAmount = amount - fee
  const transactionId = uuidv4()

  // Atomic transaction
  await adminDb.runTransaction(async (t) => {
    const freshSender = await t.get(senderDoc.ref)
    const freshReceiver = await t.get(receiverDoc.ref)

    if (freshSender.data()!.mainBalance < amount) throw new Error("Số dư không đủ")

    t.update(senderDoc.ref, { mainBalance: FieldValue.increment(-amount) })
    t.update(receiverDoc.ref, { mainBalance: FieldValue.increment(netAmount) })
    t.set(adminDb.collection("transactions").doc(transactionId), {
      transactionId,
      type: "P2P",
      amount,
      netAmount,
      fee,
      senderId,
      senderEmail: senderData.email,
      senderName: senderData.displayName,
      receiverId: receiverDoc.id,
      receiverEmail: receiverData.email,
      receiverName: receiverData.displayName,
      status: "COMPLETED",
      note: note || "",
      timestamp: FieldValue.serverTimestamp(),
      refundedByAdmin: false,
    })
  })

  return { transactionId, amount, fee, netAmount }
}

export async function payMerchantQR(
  idToken: string,
  pin: string,
  paymentLinkId: string
) {
  const adminAuth = getAdminAuth()
  const adminDb = getAdminDb()

  const decoded = await adminAuth.verifyIdToken(idToken)
  const userId = decoded.uid

  const [userDoc, linkDoc] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("payment_links").doc(paymentLinkId).get(),
  ])

  if (!userDoc.exists) throw new Error("Người dùng không tồn tại")
  if (!linkDoc.exists) throw new Error("Mã QR không hợp lệ")

  const userData = userDoc.data()!
  const linkData = linkDoc.data()!

  if (!userData.pinCode) throw new Error("Tài khoản chưa thiết lập mã PIN")
  const pinValid = await bcrypt.compare(pin, userData.pinCode)
  if (!pinValid) throw new Error("Mã PIN không đúng")
  if (userData.isFrozen) throw new Error("Tài khoản bị khóa")
  if (linkData.status !== "UNPAID") throw new Error("Mã QR đã được thanh toán")
  if (userData.mainBalance < linkData.amount) throw new Error("Số dư không đủ")

  const merchantDoc = await adminDb.collection("merchants").doc(linkData.merchantId).get()
  if (!merchantDoc.exists) throw new Error("Merchant không tồn tại")
  const merchantData = merchantDoc.data()!

  const fee = Math.round(linkData.amount * PLATFORM_FEE_RATE)
  const netAmount = linkData.amount - fee
  const transactionId = uuidv4()

  await adminDb.runTransaction(async (t) => {
    t.update(userDoc.ref, { mainBalance: FieldValue.increment(-linkData.amount) })
    t.update(merchantDoc.ref, { balance: FieldValue.increment(netAmount) })
    t.update(linkDoc.ref, { status: "PAID", paidByUserId: userId, paidAt: FieldValue.serverTimestamp() })
    t.set(adminDb.collection("transactions").doc(transactionId), {
      transactionId,
      type: "PAYMENT",
      amount: linkData.amount,
      netAmount,
      fee,
      senderId: userId,
      receiverId: linkData.merchantId,
      paymentLinkId,
      description: linkData.description,
      status: "COMPLETED",
      timestamp: FieldValue.serverTimestamp(),
      refundedByAdmin: false,
    })
  })

  return { transactionId, amount: linkData.amount }
}

// ── Invoice Payment ───────────────────────────────────────────────────────────
export async function payMerchantInvoice(idToken: string, pin: string, invoiceId: string) {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    const db = getAdminDb()

    // Verify PIN
    const userDoc = await db.collection("users").doc(decoded.uid).get()
    if (!userDoc.exists) return { success: false, error: "Tài khoản không tồn tại" }
    const user = userDoc.data()!
    if (user.isFrozen) return { success: false, error: "Tài khoản đang bị khóa" }
    if (!user.pinCode) return { success: false, error: "Tài khoản chưa thiết lập mã PIN" }
    const pinValid = await bcrypt.compare(pin, user.pinCode)
    if (!pinValid) return { success: false, error: "Mã PIN không chính xác" }

    // Check invoice
    const invDoc = await db.collection("invoices").doc(invoiceId).get()
    if (!invDoc.exists) return { success: false, error: "Hóa đơn không tồn tại" }
    const invoice = invDoc.data()!
    if (invoice.status !== "UNPAID") return { success: false, error: "Hóa đơn đã được xử lý" }

    // Check balance
    if ((user.mainBalance || 0) < invoice.amount) return { success: false, error: "Số dư không đủ" }

    // Execute payment
    // Determine receiverId: use invoice.receiverId (Treasury) or fallback
    const receiverId = invoice.receiverId || getTreasuryUid()
    const receiverRef = db.collection("users").doc(receiverId)

    await db.runTransaction(async (t) => {
      // Deduct from payer
      t.update(userDoc.ref, { mainBalance: FieldValue.increment(-invoice.amount) })
      // Credit Treasury / receiverId
      t.update(receiverRef, { mainBalance: FieldValue.increment(invoice.amount) })
      // Mark invoice as paid
      t.update(invDoc.ref, { status: "PAID", paidBy: decoded.uid, paidAt: FieldValue.serverTimestamp() })
      // Transaction log
      const txId = uuidv4()
      t.set(db.collection("transactions").doc(txId), {
        transactionId: txId, type: "INVOICE_PAYMENT",
        amount: invoice.amount, netAmount: invoice.amount, fee: 0,
        senderId: decoded.uid, receiverId: receiverId,
        invoiceId: invoiceId, status: "COMPLETED",
        timestamp: FieldValue.serverTimestamp(),
        refundedByAdmin: false,
      })
    })

    // Admin notification
    await db.collection("admin_notifications").add({
      type: "INVOICE_PAID", invoiceId,
      message: `Hóa đơn ${invoiceId.slice(0, 8)}... đã được thanh toán bởi ${user.displayName || user.email}`,
      read: false, createdAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi thanh toán không xác định" }
  }
}
