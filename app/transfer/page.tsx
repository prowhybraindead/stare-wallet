"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth } from "@/lib/firebase"
import { p2pTransfer } from "@/lib/actions/transfer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft, Send, Loader2, CheckCircle } from "lucide-react"

export default function TransferPage() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "pin" | "success">("form")
  const [receiverEmail, setReceiverEmail] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [txResult, setTxResult] = useState<any>(null)

  async function handleTransfer() {
    setLoading(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error("Not authenticated")
      const result = await p2pTransfer(idToken, pin, receiverEmail, Number(amount), note)
      setTxResult(result)
      setStep("success")
    } catch (err: any) {
      toast({ title: "Giao dịch thất bại", description: err.message, variant: "destructive" })
    } finally { setLoading(false); setPin("") }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Chuyển tiền P2P</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        {step === "form" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <Label className="text-slate-300">Email người nhận</Label>
                <Input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)}
                  type="email" placeholder="receiver@example.com"
                  className="mt-1 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-slate-300">Số tiền (VND)</Label>
                <Input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="100000" className="mt-1 bg-white/5 border-white/10 text-white text-right text-xl font-bold" />
                {amount && <p className="text-right text-sm text-slate-400 mt-1">{formatCurrency(Number(amount))}</p>}
              </div>
              <div>
                <Label className="text-slate-300">Ghi chú (tùy chọn)</Label>
                <Input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Chuyển tiền ăn trưa..."
                  className="mt-1 bg-white/5 border-white/10 text-white" />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[50000, 100000, 200000, 500000].map(v => (
                <button key={v} onClick={() => setAmount(String(v))}
                  className="py-2 rounded-lg glass border border-white/10 text-xs text-slate-300 hover:border-blue-500/50 hover:text-blue-400 transition-colors">
                  {(v/1000)}K
                </button>
              ))}
            </div>

            <Button onClick={() => {
              if (!receiverEmail || !amount || Number(amount) < 10000) {
                toast({ title: "Vui lòng điền đầy đủ thông tin", description: "Số tiền tối thiểu 10,000 VND", variant: "destructive" })
                return
              }
              setStep("pin")
            }} className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold">
              <Send className="w-4 h-4 mr-2" />
              Tiếp tục
            </Button>
          </motion.div>
        )}

        {step === "pin" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 space-y-6 text-center">
            <div>
              <h2 className="text-xl font-bold">Xác nhận giao dịch</h2>
              <p className="text-slate-400 text-sm mt-1">Nhập mã PIN để xác nhận chuyển</p>
              <p className="text-2xl font-bold text-blue-400 mt-2">{formatCurrency(Number(amount))}</p>
              <p className="text-slate-400 text-sm">đến {receiverEmail}</p>
            </div>
            <div>
              <Label className="text-slate-300">Mã PIN (6 chữ số)</Label>
              <Input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-2 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[1rem]" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { setStep("form"); setPin("") }} variant="outline" className="flex-1 border-white/10">Hủy</Button>
              <Button onClick={handleTransfer} disabled={loading || pin.length !== 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 text-center space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
              <CheckCircle className="w-20 h-20 text-green-400 mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-bold text-green-400">Thành công!</h2>
            <p className="text-slate-400">Đã chuyển <span className="text-white font-semibold">{formatCurrency(txResult?.amount)}</span></p>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-left space-y-2">
              <div className="flex justify-between"><span className="text-slate-400">Phí giao dịch</span><span className="text-white">{formatCurrency(txResult?.fee)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Người nhận nhận được</span><span className="text-green-400 font-semibold">{formatCurrency(txResult?.netAmount)}</span></div>
            </div>
            <Button onClick={() => router.push("/dashboard")} className="w-full bg-blue-600 hover:bg-blue-700">
              Về trang chủ
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  )
}
