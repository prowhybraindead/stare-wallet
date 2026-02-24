"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { checkUserAndSession } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2, Mail, Lock, Wallet } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  async function handleGoogleLogin() {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken()
      const { redirect } = await checkUserAndSession(idToken)
      router.push(redirect)
    } catch (err: any) {
      toast({ title: "Đăng nhập thất bại", description: err.message, variant: "destructive" })
    } finally { setLoading(false) }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      const result = isLogin
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password)
      const idToken = await result.user.getIdToken()
      const { redirect } = await checkUserAndSession(idToken)
      router.push(redirect)
    } catch (err: any) {
      toast({
        title: isLogin ? "Đăng nhập thất bại" : "Đăng ký thất bại",
        description: isLogin ? "Email hoặc mật khẩu không đúng." : err.message,
        variant: "destructive"
      })
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
            <Wallet className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            StareWallet
          </h1>
          <p className="text-slate-400 mt-2">Ngân hàng số thế hệ mới</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 space-y-6">
          {/* Google */}
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold h-12"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Đăng nhập với Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
            <div className="relative text-center"><span className="bg-transparent px-2 text-slate-500 text-sm">hoặc</span></div>
          </div>

          {/* Email */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Mật khẩu</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-semibold">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
