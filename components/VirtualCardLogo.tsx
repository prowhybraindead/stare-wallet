"use client"

const FILTERED_ISSUERS = ["visa", "mastercard", "amex", "discover"]

interface VirtualCardLogoProps {
    issuer: string
    textTheme: "LIGHT" | "DARK"
    className?: string
}

export function VirtualCardLogo({ issuer, textTheme, className = "" }: VirtualCardLogoProps) {
    const normalized = issuer.toLowerCase().replace(/\s+/g, "")
    const useFilter = FILTERED_ISSUERS.includes(normalized)

    const filterStyle: React.CSSProperties = useFilter
        ? textTheme === "LIGHT"
            ? { filter: "brightness(0) invert(1)" }
            : { filter: "brightness(0)" }
        : {}

    return (
        <img
            src={`/logos/${normalized}.svg`}
            alt={issuer}
            className={`h-8 object-contain ${className}`}
            style={filterStyle}
            onError={(e) => {
                // Fallback: hide the broken image and show nothing
                (e.target as HTMLImageElement).style.display = "none"
            }}
        />
    )
}

export function BankLogo({ textTheme }: { textTheme: "LIGHT" | "DARK" }) {
    return (
        <span className={`font-bold text-sm tracking-wider uppercase ${textTheme === "LIGHT" ? "text-white/80" : "text-slate-800/80"}`}>
            Stare·Wallet
        </span>
    )
}
