/**
 * AppManagement.jsx — integrated with backend
 *
 * Replaces all mockData with real API calls via appsApi.
 * Place at: src/pages/AppManagement.jsx  (same location as before)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Smartphone, Users, Activity, Settings, BarChart2, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { appsApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Add Application Modal ────────────────────────────────────────────────────
function AddAppModal({ open, onClose, onAdd }) {
  const [name, setName]       = useState('')
  const [appId, setAppId]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleNameChange(val) {
    setName(val)
    setAppId('app_' + val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !appId.trim()) return
    setLoading(true)
    setError('')
    try {
      const created = await appsApi.create({ name: name.trim(), app_id: appId.trim() })
      onAdd(created)
      setName('')
      setAppId('')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Application"
      subtitle="Register a new VPN application tenant in the system.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <div>
          <label className="form-label">Application Name</label>
          <input className="form-input" placeholder="e.g. SuperFast VPN"
            value={name} onChange={e => handleNameChange(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className="form-label">App ID (Unique Identifier)</label>
          <input className="form-input font-mono text-sm" placeholder="e.g. app_superfast_vpn"
            value={appId} onChange={e => setAppId(e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Creating…' : 'Create Application'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Analytics Modal ──────────────────────────────────────────────────────────
function AnalyticsModal({ open, onClose, app }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!open || !app) return
    setLoading(true)
    setError('')
    setData(null)
    appsApi.analytics(app.app_id)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, app])

  if (!app) return null

  const ovpnPct = data
    ? data.total_servers > 0
      ? Math.round((data.openvpn_servers / data.total_servers) * 100)
      : 0
    : 0
  const ssPct = 100 - ovpnPct

  return (
    <Modal open={open} onClose={onClose} title={`Analytics — ${app.name}`}
      subtitle="Real-time performance metrics and usage stats." maxWidth="max-w-xl">

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-purple" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="text-xs font-medium text-blue-500 mb-1">Current Load</p>
              <p className="text-3xl font-bold text-blue-700">{data.current_load_pct}%</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-medium text-emerald-500 mb-1">Active Sessions</p>
              <p className="text-3xl font-bold text-emerald-700">{data.active_sessions.toLocaleString()}</p>
            </div>
          </div>

          {/* Server breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Servers',  value: data.total_servers },
              { label: 'Active Servers', value: data.active_servers },
              { label: 'Total Capacity', value: data.total_capacity.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-gray-50 border border-surface-border p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {/* Protocol distribution */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">
              Protocol Distribution ({data.openvpn_servers} OpenVPN / {data.shadowsocks_servers} Shadowsocks)
            </p>
            <div className="flex rounded-full overflow-hidden h-3 mb-2">
              <div className="bg-indigo-500 h-full transition-all" style={{ width: `${ovpnPct}%` }} />
              <div className="bg-cyan-400 h-full transition-all"   style={{ width: `${ssPct}%` }} />
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                OpenVPN ({ovpnPct}%)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                Shadowsocks ({ssPct}%)
              </span>
            </div>
          </div>
        </>
      )}

      <div className="pt-2">
        <button onClick={onClose} className="btn-primary w-full justify-center">Close</button>
      </div>
    </Modal>
  )
}

// ─── Delete App Modal ────────────────────────────────────────────────────────
function DeleteAppModal({ open, onClose, onConfirm, app, loading }) {
  if (!app) return null
  return (
    <Modal open={open} onClose={onClose} title="Delete Application" subtitle="This action cannot be undone.">
      <p className="text-sm text-gray-600 mb-2">
        Are you sure you want to delete <strong>{app.name}</strong> (<span className="font-mono text-xs">{app.app_id}</span>)?
      </p>
      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
        Servers associated with this app will <strong>not</strong> be deleted — they will remain in the system with their current app reference.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Deleting…' : 'Delete App'}
        </button>
      </div>
    </Modal>
  )
}

// ─── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ app, onAnalytics, onConfigure, onDelete, canWrite }) {
  return (
    <div className="card p-5 hover:shadow-cardHover transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-surface-border">
            <Smartphone size={16} className="text-gray-500" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">{app.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={app.status === 'active' ? 'badge-green' : 'badge-gray'}>{app.status}</span>
          {canWrite && (
            <button onClick={() => onDelete(app)}
              className="text-gray-300 hover:text-red-500 transition-colors" title="Delete app">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between py-2.5 border-b border-surface-border">
        <span className="text-xs text-gray-500">App ID</span>
        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
          {app.app_id}
        </span>
      </div>

      <div className="flex items-center justify-between py-2.5 border-b border-surface-border">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Users size={12} className="text-gray-400" /> Active Users
        </span>
        <span className="text-sm font-bold text-gray-900">{app.active_users.toLocaleString()}</span>
      </div>

      <div className="flex items-center justify-between py-2.5">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Activity size={12} className="text-gray-400" /> Total Servers
        </span>
        <span className="text-sm font-bold text-gray-900">{app.total_servers}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => onConfigure(app)} className="btn-secondary text-xs justify-center gap-1.5">
          <Settings size={13} /> Configure
        </button>
        <button onClick={() => onAnalytics(app)} className="btn-secondary text-xs justify-center gap-1.5">
          <BarChart2 size={13} /> Analytics
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AppManagement() {
  const navigate = useNavigate()
  const { canWrite } = useAuth()
  const [apps,         setApps]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [analyticsApp, setAnalyticsApp] = useState(null)
  const [deleteApp,    setDeleteApp]    = useState(null)
  const [deletingApp,  setDeletingApp]  = useState(false)

  const loadApps = useCallback(() => {
    setLoading(true)
    setError('')
    appsApi.list()
      .then(setApps)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  function handleAppCreated(newApp) {
    setApps(prev => [newApp, ...prev])
  }

  function handleConfigure(app) {
    navigate(`/app-management/${app.app_id}/configure`)
  }

  async function handleDeleteApp() {
    if (!deleteApp) return
    setDeletingApp(true)
    try {
      await appsApi.delete(deleteApp.app_id)
      setApps(prev => prev.filter(a => a.id !== deleteApp.id))
      setDeleteApp(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeletingApp(false)
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage VPN applications and brands</p>
        </div>
        {canWrite && <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={16} /> Add Application
        </button>}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-brand-purple" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to load apps</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
          <button onClick={loadApps} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && apps.length === 0 && (
        <div className="text-center py-20">
          <Smartphone size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No applications yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Application" to register your first VPN app.</p>
        </div>
      )}

      {/* App grid */}
      {!loading && apps.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {apps.map(app => (
            <AppCard key={app.id} app={app}
              onAnalytics={a => setAnalyticsApp(a)}
              onConfigure={handleConfigure}
              onDelete={a => setDeleteApp(a)}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddAppModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAppCreated}
      />
      <AnalyticsModal
        open={!!analyticsApp}
        onClose={() => setAnalyticsApp(null)}
        app={analyticsApp}
      />
      <DeleteAppModal
        open={!!deleteApp}
        onClose={() => setDeleteApp(null)}
        onConfirm={handleDeleteApp}
        app={deleteApp}
        loading={deletingApp}
      />
    </div>
  )
}