"use client"
import { motion } from "framer-motion"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, CreditCard, RotateCcw } from "lucide-react"

interface Transaction {
  transactionId: string; type: string; amount: number; netAmount: number;
  senderId: string; receiverName?: string; senderName?: string; status: string;
  timestamp: any; note?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  P2P: { label: "Chuyển tiền", icon: ArrowUpRight, color: "text-red-400 bg-red-500/10" },
  PAYMENT: { label: "Thanh toán", icon: CreditCard, color: "text-orange-400 bg-orange-500/10" },
  DEPOSIT: { label: "Nạp tiền", icon: ArrowDownLeft, color: "text-green-400 bg-green-500/10" },
  REFUND_TICKET: { label: "Hoàn tiền", icon: RotateCcw, color: "text-blue-400 bg-blue-500/10" },
}

export function TransactionList({ transactions, currentUserId }: { transactions: Transaction[]; currentUserId: string }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>Chưa có giao dịch nào</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => {
        const isSender = tx.senderId === currentUserId
        const config = TYPE_CONFIG[tx.type] || { label: tx.type, icon: CreditCard, color: "text-slate-400 bg-slate-500/10" }
        const Icon = config.icon

        return (
          <motion.div
            key={tx.transactionId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 p-3 rounded-xl glass border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{config.label}</p>
              <p className="text-xs text-slate-500 truncate">
                {isSender ? `→ ${tx.receiverName || "Unknown"}` : `← ${tx.senderName || "Unknown"}`}
              </p>
              <p className="text-xs text-slate-600">{tx.timestamp ? formatDate(tx.timestamp) : "—"}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-semibold ${isSender ? "text-red-400" : "text-green-400"}`}>
                {isSender ? "-" : "+"}{formatCurrency(isSender ? tx.amount : tx.netAmount || tx.amount)}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tx.status === "COMPLETED" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                {tx.status === "COMPLETED" ? "Thành công" : tx.status}
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
