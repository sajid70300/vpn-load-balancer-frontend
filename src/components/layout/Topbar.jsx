import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown, Server, Users, AlertTriangle, X, CheckCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.jsx'
import { appsApi, notificationsApi } from '../../services/api.js'

// Pages where the app selector should be hidden
const HIDE_APP_SELECTOR = [
  '/app-management',
  '/server-management',
  '/vpn-analytics',
  '/protocol-health',
  '/country-intelligence',
  '/isp-intelligence',
  '/policies',
  '/logs',
  '/settings',
]

// ─── Global app selector state (shared across components via useAppSelector) ──
let _selectedApp = null   // null = "All Apps"
let _setters = []

export function getSelectedApp() { return _selectedApp }

export function useAppSelector() {
  const [app, setAppLocal] = useState(_selectedApp)

  function setApp(a) {
    _selectedApp = a
    _setters.forEach(fn => fn(a))
  }

  useEffect(() => {
    _setters.push(setAppLocal)
    return () => { _setters = _setters.filter(fn => fn !== setAppLocal) }
  }, [])

  return [app, setApp]
}

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_CONFIG = {
  server_down: {
    icon:  Server,
    color: 'text-red-500',
    bg:    'bg-red-50',
    label: 'Server Down',
  },
  server_recovered: {
    icon:  Server,
    color: 'text-green-500',
    bg:    'bg-green-50',
    label: 'Server Recovered',
  },
  capacity_reached: {
    icon:  Users,
    color: 'text-amber-500',
    bg:    'bg-amber-50',
    label: 'Capacity Reached',
  },
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onClose }) {
  return (
    <div
      className="absolute right-0 top-full mt-2 z-50 bg-white border border-surface-border rounded-xl shadow-cardHover"
      style={{ width: 360 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 px-2 py-1 text-xs text-brand-purple hover:bg-purple-50 rounded-lg transition-colors"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Bell size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map(n => {
            const cfg = NOTIF_CONFIG[n.type] || {
              icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-50', label: n.type,
            }
            const Icon = cfg.icon
            return (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 border-b border-surface-border last:border-0 ${
                  !n.is_read ? 'bg-blue-50/40' : 'bg-white'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center mt-0.5`}>
                  <Icon size={15} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {!n.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-snug">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {n.app_name && (
                      <span className="text-xs text-gray-400">{n.app_name}</span>
                    )}
                    <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
export default function Topbar() {
  const { user } = useAuth()
  const [app, setApp] = useAppSelector()
  const [open, setOpen] = useState(false)
  const [apps, setApps] = useState([])
  const { pathname } = useLocation()

  // Notification state
  const [notifOpen, setNotifOpen]         = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const notifRef                          = useRef(null)
  const pollRef                           = useRef(null)

  const showAppSelector = !HIDE_APP_SELECTOR.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Fetch real apps list when selector is visible
  useEffect(() => {
    if (!showAppSelector) return
    appsApi.list()
      .then(data => setApps(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [showAppSelector])

  // Reset to "All Apps" when navigating away from a page that uses selector
  useEffect(() => {
    if (!showAppSelector) setApp(null)
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notification polling ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(() => {
    notificationsApi.list({ limit: 50 })
      .then(data => {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()                                   // fetch immediately on mount
    pollRef.current = setInterval(fetchNotifications, 30000) // then every 30 s
    return () => clearInterval(pollRef.current)
  }, [fetchNotifications])

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [notifOpen])

  function handleBellClick() {
    const opening = !notifOpen
    setNotifOpen(opening)
    // Mark all read as soon as the panel opens
    if (opening && unreadCount > 0) {
      notificationsApi.markAllRead()
        .then(() => {
          setUnreadCount(0)
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        })
        .catch(() => {})
    }
  }

  function handleMarkAllRead() {
    notificationsApi.markAllRead()
      .then(() => {
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      })
      .catch(() => {})
  }

  const displayName = app ? app.name : 'All Apps'

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-white border-b border-surface-border flex-shrink-0">
      {/* App Selector — hidden on certain pages */}
      <div className="flex items-center gap-3">
        {showAppSelector ? (
          <>
            <span className="text-xs text-gray-400 font-medium">Selected Application</span>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800 transition-colors min-w-[130px]"
              >
                <span className="flex-1 text-left">{displayName}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-surface-border rounded-xl shadow-cardHover min-w-[180px] py-1">
                  <button
                    onClick={() => { setApp(null); setOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!app ? 'font-semibold text-brand-purple' : 'text-gray-700'}`}
                  >
                    All Apps
                  </button>
                  {apps.map(a => (
                    <button
                      key={a.app_id}
                      onClick={() => { setApp(a); setOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${app?.app_id === a.app_id ? 'font-semibold text-brand-purple' : 'text-gray-700'}`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div />
        )}
      </div>

      {/* Right side: bell + user */}
      <div className="flex items-center gap-3">

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} className="text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {notifOpen && (
            <NotificationPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* User info */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-surface-border">
          <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center text-xs font-bold text-white">
            {user.initials}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">{user.name}</p>
            <p className="text-xs text-brand-purple font-medium">{user.role}</p>
          </div>
        </div>

      </div>
    </header>
  )
}