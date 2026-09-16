import * as React from 'react'
import { cn } from '@/lib/utils'
import { classeCampo } from '@/components/ui/input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(classeCampo, 'min-h-20 resize-y', className)}
      {...props}
    />
  )
})
