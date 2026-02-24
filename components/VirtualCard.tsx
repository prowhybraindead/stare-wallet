"use client"
import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"
import { maskCardNumber } from "@/lib/utils"
import { Snowflake, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { VirtualCardLogo, BankLogo } from "@/components/VirtualCardLogo"

interface CardData {
  cardId: string;
  cardNumber: string;
  issuer: string;
  isFrozen: boolean;
  cardDesign: {
    backgroundType: "GRADIENT" | "IMAGE";
    backgroundValue: string;
    textTheme: "LIGHT" | "DARK";
    name: string;
  };
}

export function VirtualCard({ card, compact = false }: { card: CardData; compact?: boolean }) {
  const [showNumber, setShowNumber] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-100, 100], [15, -15]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(x, [-100, 100], [-15, 15]), { stiffness: 300, damping: 30 })

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (compact) return
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }

  function handleLeave() {
    x.set(0); y.set(0)
  }

  const bg = card.cardDesign.backgroundType === "GRADIENT"
    ? card.cardDesign.backgroundValue
    : `url(${card.cardDesign.backgroundValue}) center/cover`
  const textClass = card.cardDesign.textTheme === "LIGHT" ? "text-white" : "text-slate-900"

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX: compact ? 0 : rotateX, rotateY: compact ? 0 : rotateY, transformStyle: "preserve-3d", background: bg } as any}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={cn(
        "relative rounded-2xl cursor-pointer select-none overflow-hidden",
        compact ? "w-64 h-40" : "w-full max-w-sm h-52",
        card.isFrozen && "opacity-60"
      )}
      whileHover={compact ? { scale: 1.02 } : {}}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 shimmer opacity-20" />

      {/* Frozen overlay */}
      {card.isFrozen && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-950/60 backdrop-blur-sm">
          <div className="text-center">
            <Snowflake className="w-8 h-8 text-blue-300 mx-auto mb-1" />
            <p className="text-blue-300 text-sm font-medium">Đã khóa</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn("absolute inset-0 p-5 flex flex-col justify-between", textClass)}>
        <div className="flex justify-between items-start">
          <BankLogo textTheme={card.cardDesign.textTheme} />
          <VirtualCardLogo issuer={card.issuer} textTheme={card.cardDesign.textTheme} />
        </div>

        <div>
          {!compact && (
            <div className="flex items-center gap-2 mb-3">
              <p className="text-lg font-mono tracking-widest">
                {showNumber ? card.cardNumber : maskCardNumber(card.cardNumber)}
              </p>
              <button onClick={() => setShowNumber(!showNumber)} className="opacity-60 hover:opacity-100">
                {showNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
          {compact && (
            <p className="text-sm font-mono opacity-70">{maskCardNumber(card.cardNumber)}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
