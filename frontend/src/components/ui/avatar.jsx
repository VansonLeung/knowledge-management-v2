import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

const Avatar = ({ className, ...props }) => (
  <AvatarPrimitive.Root className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border', className)} {...props} />
)

const AvatarImage = ({ className, ...props }) => (
  <AvatarPrimitive.Image className={cn('aspect-square h-full w-full', className)} {...props} />
)

const AvatarFallback = ({ className, ...props }) => (
  <AvatarPrimitive.Fallback className={cn('flex h-full w-full items-center justify-center bg-muted text-sm font-medium', className)} {...props} />
)

export { Avatar, AvatarImage, AvatarFallback }
