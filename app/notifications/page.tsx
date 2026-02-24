"use client"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Bell, BellRing, Settings2 } from "lucide-react"

export default function NotificationsPage() {
    const router = useRouter()

    const dummyNotifications = [
        {
            id: "1",
            title: "Chào mừng đến Shark Fintech! 🦈",
            body: "Cảm ơn bạn đã đồng hành cùng hệ sinh thái ví của tương lai. Khám phá các tính năng ưu việt ngay hôm nay.",
            time: "Vừa xong",
            read: false,
        },
        {
            id: "2",
            title: "Giao dịch thành công",
            body: "Bạn đã nhận được 50,000 VND từ một người bạn!",
            time: "2 giờ trước",
            read: true,
        }
    ]

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-40 glass border-b border-white/10 px-4 py-3">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="w-5 h-5" /></Button>
                        <h1 className="font-semibold text-lg">Thông báo</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <Settings2 className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
                {dummyNotifications.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-500">
                        <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-medium text-slate-300">Không có thông báo</h3>
                        <p className="mt-2 text-sm">Bạn đã xem hết tất cả thông báo.</p>
                    </motion.div>
                ) : (
                    dummyNotifications.map((noti, i) => (
                        <motion.div
                            key={noti.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass rounded-2xl p-4 flex gap-4 ${noti.read ? "opacity-70" : "border-blue-500/30"}`}
                        >
                            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                ${noti.read ? "bg-slate-800 text-slate-400" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                                {noti.read ? <Bell className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-semibold ${noti.read ? "text-slate-300" : "text-white"}`}>
                                        {noti.title}
                                    </h3>
                                    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">{noti.time}</span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{noti.body}</p>
                            </div>
                        </motion.div>
                    ))
                )}
            </main>
        </div>
    )
}
