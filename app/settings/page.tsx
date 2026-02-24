"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { logout } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Mail, ShieldAlert, LogOut, Loader2, ChevronRight } from "lucide-react"

export default function SettingsPage() {
    const router = useRouter()
    const [userData, setUserData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.push("/login"); return }

            try {
                const snap = await getDoc(doc(db, "users", user.uid))
                if (snap.exists()) {
                    setUserData(snap.data())
                }
            } catch (err) {
                console.error("Failed to load user data:", err)
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
                        <h1 className="font-semibold text-lg">Cài đặt & Hồ sơ</h1>
                    </div>
                    <div className="w-9" /> {/* Spacer */}
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
                {loading ? (
                    <div className="flex py-12 flex-col items-center justify-center space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm text-slate-400">Đang tải hồ sơ...</p>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                        {/* Profile Card */}
                        <div className="glass rounded-2xl p-6 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <User className="w-8 h-8 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold">{userData?.displayName || "Người dùng"}</h2>
                                <div className="flex items-center text-slate-400 mt-1">
                                    <Mail className="w-3.5 h-3.5 mr-1" />
                                    <span className="text-sm">{userData?.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* Settings Links */}
                        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/5">
                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-200">Thông tin cá nhân</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Cập nhật ảnh đại diện và tên</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>

                            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-slate-200">Bảo mật</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Đổi mật khẩu, xác thực 2 bước</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="pt-4">
                            <form action={logout}>
                                <Button type="submit" variant="destructive" className="w-full h-12 bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 border border-red-500/20 font-semibold px-4">
                                    <LogOut className="w-5 h-5 mr-2" /> Đăng xuất khỏi hệ thống
                                </Button>
                            </form>
                        </div>

                    </motion.div>
                )}
            </main>
        </div>
    )
}
