/**
 * LiveSessions.jsx — integrated with backend
 * Endpoint: GET /all_users/
 *
 * Backend returns: { users: [{ user_id, device_ip, bytes_received, bytes_sent,
 *   connected_time, server_name, server_type, app_name, config_tag, protocol }] }
 *
 * Fixes applied:
 *  1. App filter — consumed from Topbar's useAppSelector (shown in the top bar)
 *  2. Live duration ticker — updates every second via a separate setInterval (no API call)
 *  3. Silent auto-refresh — background fetch every 30s without loading spinner;
 *     full loading spinner only on manual Refresh button click
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Activity, MapPin, Clock, Upload, Download, Search, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { sessionsApi } from '../services/api.js'
import { useAppSelector } from '../components/layout/Topbar.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function formatDuration(connectedTimeStr, now) {
  const connected = new Date(connectedTimeStr)
  const diffMs = now - connected
  if (isNaN(diffMs) || diffMs < 0) return '—'
  const totalSeconds = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatConnectedAt(connectedTimeStr) {
  const d = new Date(connectedTimeStr)
  if (isNaN(d)) return '—'
  return d.toLocaleString()
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LiveSessions() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)   // only true on manual refresh
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [now,      setNow]      = useState(() => Date.now()) // drives live duration

  // App filter comes from the Topbar selector (null = All Apps)
  const [selectedApp] = useAppSelector()

  // ── Silent background fetch (no loading spinner) ───────────────────────────
  const silentFetch = useCallback(() => {
    sessionsApi.list()
      .then(data => {
        setSessions(data.users || [])
        setError('')
      })
      .catch(err => setError(err.message))
  }, [])

  // ── Manual refresh (shows full loading spinner) ────────────────────────────
  const manualRefresh = useCallback(() => {
    setLoading(true)
    setError('')
    sessionsApi.list()
      .then(data => setSessions(data.users || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // ── On mount: initial load + silent auto-refresh every 30s ────────────────
  useEffect(() => {
    manualRefresh()
    const autoRefresh = setInterval(silentFetch, 30_000)
    return () => clearInterval(autoRefresh)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live duration ticker — updates `now` every second, no API call ─────────
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = sessions.filter(s => {
    // App filter from Topbar (null = show all)
    if (selectedApp && s.app_name !== selectedApp.app_id) return false
    // Text search
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.user_id.toLowerCase().includes(q) ||
      (s.server_name || '').toLowerCase().includes(q) ||
      (s.app_name    || '').toLowerCase().includes(q) ||
      (s.protocol    || '').toLowerCase().includes(q) ||
      (s.device_ip   || '').toLowerCase().includes(q)
    )
  })

  // ── Stat counts (always from all sessions, ignoring filters) ──────────────
  const openvpnCount     = sessions.filter(s => s.protocol === 'openvpn').length
  const shadowsocksCount = sessions.filter(s => s.protocol === 'shadowsocks').length
  const totalBandwidth   = sessions.reduce((sum, s) => sum + (s.bytes_received || 0) + (s.bytes_sent || 0), 0)

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time active VPN connections</p>
        </div>
        <button onClick={manualRefresh} disabled={loading}
          className="btn-secondary gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Active Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
          <div className="mt-3"><Activity size={16} className="text-gray-400" /></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">OpenVPN</p>
          <p className="text-3xl font-bold text-gray-900">{openvpnCount}</p>
          <div className="mt-3"><span className="tag-openvpn text-xs">Protocol</span></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Shadowsocks</p>
          <p className="text-3xl font-bold text-gray-900">{shadowsocksCount}</p>
          <div className="mt-3"><span className="tag-shadowsocks text-xs">Protocol</span></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Total Bandwidth</p>
          <p className="text-3xl font-bold text-gray-900">{formatBytes(totalBandwidth)}</p>
          <p className="text-xs text-gray-400 mt-2">Combined transfer</p>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={manualRefresh} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Active Connections</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by user ID, server, app, protocol, IP..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
        </div>

        {/* Full loading spinner — only on manual refresh */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-purple" />
          </div>
        )}

        {/* Table — always visible after first load; silent refresh updates data in-place */}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Device IP</th>
                  <th>Server</th>
                  <th>App</th>
                  <th>Protocol</th>
                  <th>Duration</th>
                  <th>Upload</th>
                  <th>Download</th>
                  <th>Connected At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-400 py-10 text-sm">
                      {sessions.length === 0 ? 'No active sessions' : 'No sessions match your search'}
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.user_id + i}>
                    <td><span className="font-mono text-xs text-gray-600">{s.user_id}</span></td>
                    <td><span className="font-mono text-xs text-gray-600">{s.device_ip}</span></td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-700">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        {s.server_name}
                      </span>
                    </td>
                    <td><span className="text-sm text-gray-600">{s.app_name || '—'}</span></td>
                    <td>
                      {s.protocol === 'openvpn'
                        ? <span className="tag-openvpn">openvpn</span>
                        : <span className="tag-shadowsocks">shadowsocks</span>
                      }
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock size={12} className="text-gray-400" />
                        {formatDuration(s.connected_time, now)}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Upload size={12} className="text-blue-400" />
                        {formatBytes(s.bytes_sent)}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Download size={12} className="text-emerald-400" />
                        {formatBytes(s.bytes_received)}
                      </span>
                    </td>
                    <td><span className="text-xs text-gray-500">{formatConnectedAt(s.connected_time)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}