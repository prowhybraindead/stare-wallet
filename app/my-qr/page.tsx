"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { QRCodeCanvas } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Share2 } from "lucide-react"

export default function MyQRPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [qrValue, setQrValue] = useState("")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return }
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) {
        const data = snap.data()
        setUserData(data)
        setQrValue(JSON.stringify({ type: "STARE_RECEIVE", uid: user.uid, email: data.email, name: data.displayName }))
      }
    })
    return () => unsub()
  }, [router])

  function handleDownload() {
    const canvas = document.querySelector("canvas")
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url; a.download = "stare-qr.png"; a.click()
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="font-semibold">Mã QR của tôi</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 flex flex-col items-center gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl">
            {qrValue && <QRCodeCanvas value={qrValue} size={220} level="H" />}
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{userData?.displayName}</p>
            <p className="text-slate-400 text-sm">{userData?.email}</p>
          </div>
          <p className="text-slate-500 text-xs text-center">Cho người khác quét mã này để chuyển tiền cho bạn</p>
        </motion.div>

        <div className="flex gap-3 w-full max-w-xs">
          <Button onClick={handleDownload} variant="outline" className="flex-1 border-white/10">
            <Download className="w-4 h-4 mr-2" />Tải về
          </Button>
          <Button onClick={() => navigator.share?.({ title: "StareWallet QR", text: userData?.displayName })}
            className="flex-1 bg-blue-600 hover:bg-blue-700">
            <Share2 className="w-4 h-4 mr-2" />Chia sẻ
          </Button>
        </div>
      </main>
    </div>
  )
}
