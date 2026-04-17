import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import {
  Shield, Home, AppWindow, Radio, Server, BarChart2,
  Activity, Globe, Wifi, SlidersHorizontal, FileText, PieChart,
  Settings, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'

const navGroups = [
  {
    items: [
      { label: 'Home Overview',          to: '/',                     icon: Home },
      { label: 'App Management',         to: '/app-management',       icon: AppWindow },
      { label: 'Live Sessions',          to: '/live-sessions',        icon: Radio },
      { label: 'Server Management',      to: '/server-management',    icon: Server },
      { label: 'VPN Servers Analytics',  to: '/vpn-analytics',        icon: BarChart2 },
      { label: 'Protocol Health',        to: '/protocol-health',      icon: Activity },
      { label: 'Country Intelligence',   to: '/country-intelligence', icon: Globe },
      { label: 'ISP Intelligence',       to: '/isp-intelligence',     icon: Wifi },
      { label: 'Policies & Overrides',   to: '/policies',             icon: SlidersHorizontal },
      { label: 'Logs & Events',          to: '/logs',                 icon: FileText },
      { label: 'Reports & Analytics',    to: '/reports',              icon: PieChart },
      { label: 'System Settings',        to: '/settings',             icon: Settings },
    ]
  }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className="flex flex-col h-screen transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '220px',
        background: '#0f1117',
        borderRight: '1px solid #1e2235',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-purple flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-white font-semibold text-sm whitespace-nowrap">VPN Admin</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navGroups[0].items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="nav-icon flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-1 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="nav-icon" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item w-full text-left"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="nav-icon" />
            : <><ChevronLeft className="nav-icon" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  )
}
