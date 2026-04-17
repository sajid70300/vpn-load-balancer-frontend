import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, FileText, ChevronDown, RefreshCw, Loader2, Server, Settings, Globe, Smartphone, Users } from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { auditApi } from '../services/api.js'

function LogDetailModal({ open, onClose, log }) {
  if (!log) return null
  return (
    <Modal open={open} onClose={onClose} title="Log Details" subtitle="Complete metadata for this event">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">User:</span> <span className="font-medium text-gray-800">{log.user_email}</span></div>
          <div><span className="text-gray-500">Role:</span> <span className="font-medium text-gray-800">{log.user_role}</span></div>
          <div><span className="text-gray-500">Action:</span> <span className="font-medium text-gray-800">{log.action}</span></div>
          <div><span className="text-gray-500">Resource:</span> <span className="font-medium text-gray-800">{log.resource_type}</span></div>
          {log.resource_id && <div><span className="text-gray-500">Resource ID:</span> <span className="font-mono text-gray-800">{log.resource_id}</span></div>}
          {log.app_name && <div><span className="text-gray-500">App:</span> <span className="font-medium text-gray-800">{log.app_name}</span></div>}
        </div>
        {log.details && (
          <div className="rounded-lg bg-gray-50 border border-surface-border p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Details</p>
            <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ActionTag({ action }) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold'
  const color = action.includes('delete') ? `${base} bg-red-100 text-red-700`
    : action.includes('create') ? `${base} bg-green-100 text-green-700`
    : action.includes('update') || action.includes('toggle') ? `${base} bg-blue-100 text-blue-700`
    : action.includes('settings') ? `${base} bg-purple-100 text-purple-700`
    : `${base} bg-gray-200 text-gray-700`
  return <span className={color}>{action}</span>
}

function ResourceTag({ type }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border'
  const map = {
    server: `${base} bg-blue-50 text-blue-700 border-blue-200`,
    app: `${base} bg-purple-50 text-purple-700 border-purple-200`,
    policy: `${base} bg-amber-50 text-amber-700 border-amber-200`,
    settings: `${base} bg-gray-100 text-gray-700 border-gray-200`,
    metric: `${base} bg-cyan-50 text-cyan-700 border-cyan-200`,
    user: `${base} bg-green-50 text-green-700 border-green-200`,
  }
  return <span className={map[type] || `${base} bg-gray-100 text-gray-600 border-gray-200`}>{type}</span>
}

export default function LogsEvents() {
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [actionTypes, setActionTypes] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { skip: page * pageSize, limit: pageSize }
      if (actionFilter) params.action = actionFilter
      if (resourceFilter) params.resource_type = resourceFilter

      const [logsData, summaryData] = await Promise.all([
        auditApi.logs(params),
        auditApi.summary(),
      ])
      setLogs(logsData.logs || [])
      setSummary(summaryData)
      setActionTypes(summaryData.action_types || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, resourceFilter])

  useEffect(() => { loadData() }, [loadData])

  const filtered = logs.filter(log => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.user_email || '').toLowerCase().includes(q) ||
      (log.resource_id || '').toLowerCase().includes(q) ||
      (log.app_name || '').toLowerCase().includes(q)
    )
  })

  function formatTime(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString()
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs &amp; Events</h1>
          <p className="text-sm text-gray-400 mt-0.5">Audit trail — every change is recorded</p>
        </div>
        <button onClick={loadData} disabled={loading} className="btn-secondary gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <div className="card p-5">
            <p className="text-sm text-gray-500 mb-2">Total Events</p>
            <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
            <FileText size={16} className="text-gray-400 mt-2" />
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500 mb-2">Server Actions</p>
            <p className="text-3xl font-bold text-gray-900">{summary.server_actions}</p>
            <Server size={16} className="text-blue-500 mt-2" />
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500 mb-2">Policy Changes</p>
            <p className="text-3xl font-bold text-gray-900">{summary.policy_changes}</p>
            <Globe size={16} className="text-amber-500 mt-2" />
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500 mb-2">Settings Changes</p>
            <p className="text-3xl font-bold text-gray-900">{summary.settings_changes}</p>
            <Settings size={16} className="text-purple-500 mt-2" />
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-500 mb-2">App Actions</p>
            <p className="text-3xl font-bold text-gray-900">{summary.app_actions}</p>
            <Smartphone size={16} className="text-green-500 mt-2" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Events</h3>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by action, user, resource, or app..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple" />
          </div>
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0) }}
              className="pl-8 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-purple w-56">
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={resourceFilter} onChange={e => { setResourceFilter(e.target.value); setPage(0) }}
              className="px-3 py-2 text-sm border border-surface-border rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-purple w-40 pr-8">
              <option value="">All Resources</option>
              <option value="server">Server</option>
              <option value="app">App</option>
              <option value="policy">Policy</option>
              <option value="settings">Settings</option>
              <option value="metric">Metric</option>
              <option value="user">User</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Audit Log</h3>
          {summary && summary.total > pageSize && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <span>Page {page + 1} of {Math.ceil(summary.total / pageSize)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= summary.total}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading audit logs…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Resource ID</th>
                  <th>App</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                    <td>
                      <div>
                        <span className="text-sm font-medium text-gray-800">{log.user_email}</span>
                        {log.user_role && <span className="ml-1.5 text-xs text-gray-400">({log.user_role})</span>}
                      </div>
                    </td>
                    <td><ActionTag action={log.action} /></td>
                    <td><ResourceTag type={log.resource_type} /></td>
                    <td><span className="font-mono text-xs text-gray-600">{log.resource_id || '—'}</span></td>
                    <td>
                      {log.app_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-200">{log.app_name}</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                    <td>
                      {log.details
                        ? <button onClick={() => setSelectedLog(log)} className="text-sm font-medium text-brand-purple hover:text-brand-purpleHover transition-colors">View</button>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-10 text-sm">
                    {logs.length === 0 ? 'No audit events recorded yet' : 'No events match your filter'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LogDetailModal open={!!selectedLog} onClose={() => setSelectedLog(null)} log={selectedLog} />
    </div>
  )
}