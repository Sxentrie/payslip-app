/**
 * @file: src/renderer/src/App.tsx
 *
 * @description:
 * Root application component that defines the client-side route
 * table via React Router.
 *
 * @module: Renderer.App
 *
 * @overview:
 * Sets up a HashRouter with a flat route structure nested under
 * AppLayout. Each route maps a URL path to a lazy-free page
 * component: Dashboard (/), NewPayslip, PayslipLog, Employees,
 * Branches, PrintPreview, and Settings. The index route redirects
 * to Dashboard. HashRouter is used instead of BrowserRouter
 * because Electron's file:// protocol does not support history
 * pushState.
 *
 * @dependencies:
 * - react-router-dom
 * - src/renderer/src/components/AppLayout.tsx
 * - src/renderer/src/pages/Dashboard.tsx
 * - src/renderer/src/pages/NewPayslip.tsx
 * - src/renderer/src/pages/PayslipLog.tsx
 * - src/renderer/src/pages/Employees.tsx
 * - src/renderer/src/pages/Branches.tsx
 * - src/renderer/src/pages/PrintPreview.tsx
 * - src/renderer/src/pages/Settings.tsx
 *
 * @outputs:
 * - default (App component)
 */

import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import Dashboard from '@/pages/Dashboard'
import NewPayslip from '@/pages/NewPayslip'
import PayslipLog from '@/pages/PayslipLog'
import Employees from '@/pages/Employees'
import Branches from '@/pages/Branches'
import PrintPreview from '@/pages/PrintPreview'
import Settings from '@/pages/Settings'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-payslip" element={<NewPayslip />} />
          <Route path="/payslip-log" element={<PayslipLog />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/print-preview" element={<PrintPreview />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
