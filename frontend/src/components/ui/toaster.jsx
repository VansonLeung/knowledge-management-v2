import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport
} from '@/components/ui/toast'

export function Toaster({ className, ...props }) {
  const { toasts, dismiss } = useToast()

  return (
    <RadixToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, variant, duration }) => (
        <Toast
          key={id}
          variant={variant}
          duration={duration}
          onOpenChange={open => {
            if (!open) dismiss(id)
          }}
          {...props}
        >
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport className={cn(className)} />
    </RadixToastProvider>
  )
}
