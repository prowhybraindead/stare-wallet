"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { collection, query, where, orderBy, getDocs, or } from "firebase/firestore"
import { TransactionList } from "@/components/TransactionList"
import { Button } from "@/components/ui/button"
import { ArrowLeft, History, Loader2, ArrowDownUp } from "lucide-react"

interface Transaction {
    transactionId: string; type: string; amount: number; netAmount: number; fee: number;
    senderId: string; receiverId: string; status: string; timestamp: any;
}

export default function TransactionsPage() {
    const router = useRouter()
    const [txs, setTxs] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState("")

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.push("/login"); return }
            setUserId(user.uid)

            try {
                // Build an "OR" query in Firestore (Requires Firebase SDK v9.11.0+)
                // Alternatively, we can fetch both and merge them client-side.
                // Doing client merge to guarantee it works.
                const sentTxQuery = query(
                    collection(db, "transactions"),
                    where("senderId", "==", user.uid),
                    orderBy("timestamp", "desc")
                )
                const recvTxQuery = query(
                    collection(db, "transactions"),
                    where("receiverId", "==", user.uid),
                    orderBy("timestamp", "desc")
                )

                const [sentSnap, recvSnap] = await Promise.all([
                    getDocs(sentTxQuery),
                    getDocs(recvTxQuery)
                ])

                const allTxs = [
                    ...sentSnap.docs.map(d => d.data() as Transaction),
                    ...recvSnap.docs.map(d => d.data() as Transaction)
                ]

                // Deduplicate and re-sort by timestamp descending
                const uniqueTxsMap = new Map()
                allTxs.forEach(tx => uniqueTxsMap.set(tx.transactionId, tx))
                const combinedTxs = Array.from(uniqueTxsMap.values())
                    .sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis())

                setTxs(combinedTxs)
            } catch (err) {
                console.error("Error fetching transactions", err)
            } finally {
                setLoading(false)
            }
        })
        return () => unsub()
    }, [router])

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="font-semibold text-lg">Lịch sử giao dịch</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <ArrowDownUp className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                {loading ? (
                    <div className="flex py-12 items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : txs.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-500">
                        <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-medium text-slate-300">Chưa có giao dịch</h3>
                        <p className="mt-2 text-sm">Thực hiện chuyển tiền hoặc nạp tiền để xem lịch sử tại đây.</p>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <TransactionList transactions={txs} currentUserId={userId} />
                    </motion.div>
                )}
            </main>
        </div>
    )
}
