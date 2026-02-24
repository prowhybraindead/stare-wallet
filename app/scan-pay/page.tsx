"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth } from "@/lib/firebase"
import { payMerchantInvoice } from "@/lib/actions/transfer"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Scan, Camera, CreditCard, Link as LinkIcon, Loader2, Receipt, CheckCircle } from "lucide-react"

type InvoicePayload = { type: "UPGRADE_INVOICE"; invoiceId: string; amount: number }

export default function ScanPayPage() {
    const router = useRouter()
    const [linkId, setLinkId] = useState("")
    const [loading, setLoading] = useState(false)

    // Invoice payment state
    const [invoiceData, setInvoiceData] = useState<InvoicePayload | null>(null)
    const [pin, setPin] = useState("")
    const [paymentDone, setPaymentDone] = useState(false)

    function handleQRResult(rawText: string) {
        try {
            const parsed = JSON.parse(rawText)
            if (parsed.type === "UPGRADE_INVOICE" && parsed.invoiceId && parsed.amount) {
                setInvoiceData(parsed)
                return
            }
        } catch { }
        // Fallback: treat as linkId
        setLinkId(rawText)
    }

    async function handlePayInvoice() {
        if (!invoiceData || pin.length < 4) {
            toast({ title: "Vui lòng nhập mã PIN (tối thiểu 4 ký tự)", variant: "destructive" })
            return
        }
        setLoading(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error("Chưa đăng nhập")
            await payMerchantInvoice(token, pin, invoiceData.invoiceId)
            setPaymentDone(true)
            toast({ title: "Thanh toán thành công!" })
        } catch (e: any) {
            toast({ title: "Lỗi thanh toán", description: e.message, variant: "destructive" })
        } finally { setLoading(false) }
    }

    async function handlePayNow(e: React.FormEvent) {
        e.preventDefault()
        if (!linkId.trim()) {
            toast({ title: "Vui lòng nhập mã Payment Link", variant: "destructive" })
            return
        }
        setLoading(true)
        // Check if this is an invoice JSON payload
        handleQRResult(linkId.trim())
        if (invoiceData) { setLoading(false); return }

        if (linkId.trim().length < 20) {
            toast({ title: "Mã Payment Link không hợp lệ", variant: "destructive" })
            setLoading(false)
            return
        }
        setTimeout(() => {
            setLoading(false)
            toast({ title: "Mã hợp lệ. Đang chuyển hướng..." })
            router.push(`/transfer?linkId=${linkId.trim()}`)
        }, 800)
    }

    // ── INVOICE PAYMENT SCREEN ──
    if (invoiceData && !paymentDone) {
        return (
            <div className="min-h-screen">
                <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
                    <div className="max-w-xl mx-auto flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setInvoiceData(null)}><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="font-semibold text-lg">Thanh toán hóa đơn</h1>
                    </div>
                </header>
                <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="bg-slate-900/60 border-white/10 text-slate-100">
                            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Receipt className="w-4 h-4" />Chi tiết hóa đơn nâng cấp</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Invoice ID</span><span className="font-mono text-xs">{invoiceData.invoiceId.slice(0, 12)}...</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Loại</span><Badge variant="outline">UPGRADE_INVOICE</Badge></div>
                                <div className="flex justify-between items-center"><span className="text-slate-500">Số tiền</span><span className="font-bold text-2xl text-white">{formatCurrency(invoiceData.amount)}</span></div>
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="space-y-3">
                            <Label>Nhập mã PIN để xác nhận</Label>
                            <Input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={6}
                                className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] font-mono h-14"
                                placeholder="••••••" />
                            <Button onClick={handlePayInvoice} disabled={loading || pin.length < 4}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-semibold">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                                Thanh toán {formatCurrency(invoiceData.amount)}
                            </Button>
                        </div>
                    </motion.div>
                </main>
            </div>
        )
    }

    // ── PAYMENT SUCCESS SCREEN ──
    if (paymentDone) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 rounded-full bg-emerald-900/40 mx-auto flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-400">Thanh toán thành công!</h2>
                    <p className="text-slate-400 text-sm">Hóa đơn đang chờ Admin xác nhận nâng cấp gói.</p>
                    <Button onClick={() => router.push("/dashboard")} className="mt-4">Về trang chủ</Button>
                </motion.div>
            </div>
        )
    }

    // ── MAIN SCAN/MANUAL ENTRY SCREEN ──
    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="font-semibold text-lg">Quét & Trả</h1>
                    </div>
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold">Thanh toán hóa đơn SharkCredit</h2>
                        <p className="text-slate-400 text-sm mt-1">Quét mã QR hoặc nhập ID liên kết thanh toán</p>
                    </div>

                    {/* Camera Scanner Placeholder */}
                    <div className="relative aspect-[4/3] w-full max-w-sm mx-auto rounded-3xl overflow-hidden glass border-2 border-blue-500/30 bg-slate-900/50 flex flex-col items-center justify-center group shadow-2xl shadow-blue-500/10">
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-50" />
                        <motion.div
                            animate={{ y: ["0%", "300%", "0%"] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            className="absolute top-1/4 left-10 right-10 h-0.5 bg-blue-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.5)] z-10"
                        />
                        <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                        <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                        <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                        <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                        <Camera className="w-12 h-12 text-blue-500/50 mb-4 group-hover:scale-110 transition-transform" />
                        <p className="text-sm text-blue-300/70 font-medium">Đang tìm mã QR...</p>
                    </div>

                    <div className="relative py-4">
                        <div className="absolute inset-x-0 top-1/2 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center"><span className="bg-slate-950 px-4 text-slate-500 text-sm font-medium">HOẶC</span></div>
                    </div>

                    {/* Manual Entry */}
                    <div className="glass rounded-2xl p-6">
                        <form onSubmit={handlePayNow} className="space-y-4">
                            <div>
                                <Label htmlFor="linkId" className="text-slate-300">Nhập JSON payload hoặc Payment Link ID</Label>
                                <div className="relative mt-2">
                                    <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                    <Input
                                        id="linkId" type="text" value={linkId}
                                        onChange={e => setLinkId(e.target.value)}
                                        className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12 text-md font-mono"
                                        placeholder='VD: {"type":"UPGRADE_INVOICE",...} hoặc db34...90ab'
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={loading || !linkId.trim()} className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold text-md">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                                Thanh toán ngay
                            </Button>
                        </form>
                    </div>
                </motion.div>
            </main>
        </div>
    )
}
