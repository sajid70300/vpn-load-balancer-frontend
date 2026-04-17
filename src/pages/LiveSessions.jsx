/**
 * LiveSessions.jsx — integrated with backend
 * Endpoint: GET /all_users/
 *
 * Backend returns: { users: [...], total, skip, limit }
 *
 * Features:
 *  1. Server-side pagination — only 50 rows fetched per request (skip/limit)
 *  2. Server-side search — user_id, device_ip, server name, server IP via ILIKE
 *  3. App filter — consumed from Topbar's useAppSelector
 *  4. Live duration ticker — updates every second via setInterval (no API call)
 *  5. Silent auto-refresh — re-fetches current page every 30s without spinner;
 *     full loading spinner only on manual Refresh or page/filter/search change
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Activity, MapPin, Clock, Upload, Download, Search, RefreshCw, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { sessionsApi } from '../services/api.js'
import { useAppSelector } from '../components/layout/Topbar.jsx'

const PAGE_SIZE = 50

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
  const [sessions,   setSessions]   = useState([])
  const [total,      setTotal]      = useState(0)   // total matching rows from backend COUNT(*)
  const [loading,    setLoading]    = useState(true) // full spinner — initial + manual refresh
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')   // raw input value
  const [debouncedSearch, setDebouncedSearch] = useState('') // sent to API after 400ms
  const [now,        setNow]        = useState(() => Date.now()) // drives live duration ticker
  const [page,       setPage]       = useState(0)               // 0-indexed

  // App filter comes from the Topbar selector (null = All Apps)
  const [selectedApp] = useAppSelector()

  // ── Debounce search input — avoids firing API on every keystroke ──────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch a specific page from the backend ────────────────────────────────
  const fetchPage = useCallback((currentPage, showSpinner) => {
    if (showSpinner) setLoading(true)
    setError('')

    const params = { skip: currentPage * PAGE_SIZE, limit: PAGE_SIZE }
    if (selectedApp)            params.app_name = selectedApp.app_id
    if (debouncedSearch.trim()) params.search   = debouncedSearch.trim()

    sessionsApi.list(params)
      .then(data => {
        setSessions(data.users || [])
        setTotal(data.total || 0)
      })
      .catch(err => setError(err.message))
      .finally(() => { if (showSpinner) setLoading(false) })
  }, [selectedApp, debouncedSearch])

  // ── Initial load on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchPage(0, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch with full spinner when page changes ──────────────────────────
  useEffect(() => {
    fetchPage(page, true)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset to page 0 and re-fetch when app filter or debounced search changes
  useEffect(() => {
    setPage(0)
    fetchPage(0, true)
  }, [selectedApp, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Silent auto-refresh every 30s — no spinner, re-fetches current page ───
  useEffect(() => {
    const autoRefresh = setInterval(() => fetchPage(page, false), 30_000)
    return () => clearInterval(autoRefresh)
  }, [page, fetchPage])

  // ── Live duration ticker — updates `now` every second, no API call ─────────
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  // ── Pagination derived values ──────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startEntry = total === 0 ? 0 : page * PAGE_SIZE + 1
  const endEntry   = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time active VPN connections</p>
        </div>
        <button onClick={() => fetchPage(page, true)} disabled={loading}
          className="btn-secondary gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat cards — total comes from backend COUNT(*), always accurate */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Active Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <div className="mt-3"><Activity size={16} className="text-gray-400" /></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">OpenVPN</p>
          <p className="text-3xl font-bold text-gray-900">
            {sessions.filter(s => s.protocol === 'openvpn').length}
            {total > PAGE_SIZE && <span className="text-sm font-normal text-gray-400 ml-1">this page</span>}
          </p>
          <div className="mt-3"><span className="tag-openvpn text-xs">Protocol</span></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Shadowsocks</p>
          <p className="text-3xl font-bold text-gray-900">
            {sessions.filter(s => s.protocol === 'shadowsocks').length}
            {total > PAGE_SIZE && <span className="text-sm font-normal text-gray-400 ml-1">this page</span>}
          </p>
          <div className="mt-3"><span className="tag-shadowsocks text-xs">Protocol</span></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Total Bandwidth</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatBytes(sessions.reduce((sum, s) => sum + (s.bytes_received || 0) + (s.bytes_sent || 0), 0))}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {total > PAGE_SIZE ? 'This page' : 'Combined transfer'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => fetchPage(page, true)} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Active Connections</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user ID, device IP, server name, or server IP..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
        </div>

        {/* Full loading spinner — on initial load, manual refresh, page/filter change */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-purple" />
          </div>
        )}

        {/* Table — renders after load completes */}
        {!loading && (
          <>
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
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-gray-400 py-10 text-sm">
                        {total === 0 ? 'No active sessions' : 'No sessions match your search'}
                      </td>
                    </tr>
                  )}
                  {sessions.map((s, i) => (
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

            {/* Pagination footer */}
            {total > 0 && (
              <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-medium text-gray-700">{startEntry}–{endEntry}</span> of{' '}
                  <span className="font-medium text-gray-700">{total}</span> sessions
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={14} />
                  </button>

                  {/* Smart page number pills with ellipsis */}
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter(i => {
                      if (totalPages <= 7) return true
                      if (i === 0 || i === totalPages - 1) return true
                      if (Math.abs(i - page) <= 1) return true
                      return false
                    })
                    .reduce((acc, i, idx, arr) => {
                      if (idx > 0 && i - arr[idx - 1] > 1) acc.push('ellipsis-' + i)
                      acc.push(i)
                      return acc
                    }, [])
                    .map(item =>
                      typeof item === 'string' ? (
                        <span key={item} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                      ) : (
                        <button key={item}
                          onClick={() => setPage(item)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                            item === page
                              ? 'bg-brand-purple text-white'
                              : 'border border-surface-border text-gray-600 hover:bg-gray-50'
                          }`}>
                          {item + 1}
                        </button>
                      )
                    )
                  }

                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}