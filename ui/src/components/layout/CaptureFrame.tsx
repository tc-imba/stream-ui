import type { ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

export function CaptureFrame({ children }: Props) {
  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-3 w-5 h-5 border-l-2 border-t-2 border-white/70 rounded-tl-md" />
      <div className="absolute top-2 right-3 w-5 h-5 border-r-2 border-t-2 border-white/70 rounded-tr-md" />
      <div className="absolute bottom-2 left-3 w-5 h-5 border-l-2 border-b-2 border-white/70 rounded-bl-md" />
      <div className="absolute bottom-2 right-3 w-5 h-5 border-r-2 border-b-2 border-white/70 rounded-br-md" />

      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        {children}
      </div>
    </div>
  )
}
