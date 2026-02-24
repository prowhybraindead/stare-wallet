"use client"
import { useEffect, useState, memo } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { ThemeToggle } from "@/components/ThemeToggle"
import { onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { toggleCardFreeze } from "@/lib/actions/cards"
import { VirtualCardLogo, BankLogo } from "@/components/VirtualCardLogo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { formatCurrency, maskCardNumber } from "@/lib/utils"
import {
    ArrowLeft, Eye, EyeOff, Snowflake, Smartphone, Settings, Loader2,
    ArrowUpRight, ArrowDownLeft, TrendingUp, CreditCard, RotateCcw,
    Utensils, ShoppingBag, Car, Play, Zap, ArrowLeftRight, CircleDollarSign,
} from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// ── Mock Analytics Data ────────────────────────────────────────────────────────
const MOCK_DAILY = [
    { day: "T2", amount: 250000 },
    { day: "T3", amount: 180000 },
    { day: "T4", amount: 420000 },
    { day: "T5", amount: 310000 },
    { day: "T6", amount: 650000 },
    { day: "T7", amount: 520000 },
    { day: "CN", amount: 380000 },
]
const MOCK_WEEKLY = [
    { day: "Tuần 1", amount: 1850000 },
    { day: "Tuần 2", amount: 2200000 },
    { day: "Tuần 3", amount: 1950000 },
    { day: "Tuần 4", amount: 2750000 },
]
const MOCK_MONTHLY = [
    { day: "Th1", amount: 8500000 },
    { day: "Th2", amount: 7200000 },
    { day: "Th3", amount: 9100000 },
    { day: "Th4", amount: 6800000 },
    { day: "Th5", amount: 10500000 },
    { day: "Th6", amount: 8900000 },
]
const MONTHLY_LIMIT = 50000000

// ── Category Icon Mapping ──────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, { icon: React.ElementType; bg: string; label: string }> = {
    FOOD_DRINK: { icon: Utensils, bg: "bg-green-500/10 text-green-500", label: "Ăn uống" },
    SHOPPING: { icon: ShoppingBag, bg: "bg-blue-500/10 text-blue-500", label: "Mua sắm" },
    TRANSPORT: { icon: Car, bg: "bg-orange-500/10 text-orange-500", label: "Di chuyển" },
    ENTERTAINMENT: { icon: Play, bg: "bg-purple-500/10 text-purple-500", label: "Giải trí" },
    BILL_UTILITIES: { icon: Zap, bg: "bg-yellow-500/10 text-yellow-500", label: "Hóa đơn" },
    TRANSFER: { icon: ArrowLeftRight, bg: "bg-gray-500/10 text-gray-400", label: "Chuyển tiền" },
    OTHER: { icon: CircleDollarSign, bg: "bg-slate-500/10 text-slate-400", label: "Khác" },
}
function getCategoryMeta(category?: string) {
    return CATEGORY_MAP[category || "OTHER"] || CATEGORY_MAP.OTHER
}

