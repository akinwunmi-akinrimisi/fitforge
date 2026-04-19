'use client'

import * as React from 'react'
import { Drawer as VaulPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

export const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof VaulPrimitive.Root>) => (
  <VaulPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = 'Drawer'

export const DrawerTrigger = VaulPrimitive.Trigger
export const DrawerClose = VaulPrimitive.Close
export const DrawerPortal = VaulPrimitive.Portal

export const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof VaulPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof VaulPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <VaulPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/70', className)}
    {...props}
  />
))
DrawerOverlay.displayName = 'DrawerOverlay'

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof VaulPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof VaulPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <VaulPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[92dvh] flex-col border-t border-border bg-background',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" />
      {children}
    </VaulPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('grid gap-1.5 px-5 pb-2 pt-4 text-left', className)} {...props} />
)

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof VaulPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof VaulPrimitive.Title>
>(({ className, ...props }, ref) => (
  <VaulPrimitive.Title
    ref={ref}
    className={cn('font-display text-2xl leading-[1.05]', className)}
    {...props}
  />
))
DrawerTitle.displayName = 'DrawerTitle'

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof VaulPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof VaulPrimitive.Description>
>(({ className, ...props }, ref) => (
  <VaulPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DrawerDescription.displayName = 'DrawerDescription'
