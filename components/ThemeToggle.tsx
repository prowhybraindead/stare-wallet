"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

const MODES = [
    { key: "dark", icon: Moon, label: "Tối" },
    { key: "light", icon: Sun, label: "Sáng" },
    { key: "system", icon: Monitor, label: "Hệ thống" },
] as const

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])
    if (!mounted) return null

    const next = () => {
        const idx = MODES.findIndex(m => m.key === theme)
        setTheme(MODES[(idx + 1) % MODES.length].key)
    }

    const current = MODES.find(m => m.key === theme) || MODES[0]
    const Icon = current.icon

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="text-slate-400 hover:text-white hover:bg-white/5 dark:text-slate-400 dark:hover:text-white"
            title={`Chế độ: ${current.label}`}
        >
            <Icon className="w-4 h-4" />
        </Button>
    )
}
