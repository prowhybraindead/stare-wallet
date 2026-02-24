"use client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowUpRight, QrCode, ScanLine, PiggyBank, CreditCard, History } from "lucide-react"

const actions = [
  { icon: ArrowUpRight, label: "Chuyển tiền", color: "bg-blue-500/20 text-blue-400", href: "/transfer" },
  { icon: QrCode, label: "Mã QR của tôi", color: "bg-purple-500/20 text-purple-400", href: "/my-qr" },
  { icon: ScanLine, label: "Quét & Trả", color: "bg-green-500/20 text-green-400", href: "/scan-pay" },
  { icon: PiggyBank, label: "StareVaults", color: "bg-yellow-500/20 text-yellow-400", href: "/vaults" },
  { icon: CreditCard, label: "Thẻ của tôi", color: "bg-pink-500/20 text-pink-400", href: "/cards" },
  { icon: History, label: "Lịch sử", color: "bg-orange-500/20 text-orange-400", href: "/transactions" },
]

export function QuickActions() {
  const router = useRouter()
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => router.push(action.href)}
          className="flex flex-col items-center gap-2 p-3 rounded-xl glass border border-white/10 hover:border-white/20 transition-all active:scale-95"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
            <action.icon className="w-5 h-5" />
          </div>
          <span className="text-xs text-slate-400 text-center leading-tight">{action.label}</span>
        </motion.button>
      ))}
    </div>
  )
}
