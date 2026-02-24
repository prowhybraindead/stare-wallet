"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { auth } from "@/lib/firebase"
import { completeOnboarding } from "@/lib/actions/onboarding"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2, User, Shield, CheckCircle } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState("")
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (pin !== confirmPin) {
      toast({ title: "PIN không khớp", description: "Vui lòng nhập lại.", variant: "destructive" })
      return
    }
    if (pin.length !== 6) {
      toast({ title: "PIN phải có 6 chữ số", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error("Not authenticated")
      await completeOnboarding(idToken, displayName, pin)
      router.push("/dashboard")
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 rounded-full transition-all duration-500 ${s <= step ? "bg-blue-500 w-16" : "bg-white/10 w-8"}`} />
          ))}
        </div>

        <div className="glass rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Chào mừng!</h2>
                    <p className="text-slate-400 text-sm">Hãy thiết lập tài khoản của bạn</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Tên hiển thị</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      className="mt-1 bg-white/5 border-white/10 text-white" placeholder="Nguyễn Văn A" />
                  </div>
                  <Button onClick={() => displayName.trim() ? setStep(2) : toast({ title: "Vui lòng nhập tên", variant: "destructive" })}
                    className="w-full bg-blue-600 hover:bg-blue-700">Tiếp theo</Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Tạo mã PIN</h2>
                    <p className="text-slate-400 text-sm">PIN 6 chữ số bảo vệ giao dịch của bạn</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Mã PIN (6 chữ số)</Label>
                    <Input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                      className="mt-1 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[1rem]" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Xác nhận PIN</Label>
                    <Input type="password" maxLength={6} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      className="mt-1 bg-white/5 border-white/10 text-white text-center text-2xl tracking-[1rem]" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-white/10">Quay lại</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-700">Tiếp theo</Button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold">Xác nhận thông tin</h2>
                  <div className="bg-white/5 rounded-xl p-4 text-left space-y-2">
                    <p className="text-slate-400 text-sm">Tên hiển thị: <span className="text-white font-medium">{displayName}</span></p>
                    <p className="text-slate-400 text-sm">PIN: <span className="text-white font-medium">{"•".repeat(6)}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-white/10">Quay lại</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Hoàn tất
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
