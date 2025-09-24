import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0"
    
    const variantClasses = {
      default: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
      secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
      destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
      outline: "text-gray-900 border-gray-300 hover:bg-gray-50"
    }

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`

    return (
      <span
        ref={ref}
        className={combinedClasses}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export { Badge }
