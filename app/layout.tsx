import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StareWallet - Your Smart Neobank",
  description: "Manage your finances, make transfers, and save smarter with StareWallet.",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
