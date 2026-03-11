import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(
    ({ className, type, style, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-slate-300 dark:border-white/10 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                    className
                )}
                style={{
                    backgroundColor: "var(--input-bg, transparent)",
                    color: "inherit",
                    ...style,
                }}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"
export { Input }
