/**
 * @file: src/renderer/src/components/AppLayout.tsx
 *
 * @description:
 * Application shell component providing a collapsible sidebar with
 * navigation links and a scrollable main content outlet.
 *
 * @module: Renderer.Layout
 *
 * @overview:
 * Renders the persistent UI chrome that wraps every page. The
 * sidebar displays navigation links (Dashboard, New Payslip,
 * Payslip Log, Employees, Branches, Print Preview, Settings) with
 * Lucide icons and active-route highlighting via useLocation. A
 * toggle button collapses the sidebar to icon-only mode. The main
 * content area renders the matched child route via Outlet and is
 * hidden during print (controlled by globals.css @media print).
 *
 * @dependencies:
 * - react
 * - react-router-dom
 * - lucide-react
 * - src/renderer/src/components/ui/button.tsx
 * - src/renderer/src/components/ui/separator.tsx
 *
 * @outputs:
 * - default (AppLayout component)
 */

import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Printer,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import AppIcon from '@/assets/icon.svg'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/new-payslip', icon: FilePlus, label: 'New Payslip' },
  { to: '/payslip-log', icon: FileText, label: 'Payslip Log' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/branches', icon: Building2, label: 'Branches' },
  { to: '/print-preview', icon: Printer, label: 'Print Preview' },
  { to: '/settings', icon: Settings, label: 'Settings' }
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-300 print:hidden',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-primary tracking-tight">PaySlip</h1>
              <img src={AppIcon} alt="App Icon" className="w-6 h-6" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <Separator />
        <div className="p-4">
          {!collapsed && (
            <p className="text-xs text-muted-foreground text-center">Payslip Manager v1.0</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
