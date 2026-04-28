import { Routes, Route, Navigate } from 'react-router-dom'
import { useLaplaceEvents } from '@/hooks/useLaplaceEvents'
import { useSTS2AgentEvents } from '@/hooks/useSTS2AgentEvents'
import { useMockEvents } from '@/hooks/useMockEvents'
import { useMockAgent } from '@/hooks/useMockAgent'
import { useMockLogs } from '@/hooks/useMockLogs'
import Overlay from '@/routes/Overlay'
import ChatOverlay from '@/routes/ChatOverlay'
import AlertOverlay from '@/routes/AlertOverlay'
import StatsOverlay from '@/routes/StatsOverlay'

export default function App() {
  useLaplaceEvents()
  useSTS2AgentEvents()
  useMockEvents()
  useMockAgent()
  useMockLogs()

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overlay" replace />} />
      <Route path="/overlay" element={<Overlay />} />
      <Route path="/chat" element={<ChatOverlay />} />
      <Route path="/alert" element={<AlertOverlay />} />
      <Route path="/stats" element={<StatsOverlay />} />
    </Routes>
  )
}
