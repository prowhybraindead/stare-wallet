"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore"
import { createCard } from "@/lib/actions/cards"
import { VirtualCard } from "@/components/VirtualCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, CreditCard, Loader2 } from "lucide-react"
import { VirtualCardLogo, BankLogo } from "@/components/VirtualCardLogo"

export default function CardsPage() {
  const router = useRouter()
  const [cards, setCards] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function validateAndUploadImage(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) {
      toast({ title: "File không hợp lệ", description: "Chỉ chấp nhận file ảnh.", variant: "destructive" })
      return null
    }
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise<void>((resolve) => { img.onload = () => resolve() })
    if (img.width < 1000 || img.height < 630) {
      toast({ title: "Độ phân giải quá thấp", description: `Tối thiểu 1000x630px. Ảnh của bạn: ${img.width}x${img.height}px`, variant: "destructive" })
      return null
    }
    const ratio = img.width / img.height
    if (ratio < 1.5 || ratio > 1.65) {
      toast({ title: "Tỉ lệ không hợp lệ", description: `Yêu cầu ~1.586:1 (1.5–1.65). Hiện tại: ${ratio.toFixed(3)}`, variant: "destructive" })
      return null
    }
    setUploading(true)
    try {
      const cloudName = "dtnqish40"
      const uploadPreset = "shark-fintech"
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", uploadPreset)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || "Cloudinary upload failed")

      return data.secure_url as string
    } catch (err: any) {
      toast({ title: "Lỗi tải ảnh", description: err.message, variant: "destructive" })
      return null
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return }

      const cardsUnsub = onSnapshot(
        query(collection(db, "cards"), where("userId", "==", user.uid)),
        snap => setCards(snap.docs.map(d => d.data()))
      )

      const templatesSnap = await getDocs(
        query(collection(db, "card_templates"), where("status", "==", "PUBLISHED"))
      )
      setTemplates(templatesSnap.docs.map(d => d.data()))

      return cardsUnsub
    })
    return () => unsub()
  }, [router])

  async function handleCreateCard(templateId: string) {
    setLoading(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) return
      await createCard(idToken, templateId)
      toast({ title: "Tạo thẻ thành công!" })
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    } finally { setLoading(false) }
  }



  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="font-semibold">Thẻ của tôi</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Thêm thẻ</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
              <DialogHeader><DialogTitle>Chọn mẫu thẻ</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto py-2">
                {templates.length === 0 && <p className="text-slate-400 text-sm col-span-2">Chưa có mẫu thẻ nào.</p>}
                {templates.map(t => (
                  <div key={t.templateId} className="space-y-2">
                    <div className="rounded-xl overflow-hidden h-36"
                      style={{ background: t.backgroundType === "GRADIENT" ? t.backgroundValue : `url(${t.backgroundValue}) center/cover` }}>
                      <div className={`h-full p-4 flex flex-col justify-between ${t.textTheme === "LIGHT" ? "text-white" : "text-slate-900"}`}>
                        <div className="flex justify-between items-start">
                          <BankLogo textTheme={t.textTheme} />
                          <VirtualCardLogo issuer={t.issuer} textTheme={t.textTheme} />
                        </div>
                        <p className="text-sm font-semibold">{t.name}</p>
                      </div>
                    </div>
                    <Button onClick={() => handleCreateCard(t.templateId)} disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Chọn thẻ này"}
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {cards.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CreditCard className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có thẻ nào</p>
          </div>
        ) : (
          cards.map((card, i) => (
            <motion.div key={card.cardId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}>
              <Link href={`/cards/${card.cardId}`}
                className="block cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <VirtualCard card={card} />
              </Link>
            </motion.div>
          ))
        )}
      </main>
    </div>
  )
}
