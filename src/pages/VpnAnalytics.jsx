/**
 * VpnAnalytics.jsx — integrated with backend
 *
 * Endpoint: GET /admin/servers/ + GET /admin/shadowsocks/servers
 * (merged via serversApi.list())
 *
 * What changed from mock:
 * - Per-app user columns (SmartVPNBlue, FastVPN, etc.) are REPLACED with
 *   the actual app_name column showing which app owns the server.
 *   Per-app user counts per server are not tracked in the backend — this
 *   would require session grouping that doesn't exist yet.
 * - Real data: ip, type, load (computed from current_users/max_capacity),
 *   cpu, ram, ping, peakUsers, peakCpu, peakRam
 * - Filters are wired to the API (app, status, type)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Filter, Users, Server, TrendingUp, ChevronDown, Loader2, AlertCircle, RefreshCw, Shield, Radio, LayoutList, LayoutGrid, History as HistoryIcon } from 'lucide-react'
import { serversApi, appsApi, statsApi } from '../services/api.js'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ProtocolBadge({ protocol }) {
  return protocol === 'openvpn'
    ? <span className="tag-openvpn flex items-center gap-1"><Shield size={10} />openvpn</span>
    : <span className="tag-shadowsocks flex items-center gap-1"><Radio  size={10} />ss</span>
}

export default function VpnAnalytics() {
  const [servers,      setServers]      = useState([])
  const [apps,         setApps]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter,   setTypeFilter]   = useState('All Types')
  const [appFilter,    setAppFilter]    = useState('All Apps')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [viewMode,     setViewMode]     = useState('per-app') // 'per-app' | 'per-server' | 'history'

  // All-time peak active users (updated by a backend Celery task every ~60s)
  const [peakUsers, setPeakUsers] = useState(0)
  const [peakAt,    setPeakAt]    = useState(null)

  // Historical trend chart (snapshots recorded every ~2 hours on the backend)
  const [historyRange,   setHistoryRange]   = useState('7d') // '24h' | '7d' | '30d' | 'all'
  const [historyData,    setHistoryData]    = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError,   setHistoryError]   = useState('')

  // Monthly daily-peak chart — derived from the same 2-hour history data on
  // the backend (no separate tracking); one bar per calendar day.
  const [selectedMonth,     setSelectedMonth]     = useState(() => new Date().toISOString().slice(0, 7)) // 'YYYY-MM'
  const [dailyPeaksData,    setDailyPeaksData]    = useState([])
  const [dailyPeaksLoading, setDailyPeaksLoading] = useState(false)
  const [dailyPeaksError,   setDailyPeaksError]   = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    Promise.all([
      serversApi.list({ limit: 500 }), // fetch all servers (backend default is 100; 500 is the backend's max) so totals aren't undercounted
      appsApi.list(),
      statsApi.peakUsers(),
    ])
      .then(([sData, aData, pData]) => {
        setServers(sData.servers || [])
        setApps(aData || [])
        setPeakUsers(pData.peak_users || 0)
        setPeakAt(pData.peak_at || null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Fetch history snapshots only when the History tab is active, or when the
  // selected range changes — avoids an extra request on every normal page load.
  useEffect(() => {
    if (viewMode !== 'history') return
    setHistoryLoading(true); setHistoryError('')
    statsApi.userHistory({ range: historyRange })
      .then(data => setHistoryData(data.points || []))
      .catch(err => setHistoryError(err.message))
      .finally(() => setHistoryLoading(false))
  }, [viewMode, historyRange])

  // Fetch daily-peak data for the selected month, same activation condition.
  useEffect(() => {
    if (viewMode !== 'history') return
    setDailyPeaksLoading(true); setDailyPeaksError('')
    statsApi.dailyPeaks({ month: selectedMonth })
      .then(data => setDailyPeaksData(data.days || []))
      .catch(err => setDailyPeaksError(err.message))
      .finally(() => setDailyPeaksLoading(false))
  }, [viewMode, selectedMonth])

  // 'day' comes back as a plain 'YYYY-MM-DD' string (a calendar date, not a
  // moment in time) — parsed via the local Date(y, m, d) constructor, never
  // via new Date(dateString), which JS interprets as UTC midnight and can
  // shift the displayed day by one depending on the viewer's timezone.
  const dailyPeakDayNumber = (dateStr) => parseInt(dateStr.split('-')[2], 10)
  const dailyPeakFullLabel = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Client-side filtering
  const filtered = servers.filter(s => {
    if (statusFilter === 'Active'   && !s.is_active)  return false
    if (statusFilter === 'Inactive' &&  s.is_active)  return false
    if (typeFilter   === 'Premium'  && s.server_type !== 'premium') return false
    if (typeFilter   === 'Free'     && s.server_type !== 'free')    return false
    if (appFilter    !== 'All Apps' && s.app_name    !== appFilter) return false
    if (priorityOnly && !s.is_priority_group) return false
    return true
  })

  // Per-server view: the API returns one row per (physical server + app)
  // combination — a single physical machine finalized for N apps produces
  // N rows. Group those by (ip_address + server_type) into ONE row per
  // physical server, with per-app user counts merged into `appUsers`.
  const groupedServers = React.useMemo(() => {
    const eligible = servers.filter(s => {
      if (statusFilter === 'Active'   && !s.is_active)  return false
      if (statusFilter === 'Inactive' &&  s.is_active)  return false
      if (typeFilter   === 'Premium'  && s.server_type !== 'premium') return false
      if (typeFilter   === 'Free'     && s.server_type !== 'free')    return false
      if (priorityOnly && !s.is_priority_group) return false
      return true
    })

    const groups = new Map()

    for (const s of eligible) {
      const key = `${s.ip_address}||${s.server_type}`
      let group = groups.get(key)

      if (!group) {
        group = {
          key,
          ip_address:        s.ip_address,
          name:              s.name,
          server_type:       s.server_type,
          display_order:     s.display_order,
          server_city:       s.server_city,
          server_country:    s.server_country,
          // CPU/RAM/ping/peak are physical-machine facts (identical across
          // app rows once the backend keeps them in sync) — the freshest
          // reading among the grouped rows is used, picked below.
          cpu_usage:         s.cpu_usage,
          ram_usage:         s.ram_usage,
          ping_latency_ms:   s.ping_latency_ms,
          peak_cpu:          s.peak_cpu,
          peak_ram:          s.peak_ram,
          last_health_check: s.last_health_check,
          is_active:         s.is_active,
          is_priority_group: s.is_priority_group,
          has_openvpn:       s.has_openvpn,
          has_shadowsocks:   s.has_shadowsocks,
          totalUsers:        0,
          peak_users:        0,
          appUsers:          {},
        }
        groups.set(key, group)
      }

      // current_users is already combined (both protocols) from the API
      group.totalUsers += s.current_users || 0
      // Peak users is genuinely per-app (each app tracks its own peak
      // concurrent sessions) — combined here as the sum across apps.
      group.peak_users += s.peak_users || 0
      group.appUsers[s.app_name] = (group.appUsers[s.app_name] || 0) + (s.current_users || 0)

      // Server-wide flags: true if ANY app row on this physical server has it
      group.is_active         = group.is_active || s.is_active
      group.is_priority_group = group.is_priority_group || s.is_priority_group
      group.has_openvpn       = group.has_openvpn || s.has_openvpn
      group.has_shadowsocks   = group.has_shadowsocks || s.has_shadowsocks
      group.display_order     = Math.min(group.display_order, s.display_order)

      // Use whichever grouped row was health-checked most recently as the
      // representative CPU/RAM/ping/peak reading.
      if (s.last_health_check && (!group.last_health_check || new Date(s.last_health_check) > new Date(group.last_health_check))) {
        group.cpu_usage         = s.cpu_usage
        group.ram_usage         = s.ram_usage
        group.ping_latency_ms   = s.ping_latency_ms
        group.peak_cpu          = s.peak_cpu
        group.peak_ram          = s.peak_ram
        group.last_health_check = s.last_health_check
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }, [servers, statusFilter, typeFilter, priorityOnly])

  // Summary stats — per-server view uses groupedServers totals
  const totalUsers    = viewMode === 'per-server'
    ? groupedServers.reduce((sum, s) => sum + s.totalUsers, 0)
    : filtered.reduce((sum, s) => sum + (s.current_users || 0), 0)
  const totalServers  = viewMode === 'per-server' ? groupedServers.length : filtered.length
  const premiumCount  = viewMode === 'per-server'
    ? groupedServers.filter(s => s.server_type === 'premium').length
    : filtered.filter(s => s.server_type === 'premium').length
  const freeCount     = viewMode === 'per-server'
    ? groupedServers.filter(s => s.server_type === 'free').length
    : filtered.filter(s => s.server_type === 'free').length

  // Top 3 by load
  const topLoad = (viewMode === 'per-server'
    ? groupedServers.map(s => ({ loc: `${s.server_city || s.name}, ${s.server_country || ''}`, load: Math.round(s.totalUsers / 100 * 10) }))
    : filtered.map(s => ({ loc: `${s.server_city || s.name}, ${s.server_country || ''}`, load: s.max_capacity > 0 ? Math.round((s.current_users || 0) / s.max_capacity * 100) : 0 }))
  ).sort((a, b) => b.load - a.load).slice(0, 3)

  // Users per app
  const appUsers = apps.slice(0, 3).map(a => ({
    n: a.name,
    c: viewMode === 'per-server'
      ? groupedServers.reduce((sum, s) => sum + (s.appUsers[a.app_id] || 0), 0)
      : filtered.filter(s => s.app_name === a.app_id).reduce((sum, s) => sum + (s.current_users || 0), 0),
  }))

  const selClass = 'appearance-none pl-3 pr-7 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple cursor-pointer'
  const appNames = apps.map(a => a.app_id)

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VPN Server Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Monitor and manage your VPN server infrastructure</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={load} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="card px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {viewMode !== 'history' && (
            <>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                <Filter size={14} /> Filters
              </div>
              {[
                { label: statusFilter, opts: ['All Status', 'Active', 'Inactive'], set: setStatusFilter },
                { label: typeFilter,   opts: ['All Types', 'Premium', 'Free'],     set: setTypeFilter },
                ...(viewMode === 'per-app' ? [{ label: appFilter, opts: ['All Apps', ...appNames], set: setAppFilter }] : []),
              ].map(({ label, opts, set }) => (
                <div key={label} className="relative">
                  <select value={label} onChange={e => set(e.target.value)} className={selClass}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-1">
                <button type="button" onClick={() => setPriorityOnly(!priorityOnly)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${priorityOnly ? 'bg-brand-purple' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${priorityOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                Priority only
              </label>
            </>
          )}

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('per-app')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'per-app' ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutList size={13} /> Per App
            </button>
            <button
              onClick={() => setViewMode('per-server')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'per-server' ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid size={13} /> Per Server
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'history' ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HistoryIcon size={13} /> History
            </button>
          </div>
          {viewMode !== 'history' && (
            <span className="text-xs text-gray-400">{viewMode === 'per-server' ? groupedServers.length : filtered.length} servers</span>
          )}
        </div>
      </div>

      {/* Summary panel */}
      <div className="card border-2 border-blue-200 overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-surface-border">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users size={15} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Total Active Users</span>
            </div>
            <p className="text-3xl font-bold text-brand-purple">{totalUsers.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Across filtered servers</p>
            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-surface-border">
              All-time peak: <span className="font-semibold text-gray-700">{peakUsers.toLocaleString()}</span>
              {peakAt && (
                <span className="block text-gray-400 mt-0.5">{new Date(peakAt).toLocaleString()}</span>
              )}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Server size={15} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Servers Shown</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalServers}</p>
            <p className="text-xs text-gray-400 mt-1">
              <span className="text-brand-purple">Premium: {premiumCount}</span> &nbsp;Free: {freeCount}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Users per App</span>
            </div>
            <div className="space-y-1.5">
              {appUsers.length === 0
                ? <p className="text-xs text-gray-400">No apps</p>
                : appUsers.map(a => (
                    <div key={a.n} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate mr-2">{a.n}</span>
                      <span className="font-semibold text-gray-800">{a.c}</span>
                    </div>
                  ))
              }
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Top Load Servers</span>
            </div>
            <div className="space-y-1.5">
              {topLoad.length === 0
                ? <p className="text-xs text-gray-400">No data</p>
                : topLoad.map(r => (
                    <div key={r.loc} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 truncate mr-2">{r.loc}</span>
                      <span className={`px-1.5 py-0.5 rounded font-bold text-white text-[10px] ${r.load >= 90 ? 'bg-red-500' : 'bg-amber-500'}`}>{r.load}%</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Servers table / History chart */}
      <div className="card overflow-hidden">
        {viewMode === 'history' ? (
          /* ── History trend chart (snapshots every ~2 hours) ── */
          <div className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Active Users History</h3>
                <p className="text-xs text-gray-400 mt-0.5">Snapshots recorded every ~2 hours</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {[
                  { key: '24h', label: '24h' },
                  { key: '7d',  label: '7 Days' },
                  { key: '30d', label: '30 Days' },
                  { key: 'all', label: 'All Time' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setHistoryRange(opt.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${historyRange === opt.key ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-purple" />
              </div>
            ) : historyError ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{historyError}</p>
              </div>
            ) : historyData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                No history data yet — snapshots are recorded every ~2 hours, check back soon.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="recorded_at"
                    tickFormatter={t => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}
                    tick={{ fontSize: 11 }}
                    interval={Math.max(0, Math.ceil(historyData.length / 8) - 1)}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={t => new Date(t).toLocaleString()}
                    formatter={v => [v, 'Active Users']}
                  />
                  <Line type="monotone" dataKey="total_users" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* ── Daily peak users (one value per calendar day, by month) ── */}
            <div className="mt-8 pt-6 border-t border-surface-border">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Daily Peak Users</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Highest recorded count each day, for the selected month</p>
                </div>
                <input
                  type="month"
                  value={selectedMonth}
                  max={new Date().toISOString().slice(0, 7)}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-purple"
                />
              </div>

              {dailyPeaksLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-brand-purple" />
                </div>
              ) : dailyPeaksError ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{dailyPeaksError}</p>
                </div>
              ) : dailyPeaksData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-16">No data recorded for this month yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyPeaksData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={dailyPeakDayNumber}
                      tick={{ fontSize: 11 }}
                      interval={Math.max(0, Math.ceil(dailyPeaksData.length / 12) - 1)}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      labelFormatter={dailyPeakFullLabel}
                      formatter={v => [v, 'Peak Users']}
                    />
                    <Bar dataKey="peak_users" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-purple" />
          </div>
        ) : viewMode === 'per-app' ? (
          /* ── Per App view (original) ── */
          <div className="overflow-x-auto">
            <table className="w-full data-table whitespace-nowrap">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Name</th>
                  <th>Protocol</th>
                  <th>IP Address</th>
                  <th>App</th>
                  <th>Type</th>
                  <th>Users</th>
                  <th>Load</th>
                  <th>CPU</th>
                  <th>RAM</th>
                  <th>Ping</th>
                  <th>Peak Users</th>
                  <th>Peak CPU</th>
                  <th>Peak RAM</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center text-gray-400 py-10 text-sm">No servers match filters</td>
                  </tr>
                )}
                {filtered.map((s, i) => {
                  const loadPct = s.max_capacity > 0
                    ? Math.round((s.current_users || 0) / s.max_capacity * 100)
                    : 0
                  return (
                    <tr key={s.ovpn_id || s.ss_id} className={!s.is_active ? 'opacity-50' : ''}>
                      <td className="text-center font-semibold text-gray-600">{s.display_order || i + 1}</td>
                      <td className="text-sm text-gray-700 font-medium">{s.name}</td>
                      <td>
                        <span className="flex items-center gap-1">
                          {s.has_openvpn     && <ProtocolBadge protocol="openvpn" />}
                          {s.has_shadowsocks && <ProtocolBadge protocol="shadowsocks" />}
                        </span>
                      </td>
                      <td><span className="font-mono text-xs text-gray-600">{s.ip_address}</span></td>
                      <td><span className="text-xs text-gray-500">{s.app_name || '—'}</span></td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          s.server_type === 'premium'
                            ? 'bg-gray-50 border-gray-200 text-gray-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>{s.server_type}</span>
                      </td>
                      <td className="text-sm text-gray-700 text-center font-medium text-brand-purple">
                        {s.current_users || 0}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          loadPct >= 90 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{loadPct}%</span>
                      </td>
                      <td className="text-sm text-gray-700">{s.cpu_usage?.toFixed(1) ?? 0}%</td>
                      <td className="text-sm text-gray-700">{s.ram_usage?.toFixed(1) ?? 0}%</td>
                      <td className="text-sm text-gray-700">{s.ping_latency_ms?.toFixed(0) ?? 0}ms</td>
                      <td className="text-sm text-gray-700">{s.peak_users ?? 0}</td>
                      <td className="text-sm text-gray-700">{s.peak_cpu?.toFixed(1) ?? 0}%</td>
                      <td className="text-sm text-gray-700">{s.peak_ram?.toFixed(1) ?? 0}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Per Server view (grouped by IP) ── */
          <div className="overflow-x-auto">
            <table className="w-full data-table whitespace-nowrap">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Location</th>
                  <th>IP Address</th>
                  <th>Type</th>
                  <th>Protocols</th>
                  {apps.map(a => <th key={a.app_id} className="text-center">{a.name}</th>)}
                  <th>Total Users</th>
                  <th>CPU</th>
                  <th>RAM</th>
                  <th>Ping</th>
                  <th>Peak Users</th>
                  <th>Peak CPU</th>
                  <th>Peak RAM</th>
                </tr>
              </thead>
              <tbody>
                {groupedServers.length === 0 && (
                  <tr>
                    <td colSpan={10 + apps.length} className="text-center text-gray-400 py-10 text-sm">No servers match filters</td>
                  </tr>
                )}
                {groupedServers.map((s, i) => (
                  <tr key={s.key} className={!s.is_active ? 'opacity-50' : ''}>
                    <td className="text-center font-semibold text-gray-600">{s.display_order || i + 1}</td>
                    <td className="text-sm text-gray-700 font-medium">
                      {s.server_city ? `${s.server_city}, ${s.server_country || ''}` : s.name}
                    </td>
                    <td><span className="font-mono text-xs text-gray-600">{s.ip_address}</span></td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        s.server_type === 'premium'
                          ? 'bg-gray-50 border-gray-200 text-gray-700'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>{s.server_type}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {s.has_openvpn     && <ProtocolBadge key='openvpn'     protocol='openvpn' />}
                        {s.has_shadowsocks && <ProtocolBadge key='shadowsocks' protocol='shadowsocks' />}
                      </div>
                    </td>
                    {apps.map(a => (
                      <td key={a.app_id} className="text-center">
                        <span className={`text-sm font-semibold ${(s.appUsers[a.app_id] || 0) > 0 ? 'text-brand-purple' : 'text-gray-300'}`}>
                          {s.appUsers[a.app_id] || 0}
                        </span>
                      </td>
                    ))}
                    <td className="text-center">
                      <span className="text-sm font-bold text-gray-800">{s.totalUsers}</span>
                    </td>
                    <td className="text-sm text-gray-700">{s.cpu_usage?.toFixed(1) ?? 0}%</td>
                    <td className="text-sm text-gray-700">{s.ram_usage?.toFixed(1) ?? 0}%</td>
                    <td className="text-sm text-gray-700">{s.ping_latency_ms?.toFixed(0) ?? 0}ms</td>
                    <td className="text-sm text-gray-700">{s.peak_users ?? 0}</td>
                    <td className="text-sm text-gray-700">{s.peak_cpu?.toFixed(1) ?? 0}%</td>
                    <td className="text-sm text-gray-700">{s.peak_ram?.toFixed(1) ?? 0}%</td>
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