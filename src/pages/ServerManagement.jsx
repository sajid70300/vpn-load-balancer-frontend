/**
 * ServerManagement.jsx
 *
 * Step 1 of the 2-step server flow.
 * Manages BARE physical machines (IP, location, capacity, type).
 * Protocol config is added in AppConfigure (Step 2).
 *
 * Toggle view: "Machines" (bare) vs "Finalized Servers" (active VPN rows per app).
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  MapPin, Tag, Trash2, Flame, ChevronDown, Search, RefreshCw,
  Loader2, AlertCircle, Plus, Edit2, Server, CheckCircle2, List,
} from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { physicalMachinesApi, serversApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

const SERVER_TYPES = ['premium', 'free']

function Field({ label, children, required }) {
  return (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Machine Modal (Add / Edit bare machine) ───────────────────────────────────
function MachineModal({ open, onClose, onSaved, machine }) {
  const isEdit = !!machine

  const empty = {
    name: '', ip_address: '', server_type: 'premium',
    server_city: '', server_country: '', flag_image_url: '',
    max_capacity: 100, monitoring_api_url: '',
  }

  const [form,    setForm]    = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!open) return
    if (machine) {
      setForm({
        name:               machine.name               || '',
        ip_address:         machine.ip_address         || '',
        server_type:        machine.server_type        || 'premium',
        server_city:        machine.server_city        || '',
        server_country:     machine.server_country     || '',
        flag_image_url:     machine.flag_image_url     || '',
        max_capacity:       machine.max_capacity       ?? 100,
        monitoring_api_url: machine.monitoring_api_url || '',
      })
    } else {
      setForm({ ...empty })
    }
    setError('')
  }, [machine, open])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.ip_address.trim()) return
    setLoading(true); setError('')
    const payload = {
      name:        form.name.trim(),
      ip_address:  form.ip_address.trim(),
      server_type: form.server_type,
      max_capacity: form.max_capacity,
    }
    if (form.server_city.trim())        payload.server_city        = form.server_city.trim()
    if (form.server_country.trim())     payload.server_country     = form.server_country.trim()
    if (form.flag_image_url.trim())     payload.flag_image_url     = form.flag_image_url.trim()
    if (form.monitoring_api_url.trim()) payload.monitoring_api_url = form.monitoring_api_url.trim()

    try {
      if (isEdit) {
        await physicalMachinesApi.update(machine.id, payload)
      } else {
        await physicalMachinesApi.create(payload)
      }
      onSaved(); onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selCls = 'form-input appearance-none pr-8'

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? 'Edit Machine' : 'Add Physical Machine'}
      subtitle={isEdit
        ? 'Update machine info. Changes propagate to all finalized server rows.'
        : 'Register a bare physical machine. Protocol config is added per-app in App Management.'}
      maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Machine Name" required>
            <input className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="e.g. US-East-01" required />
          </Field>
          <Field label="IP Address" required>
            <input className="form-input" value={form.ip_address}
              onChange={e => set('ip_address', e.target.value)} placeholder="52.23.145.78" required />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Server Type">
            <div className="relative">
              <select className={selCls} value={form.server_type}
                onChange={e => set('server_type', e.target.value)}>
                {SERVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="City">
            <input className="form-input" value={form.server_city}
              onChange={e => set('server_city', e.target.value)} placeholder="New York" />
          </Field>
          <Field label="Country Code">
            <input className="form-input" value={form.server_country}
              onChange={e => set('server_country', e.target.value)} placeholder="US" maxLength={10} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Capacity">
            <input type="number" className="form-input" value={form.max_capacity}
              onChange={e => set('max_capacity', Number(e.target.value))} min={1} />
          </Field>
          <Field label="Flag Image URL">
            <input className="form-input" value={form.flag_image_url}
              onChange={e => set('flag_image_url', e.target.value)} placeholder="https://…/us.png" />
          </Field>
        </div>

        <Field label="Monitoring API URL">
          <input className="form-input" value={form.monitoring_api_url}
            onChange={e => set('monitoring_api_url', e.target.value)}
            placeholder="http://server-ip:port/stats" />
        </Field>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Machine'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Delete confirm modal ──────────────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, machine, loading }) {
  if (!machine) return null
  return (
    <Modal open={open} onClose={onClose} title="Delete Machine"
      subtitle="This will also delete ALL finalized server rows for this machine across all apps.">
      <p className="text-sm text-gray-600 mb-5">
        Delete <strong>{machine.name}</strong> ({machine.ip_address})?
        {machine.finalized_apps?.length > 0 && (
          <span className="block mt-1 text-amber-600 font-medium">
            ⚠ Currently finalized for: {machine.finalized_apps.join(', ')}
          </span>
        )}
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Load badge (for finalized view) ──────────────────────────────────────────
function LoadBadge({ current, max }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0
  const cls = pct >= 90 ? 'bg-red-100 text-red-700'
            : pct >= 70 ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${cls}`}>
      {pct}%
    </span>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ServerManagement() {
  const { canWrite } = useAuth()

  // View toggle: 'machines' = bare list, 'finalized' = active VPN server rows
  const [view,         setView]         = useState('machines')

  // Machines state
  const [machines,     setMachines]     = useState([])
  const [machLoading,  setMachLoading]  = useState(true)
  const [machError,    setMachError]    = useState('')

  // Finalized servers state
  const [finServers,   setFinServers]   = useState([])
  const [finLoading,   setFinLoading]   = useState(false)
  const [finError,     setFinError]     = useState('')

  // Shared UI state
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)
  const [togglingId,   setTogglingId]   = useState(null)

  const loadMachines = useCallback(() => {
    setMachLoading(true); setMachError('')
    physicalMachinesApi.list()
      .then(data => setMachines(data.machines || []))
      .catch(err => setMachError(err.message))
      .finally(() => setMachLoading(false))
  }, [])

  const loadFinalized = useCallback(() => {
    setFinLoading(true); setFinError('')
    serversApi.list()
      .then(data => setFinServers(data.servers || []))
      .catch(err => setFinError(err.message))
      .finally(() => setFinLoading(false))
  }, [])

  useEffect(() => { loadMachines() }, [loadMachines])

  useEffect(() => {
    if (view === 'finalized') loadFinalized()
  }, [view, loadFinalized])

  // ── Filtered machines ──
  const filteredMachines = machines.filter(m => {
    if (typeFilter !== 'all' && m.server_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (m.name           || '').toLowerCase().includes(q) ||
        (m.ip_address     || '').toLowerCase().includes(q) ||
        (m.server_city    || '').toLowerCase().includes(q) ||
        (m.server_country || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Filtered finalized servers ──
  const filteredFin = finServers.filter(s => {
    if (typeFilter !== 'all' && s.server_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (s.name        || '').toLowerCase().includes(q) ||
        (s.ip_address  || '').toLowerCase().includes(q) ||
        (s.server_city || '').toLowerCase().includes(q) ||
        (s.app_name    || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Stats ──
  const totalMachines  = machines.length
  const activeMachines = machines.filter(m => m.is_active).length
  const totalFinalized = finServers.length

  async function handleToggle(machine) {
    setTogglingId(machine.id)
    try {
      await physicalMachinesApi.toggleActive(machine.id)
      setMachines(prev => prev.map(m =>
        m.id === machine.id ? { ...m, is_active: !m.is_active } : m
      ))
    } catch (err) {
      alert('Toggle failed: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await physicalMachinesApi.delete(deleteTarget.id)
      setMachines(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const selClass = 'appearance-none pl-3 pr-7 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple cursor-pointer'

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Server Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {view === 'machines'
              ? 'Bare physical machines — registered infrastructure, no protocol config yet'
              : 'Finalized servers — VPN protocol rows active across apps'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => view === 'machines' ? loadMachines() : loadFinalized()}
            disabled={view === 'machines' ? machLoading : finLoading}
            className="btn-secondary gap-2 text-sm">
            <RefreshCw size={14} className={(view === 'machines' ? machLoading : finLoading) ? 'animate-spin' : ''} />
            Refresh
          </button>
          {canWrite && view === 'machines' && (
            <button onClick={() => { setEditTarget(null); setModalOpen(true) }}
              className="btn-primary gap-2 text-sm">
              <Plus size={14} /> Add Machine
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Physical Machines</p>
          <p className="text-3xl font-bold text-gray-900">{totalMachines}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Active Machines</p>
          <p className="text-3xl font-bold text-emerald-500">{activeMachines}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Inactive Machines</p>
          <p className="text-3xl font-bold text-red-500">{totalMachines - activeMachines}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Finalized Server Rows</p>
          <p className="text-3xl font-bold text-indigo-500">{totalFinalized}</p>
        </div>
      </div>

      {/* View toggle + Filters */}
      <div className="card px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
        {/* Toggle */}
        <div className="flex items-center rounded-lg border border-surface-border overflow-hidden text-sm flex-shrink-0">
          <button
            onClick={() => setView('machines')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              view === 'machines'
                ? 'bg-brand-purple text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            <Server size={13} /> Machines
          </button>
          <button
            onClick={() => setView('finalized')}
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
              view === 'finalized'
                ? 'bg-brand-purple text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            <CheckCircle2 size={13} /> Finalized
          </button>
        </div>

        <div className="w-px h-5 bg-surface-border flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={view === 'machines' ? 'Search name, IP, city…' : 'Search name, IP, city, app…'}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple" />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selClass}>
            <option value="all">All Types</option>
            <option value="premium">Premium</option>
            <option value="free">Free</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">
          {view === 'machines'
            ? `${filteredMachines.length} of ${totalMachines} machines`
            : `${filteredFin.length} of ${totalFinalized} finalized`}
        </span>
      </div>

      {/* ── MACHINES TABLE ── */}
      {view === 'machines' && (
        <div className="card overflow-hidden">
          {machLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-purple" />
            </div>
          )}
          {machError && !machLoading && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border-b border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-sm text-red-600">{machError}</p>
              <button onClick={loadMachines} className="ml-auto text-sm text-red-600 underline">Retry</button>
            </div>
          )}
          {!machLoading && (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Finalized For</th>
                    {canWrite && <th className="text-center">Toggle</th>}
                    {canWrite && <th className="text-center">Edit</th>}
                    {canWrite && <th className="text-center">Delete</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.length === 0 && (
                    <tr>
                      <td colSpan={canWrite ? 10 : 7} className="text-center text-gray-400 py-10 text-sm">
                        <Server size={24} className="mx-auto mb-2 text-gray-300" />
                        No machines found. {canWrite && 'Click "Add Machine" to register one.'}
                      </td>
                    </tr>
                  )}
                  {filteredMachines.map(m => {
                    const isToggling = togglingId === m.id
                    return (
                      <tr key={m.id} className={!m.is_active ? 'opacity-50' : ''}>
                        <td>
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <span className={`w-2 h-2 rounded-full ${m.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td><span className="text-sm font-medium text-gray-800">{m.name}</span></td>
                        <td><span className="font-mono text-xs text-gray-600">{m.ip_address}</span></td>
                        <td>
                          {m.server_city
                            ? <span className="flex items-center gap-1.5 text-sm text-gray-700">
                                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                {m.server_city}{m.server_country ? `, ${m.server_country}` : ''}
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            m.server_type === 'premium'
                              ? 'bg-gray-50 border-gray-200 text-gray-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>{m.server_type}</span>
                        </td>
                        <td><span className="text-sm text-gray-700">{m.max_capacity}</span></td>
                        <td>
                          {m.finalized_apps?.length > 0
                            ? <span className="flex flex-wrap gap-1">
                                {m.finalized_apps.map(a => (
                                  <span key={a} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-indigo-50 border border-indigo-200 text-indigo-700">
                                    {a}
                                  </span>
                                ))}
                              </span>
                            : <span className="text-xs text-gray-400 italic">Not finalized yet</span>}
                        </td>
                        {canWrite && (
                          <td className="text-center">
                            <button onClick={() => handleToggle(m)} disabled={isToggling}
                              className={`mx-auto block transition-colors ${
                                isToggling    ? 'text-gray-300 cursor-wait'
                                : m.is_active ? 'text-red-400 hover:text-red-600'
                                :               'text-gray-300 hover:text-emerald-500'
                              }`}>
                              {isToggling ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
                            </button>
                          </td>
                        )}
                        {canWrite && (
                          <td className="text-center">
                            <button onClick={() => { setEditTarget(m); setModalOpen(true) }}
                              className="mx-auto block text-gray-400 hover:text-brand-purple transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        )}
                        {canWrite && (
                          <td className="text-center">
                            <button onClick={() => setDeleteTarget(m)}
                              className="mx-auto block text-red-400 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FINALIZED SERVERS TABLE ── */}
      {view === 'finalized' && (
        <div className="card overflow-hidden">
          {finLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-purple" />
            </div>
          )}
          {finError && !finLoading && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border-b border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-sm text-red-600">{finError}</p>
              <button onClick={loadFinalized} className="ml-auto text-sm text-red-600 underline">Retry</button>
            </div>
          )}
          {!finLoading && (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>App</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFin.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-10 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-gray-300" />
                        No finalized servers yet. Go to App Management → Configure to finalize machines.
                      </td>
                    </tr>
                  )}
                  {filteredFin.map(s => {
                    const rowId = s.ovpn_id || s.ss_id
                    return (
                      <tr key={rowId} className={!s.is_active ? 'opacity-50' : ''}>
                        <td>
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td><span className="text-sm font-medium text-gray-800">{s.name}</span></td>
                        <td><span className="font-mono text-xs text-gray-600">{s.ip_address}</span></td>
                        <td>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-indigo-50 border border-indigo-200 text-indigo-700">
                            {s.app_name || '—'}
                          </span>
                        </td>
                        <td>
                          {s.server_city
                            ? <span className="flex items-center gap-1.5 text-sm text-gray-700">
                                <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                {s.server_city}{s.server_country ? `, ${s.server_country}` : ''}
                              </span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            s.server_type === 'premium'
                              ? 'bg-gray-50 border-gray-200 text-gray-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>{s.server_type}</span>
                        </td>
                        <td><span className="text-sm text-gray-700">{s.current_users ?? 0} / {s.max_capacity}</span></td>
                        <td><LoadBadge current={s.current_users ?? 0} max={s.max_capacity} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'machines' && (
        <p className="text-xs text-gray-400 mt-3">
          Machines are bare infrastructure records. Go to <strong>App Management → Configure</strong> to finalize a machine for a specific app with its protocol settings.
        </p>
      )}

      <MachineModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSaved={loadMachines}
        machine={editTarget}
      />

      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        machine={deleteTarget}
        loading={deleting}
      />
    </div>
  )
}