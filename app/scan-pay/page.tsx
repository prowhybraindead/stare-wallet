"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Html5Qrcode } from "html5-qrcode"
import { auth } from "@/lib/firebase"
import { payMerchantInvoice, payMerchantQR } from "@/lib/actions/transfer"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import {
    ArrowLeft, Camera, CameraOff, CreditCard, Link as LinkIcon,
    Loader2, Receipt, CheckCircle, RefreshCw, ScanLine,
} from "lucide-react"

type InvoicePayload = { type: "UPGRADE_INVOICE" | "MERCHANT_PAYMENT"; invoiceId: string; amount: number }
type CameraState = "requesting" | "granted" | "denied" | "error"

export default function ScanPayPage() {
    const router = useRouter()
    const [linkId, setLinkId] = useState("")
    const [loading, setLoading] = useState(false)

    // Invoice payment state
    const [invoiceData, setInvoiceData] = useState<InvoicePayload | null>(null)
    const [pin, setPin] = useState("")
    const [paymentDone, setPaymentDone] = useState(false)

    // Camera / Scanner state
    const [cameraState, setCameraState] = useState<CameraState>("requesting")
    const [scannerError, setScannerError] = useState("")
    const [scanActive, setScanActive] = useState(true)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const scannedRef = useRef(false)

    // ── Smart Data Parser ─────────────────────────────────────────────
    const processScannedData = useCallback((rawText: string) => {
        if (scannedRef.current) return
        scannedRef.current = true

        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(200)

        // Stop camera
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(() => { })
        }
        setScanActive(false)

        const trimmed = rawText.trim()

        // 1. Try JSON invoice payload
        try {
            const parsed = JSON.parse(trimmed)
            if (parsed.type === "UPGRADE_INVOICE" && parsed.invoiceId && parsed.amount) {
                setInvoiceData(parsed)
                toast({ title: "Hóa đơn đã nhận!", description: `Số tiền: ${parsed.amount.toLocaleString("vi-VN")}₫` })
                return
            }
        } catch { }

        // 2. Check if it's a URL or contains invoice identifiers
        if (trimmed.startsWith("http") || trimmed.includes("/pay/") || trimmed.includes("invoice") || trimmed.startsWith("sharkcredit://pay/")) {
            let invoiceId = trimmed
            try {
                const url = new URL(trimmed)
                const parts = url.pathname.split("/").filter(Boolean)
                if (parts[0] === "pay" && parts.length === 3) {
                    invoiceId = `${parts[1]}_${parts[2]}`;
                } else {
                    invoiceId = parts[parts.length - 1] || trimmed
                }
            } catch {
                const matchUrl = trimmed.match(/sharkcredit:\/\/pay\/(.+)/i);
                if (matchUrl) {
                    invoiceId = matchUrl[1];
                } else {
                    const match = trimmed.match(/(?:invoice[=\/:]?\s*)([a-zA-Z0-9_-]+)/i)
                    if (match) invoiceId = match[1]
                }
            }
            
            const payloadType = invoiceId.includes("_") ? "MERCHANT_PAYMENT" : "UPGRADE_INVOICE";
            setInvoiceData({ type: payloadType, invoiceId, amount: 0 })
            toast({ title: "Hóa đơn đã quét!", description: `ID: ${invoiceId.slice(0, 12)}...` })
            return
        }

        // 3. Fallback: treat as P2P transfer target (user ID, phone, etc.)
        toast({ title: "Mã QR đã quét!", description: "Đang chuyển hướng..." })
        router.push(`/transfer?to=${encodeURIComponent(trimmed)}`)
    }, [router])

    // ── Camera Init & Cleanup ────────────────────────────────────────────
    useEffect(() => {
        let scanner: Html5Qrcode | null = null

        async function initCamera() {
            try {
                // Request permission first
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                stream.getTracks().forEach(t => t.stop()) // release the test stream
                setCameraState("granted")

                // Init html5-qrcode
                scanner = new Html5Qrcode("qr-reader")
                scannerRef.current = scanner

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1,
                    },
                    (decodedText) => processScannedData(decodedText),
                    () => { } // ignore decode failures (noise frames)
                )
            } catch (err: any) {
                if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
                    setCameraState("denied")
                    setScannerError("Bạn đã từ chối quyền truy cập Camera.")
                } else {
                    setCameraState("error")
                    setScannerError(err.message || "Không thể khởi tạo camera.")
                }
            }
        }

        if (scanActive && !invoiceData && !paymentDone) {
            initCamera()
        }

        return () => {
            if (scanner?.isScanning) {
                scanner.stop().catch(() => { })
            }
            scanner?.clear()
        }
    }, [scanActive, invoiceData, paymentDone, processScannedData])

    // ── Retry camera ─────────────────────────────────────────────────────
    function retryCamera() {
        scannedRef.current = false
        setScannerError("")
        setCameraState("requesting")
        setScanActive(true)
    }

    // ── Invoice Payment ──────────────────────────────────────────────────
    async function handlePayInvoice() {
        if (!invoiceData || pin.length < 4) {
            toast({ title: "Vui lòng nhập mã PIN (tối thiểu 4 ký tự)", variant: "destructive" })
            return
        }
        setLoading(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) throw new Error("Chưa đăng nhập")
            
            if (invoiceData.type === "MERCHANT_PAYMENT") {
                await payMerchantQR(token, pin, invoiceData.invoiceId)
            } else {
                const result = await payMerchantInvoice(token, pin, invoiceData.invoiceId)
                if (!result.success) {
                    throw new Error(result.error)
                }
            }
            
            setPaymentDone(true)
            toast({ title: "Thanh toán thành công!" })
        } catch (e: any) {
            toast({ title: "Lỗi thanh toán", description: e.message, variant: "destructive" })
        } finally { setLoading(false) }
    }

    // ── Manual Link Payment ──────────────────────────────────────────────
    async function handlePayNow(e: React.FormEvent) {
        e.preventDefault()
        if (!linkId.trim()) {
            toast({ title: "Vui lòng nhập mã hoặc link", variant: "destructive" })
            return
        }
        setLoading(true)
        // Use the same smart parser as QR scan
        processScannedData(linkId.trim())
        setLoading(false)
    }

    // ══════════════════════════════════════════════════════════════════════
    // INVOICE PAYMENT SCREEN
    // ══════════════════════════════════════════════════════════════════════
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
                                <div className="flex justify-between"><span className="text-slate-500">Loại</span><Badge variant="outline">{invoiceData.type}</Badge></div>
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

    // ══════════════════════════════════════════════════════════════════════
    // PAYMENT SUCCESS
    // ══════════════════════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════════════════════
    // MAIN SCAN SCREEN
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="font-semibold text-lg">Quét & Trả</h1>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                        <ScanLine className="w-3 h-3 mr-1" />QR Scanner
                    </Badge>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold">Thanh toán hóa đơn SharkCredit</h2>
                        <p className="text-slate-400 text-sm mt-1">Quét mã QR hoặc nhập ID liên kết thanh toán</p>
                    </div>

                    {/* ── Camera Scanner ──────────────────────────────── */}
                    <div className="relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden border-2 border-purple-500/30 bg-slate-950 shadow-2xl shadow-purple-500/10">

                        {/* Camera feed container */}
                        <div className="aspect-square relative">
                            <div id="qr-reader" className="w-full h-full [&>video]:!object-cover [&>video]:!rounded-3xl" />

                            {/* ── Viewfinder Overlay ──────────────────── */}
                            <div className="absolute inset-0 pointer-events-none z-10">
                                {/* Dark vignette edges */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />

                                {/* Center target box (250x250 aligned with qrbox) */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-[250px] h-[250px] relative">
                                        {/* Animated corners */}
                                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}
                                            className="absolute -top-1 -left-1 w-10 h-10 border-t-[3px] border-l-[3px] border-purple-400 rounded-tl-xl" />
                                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                            className="absolute -top-1 -right-1 w-10 h-10 border-t-[3px] border-r-[3px] border-purple-400 rounded-tr-xl" />
                                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                                            className="absolute -bottom-1 -left-1 w-10 h-10 border-b-[3px] border-l-[3px] border-purple-400 rounded-bl-xl" />
                                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2, delay: 1.5 }}
                                            className="absolute -bottom-1 -right-1 w-10 h-10 border-b-[3px] border-r-[3px] border-purple-400 rounded-br-xl" />

                                        {/* Scanning laser line */}
                                        <motion.div
                                            animate={{ y: ["0%", "100%", "0%"] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                            className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_12px_3px_rgba(168,85,247,0.4)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Permission States ──────────────────── */}
                            <AnimatePresence>
                                {cameraState === "requesting" && (
                                    <motion.div key="requesting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-4">
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                            <Camera className="w-12 h-12 text-purple-400" />
                                        </motion.div>
                                        <p className="text-slate-400 text-sm">Đang yêu cầu quyền Camera...</p>
                                    </motion.div>
                                )}

                                {(cameraState === "denied" || cameraState === "error") && (
                                    <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
                                        <div className="w-16 h-16 rounded-full bg-red-950/40 flex items-center justify-center">
                                            <CameraOff className="w-8 h-8 text-red-400" />
                                        </div>
                                        <p className="text-slate-300 text-sm text-center font-medium">
                                            {scannerError || "Camera không khả dụng"}
                                        </p>
                                        <p className="text-slate-500 text-xs text-center max-w-[260px]">
                                            Vui lòng cấp quyền Camera trong cài đặt trình duyệt để tiếp tục quét mã QR
                                        </p>
                                        <Button onClick={retryCamera} variant="outline" size="sm"
                                            className="border-white/10 text-purple-400 hover:bg-purple-950/30 mt-2">
                                            <RefreshCw className="w-4 h-4 mr-2" />Thử lại
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Scanner status bar */}
                        <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-t border-white/5 flex items-center justify-center gap-2">
                            {cameraState === "granted" && scanActive ? (
                                <>
                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="w-2 h-2 rounded-full bg-purple-400" />
                                    <p className="text-purple-300 text-xs font-medium">Đang tìm mã QR...</p>
                                </>
                            ) : !scanActive ? (
                                <p className="text-emerald-400 text-xs font-medium">✓ Đã quét thành công</p>
                            ) : null}
                        </div>
                    </div>

                    {/* ── Divider ─────────────────────────────────────── */}
                    <div className="relative py-4">
                        <div className="absolute inset-x-0 top-1/2 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center"><span className="bg-slate-950 px-4 text-slate-500 text-sm font-medium">HOẶC</span></div>
                    </div>

                    {/* ── Manual Entry ────────────────────────────────── */}
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

                    {/* ── Rescan button (after successful scan) ───────── */}
                    {!scanActive && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <Button onClick={retryCamera} variant="outline"
                                className="w-full border-white/10 text-slate-400 hover:text-white">
                                <RefreshCw className="w-4 h-4 mr-2" />Quét lại mã QR
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    )
}
