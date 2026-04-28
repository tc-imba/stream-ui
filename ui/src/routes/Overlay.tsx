import { CaptureFrame } from '@/components/layout/CaptureFrame'
import { LogPanel } from '@/components/layout/LogPanel'
import { ChatStrip } from '@/components/layout/ChatStrip'
import { GiftAlert } from '@/components/overlay/GiftAlert'

export default function Overlay() {
  return (
    <div className="overlay-grid w-screen h-screen text-white p-(--layout-margin) box-border">
      <div className="[grid-area:capture] relative">
        <CaptureFrame>
          <GiftAlert />
        </CaptureFrame>
      </div>
      <div className="[grid-area:log] min-h-0">
        <LogPanel />
      </div>
      <div className="[grid-area:chat] min-h-0">
        <ChatStrip />
      </div>
    </div>
  )
}
