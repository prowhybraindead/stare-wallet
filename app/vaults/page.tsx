"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, onSnapshot, query } from "firebase/firestore"
import { createVault, depositToVault, withdrawFromVault } from "@/lib/actions/vaults"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, PiggyBank, Target, Loader2 } from "lucide-react"

interface Vault { vaultId: string; name: string; balance: number; targetAmount: number; }

export default function VaultsPage() {
  const router = useRouter()
  const [vaults, setVaults] = useState<Vault[]>([])
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [newVaultName, setNewVaultName] = useState("")
  const [newVaultTarget, setNewVaultTarget] = useState("")
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [pin, setPin] = useState("")
  const [action, setAction] = useState<"deposit" | "withdraw">("deposit")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return }
      setUserId(user.uid)
      const q = query(collection(db, "users", user.uid, "vaults"))
      return onSnapshot(q, snap => setVaults(snap.docs.map(d => d.data() as Vault)))
    })
    return () => unsub()
  }, [router])

  async function handleCreate() {
    setLoading(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) return
      await createVault(idToken, newVaultName, Number(newVaultTarget))
      setNewVaultName(""); setNewVaultTarget("")
      toast({ title: "Tạo vault thành công!" })
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    } finally { setLoading(false) }
  }

  async function handleTransaction() {
    setLoading(true)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken || !selectedVault) return
      if (action === "deposit") await depositToVault(idToken, pin, selectedVault.vaultId, Number(depositAmount))
      else await withdrawFromVault(idToken, pin, selectedVault.vaultId, Number(depositAmount))
      toast({ title: action === "deposit" ? "Nạp thành công!" : "Rút thành công!" })
      setDepositAmount(""); setPin(""); setSelectedVault(null)
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
            <h1 className="font-semibold">StareVaults</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Tạo mới</Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white">
              <DialogHeader><DialogTitle>Tạo Vault mới</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Tên vault</Label>
                  <Input value={newVaultName} onChange={e => setNewVaultName(e.target.value)}
                    className="mt-1 bg-white/5 border-white/10 text-white" placeholder="Du lịch Đà Nẵng" /></div>
                <div><Label>Mục tiêu (VND)</Label>
                  <Input value={newVaultTarget} onChange={e => setNewVaultTarget(e.target.value.replace(/\D/g, ""))}
                    className="mt-1 bg-white/5 border-white/10 text-white" placeholder="5000000" /></div>
                <Button onClick={handleCreate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tạo Vault"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {vaults.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <PiggyBank className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có vault nào</p>
            <p className="text-sm">Tạo vault đầu tiên để bắt đầu tiết kiệm!</p>
          </div>
        ) : (
          vaults.map((vault, i) => {
            const pct = Math.min((vault.balance / vault.targetAmount) * 100, 100)
            return (
              <motion.div key={vault.vaultId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-5 border border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{vault.name}</h3>
                    <p className="text-sm text-slate-400"><Target className="w-3 h-3 inline mr-1" />{formatCurrency(vault.targetAmount)}</p>
                  </div>
                  <p className="text-xl font-bold text-blue-400">{formatCurrency(vault.balance)}</p>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full mb-4">
                  <motion.div className="h-full bg-blue-500 rounded-full" initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: i * 0.1 }} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setSelectedVault(vault); setAction("deposit") }}
                    className="flex-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20">Nạp</Button>
                  <Button size="sm" onClick={() => { setSelectedVault(vault); setAction("withdraw") }}
                    variant="outline" className="flex-1 border-white/10 text-slate-300">Rút</Button>
                </div>
              </motion.div>
            )
          })
        )}

        {/* Transaction Dialog */}
        <Dialog open={!!selectedVault} onOpenChange={o => !o && setSelectedVault(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>{action === "deposit" ? "Nạp tiền vào" : "Rút tiền từ"} {selectedVault?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Số tiền</Label>
                <Input value={depositAmount} onChange={e => setDepositAmount(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 bg-white/5 border-white/10 text-white" placeholder="100000" /></div>
              <div><Label>Mã PIN</Label>
                <Input type="password" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 bg-white/5 border-white/10 text-white text-center tracking-widest" /></div>
              <Button onClick={handleTransaction} disabled={loading || !depositAmount || pin.length !== 6}
                className={`w-full ${action === "deposit" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (action === "deposit" ? "Nạp" : "Rút")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