// ── 3D Card Component ──────────────────────────────────────────────────────────
function Card3D({ card, showNumber, showCVV, onToggleNumber, onToggleCVV }: {
    card: any
    showNumber: boolean
    showCVV: boolean
    onToggleNumber: () => void
    onToggleCVV: () => void
}) {
    const [flipped, setFlipped] = useState(false)
    const design = card.cardDesign || {}
    const bg = design.backgroundType === "IMAGE"
        ? `url(${design.backgroundValue}) center/cover`
        : (design.backgroundValue || "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%)")
    const isLight = design.textTheme === "LIGHT" || !design.textTheme
    const textClass = isLight ? "text-white" : "text-slate-900"

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="w-full max-w-[380px] aspect-[1.586/1] cursor-pointer"
                style={{ perspective: "1000px" }}
                onClick={() => setFlipped(!flipped)}
            >
                <motion.div
                    className="relative w-full h-full"
                    style={{ transformStyle: "preserve-3d" }}
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                >
                    {/* ── FRONT ─────────────────────────────── */}
                    <div
                        className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
                        style={{ background: bg, backfaceVisibility: "hidden" }}
                    >
                        <div className={`absolute inset-0 p-5 flex flex-col justify-between ${textClass}`}>
                            {/* Top Row */}
                            <div className="flex justify-between items-start">
                                <BankLogo textTheme={design.textTheme || "LIGHT"} />
                                <VirtualCardLogo issuer={card.issuer} textTheme={design.textTheme || "LIGHT"} />
                            </div>

                            {/* EMV Chip */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 shadow-inner border border-yellow-500/50">
                                    <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-[1px] p-[2px]">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="bg-yellow-500/40 rounded-[1px]" />
                                        ))}
                                    </div>
                                </div>
                                {/* Contactless icon */}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={`opacity-60 ${isLight ? "stroke-white" : "stroke-slate-800"}`} strokeWidth="2">
                                    <path d="M8.5 16.5a5 5 0 0 1 0-9" /><path d="M12 19a8 8 0 0 1 0-14" /><path d="M15.5 21.5a11 11 0 0 1 0-19" />
                                </svg>
                            </div>

                            {/* Card Number */}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-lg tracking-[3px] font-medium">
                                        {showNumber ? card.cardNumber : maskCardNumber(card.cardNumber)}
                                    </p>
                                    <button onClick={(e) => { e.stopPropagation(); onToggleNumber() }}
                                        className="opacity-60 hover:opacity-100 transition-opacity">
                                        {showNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] opacity-50 uppercase tracking-wider">Cardholder</p>
                                    <p className="text-sm font-semibold tracking-wide">{card.holderName || "SHARK USER"}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] opacity-50 uppercase tracking-wider">Expires</p>
                                    <p className="text-sm font-mono font-medium">{card.expiryDate || "12/28"}</p>
                                </div>
                            </div>

                            {/* Frozen Overlay */}
                            {card.isFrozen && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center">
                                        <Snowflake className="w-10 h-10 text-blue-400 mx-auto animate-pulse" />
                                        <p className="text-blue-300 text-sm font-semibold mt-2">THẺ ĐÃ ĐÓNG BĂNG</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── BACK ──────────────────────────────── */}
                    <div
                        className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
                        style={{ background: bg, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                        <div className="absolute inset-0 flex flex-col">
                            {/* Magnetic Stripe */}
                            <div className="mt-6 h-12 bg-gradient-to-r from-slate-900 via-black to-slate-900 w-full" />

                            {/* Signature Strip + CVV */}
                            <div className="mt-6 mx-5 flex items-center gap-3">
                                <div className="flex-1 h-10 bg-white/90 rounded-md relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10"
                                        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #ccc 2px, #ccc 3px)" }} />
                                    <p className="absolute right-0 top-0 bottom-0 flex items-center bg-white px-3 text-slate-700 font-mono text-lg font-bold italic">
                                        {showCVV ? (card.cvv || "123") : "•••"}
                                    </p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onToggleCVV() }}
                                    className={`${isLight ? "text-white" : "text-slate-800"} opacity-60 hover:opacity-100 transition-opacity`}>
                                    {showCVV ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Legal Text */}
                            <div className={`mt-auto p-5 ${textClass}`}>
                                <p className="text-[8px] opacity-40 leading-relaxed">
                                    This card is property of Shark Fintech JSC. Use is subject to the cardholder agreement.
                                    Unauthorized use may result in prosecution. If found, please return to any Shark Fintech branch.
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <p className="text-[9px] opacity-30 font-mono">ID: {card.cardId?.slice(0, 12)}...</p>
                                    <BankLogo textTheme={design.textTheme || "LIGHT"} />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" />
                {flipped ? "Nhấn để xem mặt trước" : "Nhấn để lật xem mặt sau"}
            </p>
        </div>
    )
}

