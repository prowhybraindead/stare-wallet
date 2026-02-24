"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore"
import { logout } from "@/lib/actions/auth"
import { formatCurrency } from "@/lib/utils"
import { VirtualCard } from "@/components/VirtualCard"
import { QuickActions } from "@/components/QuickActions"
import { TransactionList } from "@/components/TransactionList"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, LogOut, Bell, Settings, Wallet, Building2, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const B2B_TIERS = ["BUSINESS", "PREMIUM_BUSINESS"]

const TIER_BADGE: Record<string, string> = {
  PRIORITY: "bg-slate-600/30 text-slate-300 border-slate-500/30",
  SILVER: "bg-zinc-500/20 text-zinc-300 border-zinc-400/30",
  GOLD: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
  DIAMOND: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
  RUBY: "bg-rose-500/20 text-rose-300 border-rose-400/30",
  BUSINESS: "bg-blue-900/40 text-blue-200 border-blue-400/30",
  PREMIUM_BUSINESS: "bg-amber-900/40 text-amber-200 border-amber-400/30",
}

interface UserData {
  uid: string; email: string; displayName: string; mainBalance: number; isFrozen: boolean; tier?: string;
}
interface CardData {
  cardId: string; cardNumber: string; issuer: string; cardDesign: any; isFrozen: boolean;
}
interface Transaction {
  transactionId: string; type: string; amount: number; netAmount: number; fee: number;
  senderId: string; receiverId: string; status: string; timestamp: any;
}

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [cards, setCards] = useState<CardData[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [balanceFontSize, setBalanceFontSize] = useState("text-5xl")

  const tier = userData?.tier || "PRIORITY"
  const isB2B = B2B_TIERS.includes(tier)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/login"); return }

      const userUnsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (!snap.exists()) { router.push("/onboarding"); return }
        const data = snap.data() as UserData
        setUserData(data)
        const balance = data.mainBalance
        if (balance >= 1_000_000_000) setBalanceFontSize("text-2xl")
        else if (balance >= 100_000_000) setBalanceFontSize("text-3xl")
        else if (balance >= 10_000_000) setBalanceFontSize("text-4xl")
        else setBalanceFontSize("text-5xl")
        setLoading(false)
      })

      const cardsUnsub = onSnapshot(
        query(collection(db, "cards"), where("userId", "==", user.uid)),
        (snap) => setCards(snap.docs.map(d => d.data() as CardData))
      )

      const txQuery = query(
        collection(db, "transactions"),
        where("senderId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(10)
      )

      const txUnsub = onSnapshot(txQuery, (snap) => {
        setTxs(snap.docs.map(d => d.data() as Transaction))
      })

      return () => { userUnsub(); cardsUnsub(); txUnsub() }
    })
    return () => unsub()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANIMATION VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════════
  const fadeIn = isB2B
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
    : { initial: { opacity: 0, y: 30, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: "spring", stiffness: 300, damping: 20 } }

  const stagger = (i: number) => isB2B
    ? { delay: i * 0.05 }
    : { delay: i * 0.1 }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SHARED HEADER
  // ═══════════════════════════════════════════════════════════════════════════════
  const Header = (
    <header className={`sticky top-0 z-40 border-b px-4 py-3 ${isB2B ? "bg-slate-950/90 border-slate-800 backdrop-blur-sm" : "glass border-white/10"}`}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isB2B ? <Building2 className="w-6 h-6 text-blue-400" /> : <Wallet className="w-6 h-6 text-blue-400" />}
          <span className={`font-bold text-lg ${isB2B ? "text-slate-100 tracking-wide" : ""}`}>
            {isB2B ? "StareWallet Business" : "StareWallet"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"
            onClick={() => router.push("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="icon" className="text-slate-400 hover:text-red-400">
              <LogOut className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // B2B CORPORATE DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════════
  if (isB2B) {
    const totalSent = txs.filter(t => t.senderId === userData?.uid).reduce((s, t) => s + t.amount, 0)
    const totalReceived = txs.filter(t => t.receiverId === userData?.uid).reduce((s, t) => s + t.netAmount, 0)

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {Header}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Corporate Greeting */}
          <motion.div {...fadeIn}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/50 border border-blue-800 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-widest">Tài khoản doanh nghiệp</p>
                <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  {userData?.displayName}
                  <Badge className={`text-[10px] font-medium border ${TIER_BADGE[tier]}`}>{tier}</Badge>
                </h1>
              </div>
            </div>
          </motion.div>

          {userData?.isFrozen && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-red-300 text-sm">
              ⚠️ Tài khoản doanh nghiệp đang bị tạm khóa.
            </div>
          )}

          {/* Corporate Balance Bar */}
          <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(1) }}>
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Số dư khả dụng</p>
              <p className={`${balanceFontSize} font-bold text-slate-50 font-mono`}>
                {formatCurrency(userData?.mainBalance || 0)}
              </p>
              <p className="text-slate-600 text-xs mt-1">{userData?.email}</p>
            </div>
          </motion.div>

          {/* Mini KPI Row */}
          <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(2) }}
            className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-900/40 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Nhận</p>
                  <p className="text-sm font-semibold font-mono">{formatCurrency(totalReceived)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800 text-slate-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-900/40 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider">Gửi</p>
                  <p className="text-sm font-semibold font-mono">{formatCurrency(totalSent)}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions (corporate style inherits) */}
          <QuickActions />

          {/* Cards */}
          {cards.length > 0 && (
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(3) }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Thẻ doanh nghiệp</h2>
                <Button variant="ghost" size="sm" onClick={() => router.push("/cards")} className="text-blue-400 text-xs">Xem tất cả</Button>
              </div>
              <div className="overflow-x-auto flex gap-4 pb-2 snap-x">
                {cards.map(card => (
                  <Link key={card.cardId} href={`/cards/${card.cardId}`}
                    className="flex-shrink-0 snap-start cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    <VirtualCard card={card} compact />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Transactions Table */}
          <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(4) }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Giao dịch gần đây</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")} className="text-blue-400 text-xs">Xem tất cả</Button>
            </div>
            <TransactionList transactions={txs} currentUserId={userData?.uid || ""} />
          </motion.div>
        </main>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // B2C GEN-Z DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen">
      {Header}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Gen-Z Greeting */}
        <motion.div {...fadeIn}>
          <p className="text-slate-400 text-sm">Xin chào,</p>
          <h1 className="text-2xl font-bold">
            {userData?.displayName}
            <Badge className={`ml-2 text-xs font-medium border ${TIER_BADGE[tier]}`}>
              {tier}
            </Badge>
          </h1>
          {userData?.isFrozen && (
            <div className="mt-2 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              ⚠️ Tài khoản của bạn đang bị tạm khóa. Liên hệ hỗ trợ.
            </div>
          )}
        </motion.div>

        {/* Gen-Z Vibrant Balance Card */}
        <motion.div
          {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(1) }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-6 shadow-2xl"
        >
          <div className="absolute inset-0 shimmer opacity-30" />
          <div className="relative">
            <p className="text-white/70 text-sm font-medium">Số dư khả dụng 💰</p>
            <motion.p
              key={userData?.mainBalance}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className={`${balanceFontSize} font-bold mt-1 text-white`}
            >
              {formatCurrency(userData?.mainBalance || 0)}
            </motion.p>
            <p className="text-white/50 text-xs mt-2">{userData?.email}</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Virtual Cards */}
        {cards.length > 0 && (
          <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(2) }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Thẻ của tôi ✨</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push("/cards")} className="text-blue-400">
                Xem tất cả
              </Button>
            </div>
            <div className="overflow-x-auto flex gap-4 pb-2 snap-x">
              {cards.map(card => (
                <Link key={card.cardId} href={`/cards/${card.cardId}`}
                  className="flex-shrink-0 snap-start cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  <VirtualCard card={card} compact />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Transactions */}
        <motion.div {...fadeIn} transition={{ ...fadeIn.transition, ...stagger(3) }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Giao dịch gần đây 📋</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/transactions")} className="text-blue-400">
              Xem tất cả
            </Button>
          </div>
          <TransactionList transactions={txs} currentUserId={userData?.uid || ""} />
        </motion.div>
      </main>
    </div>
  )
}