const Card3DMemo = memo(Card3D)

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CardDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [card, setCard] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState<any[]>([])
    const [showNumber, setShowNumber] = useState(false)
    const [showCVV, setShowCVV] = useState(false)
    const [freezing, setFreezing] = useState(false)
    const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M">("1W")

    const chartData = timeRange === "1D" ? MOCK_DAILY : timeRange === "1W" ? MOCK_WEEKLY : MOCK_MONTHLY
    const totalSpent = chartData.reduce((s, d) => s + d.amount, 0)
    const limitPercent = Math.min((totalSpent / MONTHLY_LIMIT) * 100, 100)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.push("/login"); return }

            // Real-time card listener
            const cardUnsub = onSnapshot(doc(db, "cards", id), (snap) => {
                if (snap.exists()) {
                    setCard({ id: snap.id, ...snap.data() })
                }
                setLoading(false)
            }, (error) => {
                console.error("🔥 Card snapshot error:", error)
                setLoading(false)
            })

            // Fetch recent transactions for this card
            try {
                const txQuery = query(
                    collection(db, "transactions"),
                    where("cardId", "==", id),
                    orderBy("timestamp", "desc"),
                    limit(10)
                )
                const txSnap = await getDocs(txQuery)
                setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (err) {
                console.log("No transactions found for card or index missing:", err)
            }

            return () => cardUnsub()
        })
        return () => unsub()
    }, [id, router])

    async function handleFreeze() {
        if (!card) return
        setFreezing(true)
        try {
            const idToken = await auth.currentUser?.getIdToken()
            if (!idToken) throw new Error("Not authenticated")
            await toggleCardFreeze(idToken, card.cardId)
            toast({ title: card.isFrozen ? "Thẻ đã mở đóng băng" : "Thẻ đã đóng băng" })
        } catch (err: any) {
            toast({ title: "Lỗi", description: err.message, variant: "destructive" })
        } finally {
            setFreezing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Skeleton Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-5 w-40 rounded bg-white/5 animate-pulse" />
                            <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Skeleton Card */}
                        <div className="space-y-6">
                            <div className="w-full max-w-[380px] mx-auto aspect-[1.586/1] rounded-2xl bg-white/5 animate-pulse" />
                            <div className="rounded-xl border border-white/10 p-4 space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex justify-between">
                                        <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
                                        <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Skeleton Chart */}
                        <div className="space-y-6">
                            <div className="rounded-xl border border-white/10 p-4 h-72 bg-white/5 animate-pulse" />
                            <div className="rounded-xl border border-white/10 p-4 h-20 bg-white/5 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!card) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4 text-slate-500">
                <CreditCard className="w-16 h-16 opacity-30" />
                <p>Không tìm thấy thẻ này.</p>
                <Button variant="outline" onClick={() => router.push("/cards")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />Quay lại
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
            {/* Header */}
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/cards")}
                        className="text-slate-400 hover:text-white hover:bg-white/5">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{card.cardDesign?.name || "Thẻ của tôi"}</h1>
                        <p className="text-slate-500 text-xs font-mono">{card.cardId}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        <Badge variant={card.isFrozen ? "destructive" : "success"} className="text-[10px]">
                            {card.isFrozen ? "ĐÓNG BĂNG" : "HOẠT ĐỘNG"}
                        </Badge>
                    </div>
                </div>

                {/* ── Responsive Grid ──────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── LEFT COLUMN ────────────────────────────────────── */}
                    <div className="space-y-6">
                        {/* 3D Card */}
                        <Card3DMemo
                            card={card}
                            showNumber={showNumber}
                            showCVV={showCVV}
                            onToggleNumber={() => setShowNumber(!showNumber)}
                            onToggleCVV={() => setShowCVV(!showCVV)}
                        />

                        {/* Card Info */}
                        <Card className="bg-white/[0.03] border-white/10 text-slate-100">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">Số thẻ</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-slate-100">
                                            {showNumber ? card.cardNumber : maskCardNumber(card.cardNumber)}
                                        </span>
                                        <button onClick={() => setShowNumber(!showNumber)}
                                            className="text-slate-500 hover:text-white transition-colors">
                                            {showNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">CVV</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-slate-100">{showCVV ? (card.cvv || "123") : "•••"}</span>
                                        <button onClick={() => setShowCVV(!showCVV)}
                                            className="text-slate-500 hover:text-white transition-colors">
                                            {showCVV ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Issuer</span>
                                    <span className="text-sm font-medium text-slate-100">{card.issuer}</span>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex justify-between">
                                    <span className="text-slate-500 text-sm">Hạn sử dụng</span>
                                    <span className="font-mono text-sm text-slate-100">{card.expiryDate || "12/28"}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-3">
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleFreeze}
                                disabled={freezing}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${card.isFrozen
                                    ? "bg-red-950/30 border-red-800/50 text-red-400 hover:bg-red-950/50"
                                    : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/5"
                                    }`}
                            >
                                {freezing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Snowflake className="w-5 h-5" />}
                                <span className="text-[11px] font-medium">{card.isFrozen ? "Mở băng" : "Đóng băng"}</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                className="p-4 rounded-xl border bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/5 transition-all flex flex-col items-center gap-2"
                            >
                                <Smartphone className="w-5 h-5" />
                                <span className="text-[11px] font-medium">Mobile Pay</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                className="p-4 rounded-xl border bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/5 transition-all flex flex-col items-center gap-2"
                            >
                                <Settings className="w-5 h-5" />
                                <span className="text-[11px] font-medium">Cài đặt</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ───────────────────────────────────── */}
                    <div className="space-y-6">

                        {/* Spending Chart */}
                        <Card className="bg-white/[0.03] border-white/10">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-purple-400" />
                                        Chi tiêu
                                    </CardTitle>
                                    <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                                        {(["1D", "1W", "1M"] as const).map(r => (
                                            <button key={r} onClick={() => setTimeRange(r)}
                                                className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${timeRange === r ? "bg-purple-600 text-white shadow-lg" : "text-slate-500 hover:text-white"
                                                    }`}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-2xl font-bold mt-2 text-white">{formatCurrency(totalSpent)}</p>
                            </CardHeader>
                            <CardContent className="h-48 pr-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                                            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                        <Tooltip
                                            contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
                                            formatter={(value: any) => [formatCurrency(value), "Chi tiêu"]}
                                        />
                                        <Area type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={2}
                                            fill="url(#spendGrad)" dot={{ r: 3, fill: "#a855f7", strokeWidth: 0 }}
                                            activeDot={{ r: 5, fill: "#c084fc", strokeWidth: 2, stroke: "#a855f7" }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Monthly Limit */}
                        <Card className="bg-white/[0.03] border-white/10">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Hạn mức tháng</span>
                                    <span className="text-xs font-mono text-slate-500">
                                        {formatCurrency(totalSpent)} / {formatCurrency(MONTHLY_LIMIT)}
                                    </span>
                                </div>
                                <div className="relative">
                                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${limitPercent > 80 ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-purple-600 to-purple-400"}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${limitPercent}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-600">
                                    Còn lại: {formatCurrency(Math.max(MONTHLY_LIMIT - totalSpent, 0))}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Transaction Feed */}
                        <Card className="bg-white/[0.03] border-white/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Giao dịch gần đây</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 max-h-72 overflow-y-auto">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-8 text-slate-600 text-sm">
                                        <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        Chưa có giao dịch nào.
                                    </div>
                                ) : (
                                    transactions.map((tx, i) => {
                                        const cat = getCategoryMeta(tx.category)
                                        const CatIcon = cat.icon
                                        return (
                                            <motion.div key={tx.id}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cat.bg}`}>
                                                    <CatIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-500">{cat.label}</span>
                                                        <span className="text-[10px] text-slate-700">•</span>
                                                        <span className="text-[10px] text-slate-600 font-mono">
                                                            {tx.timestamp?.toDate?.()
                                                                ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(tx.timestamp.toDate())
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-semibold font-mono ${tx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                                                    {tx.type === "CREDIT" ? "+" : "-"}{formatCurrency(tx.amount || 0)}
                                                </span>
                                            </motion.div>
                                        )
                                    })
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
