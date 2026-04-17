/**
 * AppConfigure.jsx
 *
 * Step 2 of the 2-step server flow.
 * Finalizes PhysicalMachines for this app with per-app protocol config.
 * Each "Finalize" call creates the two VPNServer rows (openvpn + shadowsocks)
 * for that machine+app combination, with this app's specific settings.
 *
 * The same physical machine can be finalized for multiple apps with
 * completely different protocol settings.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, MapPin, Flame, Loader2, AlertCircle,
  Shield, Radio, Trash2, Server, CheckSquare, Square,
  Edit2, ChevronDown, Search, X,
} from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { appsApi, physicalMachinesApi, serversApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

const SS_ENCRYPTIONS = ['aes-256-gcm', 'chacha20-ietf-poly1305', 'aes-128-gcm']

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

// ─── Finalize Server Modal ────────────────────────────────────────────────────
// Shows machine picker + full protocol config form
function FinalizeModal({ open, onClose, onSaved, appId, existingEntry }) {
  const isEdit = !!existingEntry

  const emptyForm = {
    machine_id:        '',
    is_priority_group: false,
    management_port:   7505,
    ovpn_base64:       '',
    config_tag:        '',
    cn_match:          '',
    ss_port:           8388,
    ss_password:       '',
    ss_encryption:     'aes-256-gcm',
  }

  const [form,         setForm]         = useState(emptyForm)
  const [machines,     setMachines]     = useState([])
  const [machLoading,  setMachLoading]  = useState(false)
  const [machSearch,   setMachSearch]   = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  // Load available machines when modal opens
  useEffect(() => {
    if (!open) return
    setMachSearch(''); setError('')
    setMachLoading(true)
    physicalMachinesApi.list({ is_active: true })
      .then(data => setMachines(data.machines || []))
      .catch(() => setMachines([]))
      .finally(() => setMachLoading(false))
  }, [open])

  // Pre-fill form when editing
  useEffect(() => {
    if (!open) return
    if (existingEntry) {
      setForm({
        machine_id:        existingEntry.physical_machine_id || '',
        is_priority_group: existingEntry.is_priority_group   ?? false,
        management_port:   existingEntry.management_port     ?? 7505,
        ovpn_base64:       existingEntry.ovpn_base64         || '',
        config_tag:        existingEntry.config_tag          || '',
        cn_match:          existingEntry.cn_match            || '',
        ss_port:           existingEntry.ss_port             ?? 8388,
        ss_password:       existingEntry.ss_password         || '',
        ss_encryption:     existingEntry.ss_encryption       || 'aes-256-gcm',
      })
    } else {
      setForm({ ...emptyForm })
    }
  }, [existingEntry, open])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  const filteredMachines = machines.filter(m => {
    if (!machSearch) return true
    const q = machSearch.toLowerCase()
    return (
      (m.name        || '').toLowerCase().includes(q) ||
      (m.ip_address  || '').toLowerCase().includes(q) ||
      (m.server_city || '').toLowerCase().includes(q)
    )
  })

  const selectedMachine = machines.find(m => m.id === Number(form.machine_id))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.machine_id)      { setError('Please select a machine.'); return }
    if (!form.ss_password.trim()) { setError('SS Password is required.'); return }
    setLoading(true); setError('')
    const payload = {
      machine_id:        Number(form.machine_id),
      is_priority_group: form.is_priority_group,
      management_port:   form.management_port,
      ss_port:           form.ss_port,
      ss_password:       form.ss_password.trim(),
      ss_encryption:     form.ss_encryption,
    }
    if (form.ovpn_base64.trim()) payload.ovpn_base64 = form.ovpn_base64.trim()
    if (form.config_tag.trim())  payload.config_tag  = form.config_tag.trim()
    if (form.cn_match.trim())    payload.cn_match    = form.cn_match.trim()

    try {
      await appsApi.finalizeServer(appId, payload)
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
      title={isEdit ? 'Edit Server Config' : 'Finalize Server for App'}
      subtitle={isEdit
        ? 'Update protocol config for this machine+app combination.'
        : 'Select a physical machine and configure its protocols for this app.'}
      maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* ── Machine picker ── */}
        {!isEdit ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Machine</p>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" value={machSearch}
                onChange={e => setMachSearch(e.target.value)}
                placeholder="Search by name, IP or city…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
              />
            </div>

            {machLoading && (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-brand-purple" />
              </div>
            )}

            {!machLoading && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto border border-surface-border rounded-xl p-2">
                {filteredMachines.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No active machines found.</p>
                )}
                {filteredMachines.map(m => {
                  const selected = Number(form.machine_id) === m.id
                  return (
                    <button type="button" key={m.id}
                      onClick={() => set('machine_id', m.id)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        selected
                          ? 'border-brand-purple bg-indigo-50'
                          : 'border-surface-border hover:border-brand-purple hover:bg-indigo-50/30'
                      }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                          <span className="font-mono text-xs text-gray-400">{m.ip_address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {m.server_city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin size={10} />{m.server_city}{m.server_country ? `, ${m.server_country}` : ''}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded border ${
                            m.server_type === 'premium'
                              ? 'bg-gray-50 border-gray-200 text-gray-600'
                              : 'bg-blue-50 border-blue-200 text-blue-600'
                          }`}>{m.server_type}</span>
                          <span className="text-gray-400">cap: {m.max_capacity}</span>
                          {m.finalized_apps?.length > 0 && (
                            <span className="text-indigo-500">
                              also in: {m.finalized_apps.filter(a => a !== appId).join(', ') || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                      {selected && (
                        <span className="text-brand-purple font-semibold text-xs">Selected</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {selectedMachine && (
              <p className="text-xs text-emerald-600 font-medium">
                ✓ Selected: {selectedMachine.name} ({selectedMachine.ip_address})
              </p>
            )}
          </div>
        ) : (
          /* Edit mode — show locked machine info */
          <div className="p-3 rounded-xl bg-gray-50 border border-surface-border">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Machine</p>
            <p className="text-sm font-semibold text-gray-800">{existingEntry.name}</p>
            <p className="font-mono text-xs text-gray-500">{existingEntry.ip_address}</p>
          </div>
        )}

        {/* Priority */}
        <div className="flex items-center gap-3 py-1">
          <button type="button" onClick={() => set('is_priority_group', !form.is_priority_group)}>
            {form.is_priority_group
              ? <CheckSquare size={18} className="text-brand-purple" />
              : <Square      size={18} className="text-gray-300" />}
          </button>
          <span className="text-sm text-gray-700">Priority Group</span>
        </div>

        <hr className="border-surface-border" />

        {/* ── OpenVPN section ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={12} /> OpenVPN Configuration
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Management Port">
              <input type="number" className="form-input" value={form.management_port}
                onChange={e => set('management_port', Number(e.target.value))} placeholder="7505" />
            </Field>
            <Field label="Config Tag">
              <input className="form-input" value={form.config_tag}
                onChange={e => set('config_tag', e.target.value)} placeholder="tag-01" />
            </Field>
            <Field label="CN Match">
              <input className="form-input" value={form.cn_match}
                onChange={e => set('cn_match', e.target.value)} placeholder="vpn1.example.com" />
            </Field>
          </div>
          <Field label="OVPN Config (Base64)">
            <textarea rows={3} className="form-input font-mono text-xs resize-none"
              value={form.ovpn_base64}
              onChange={e => set('ovpn_base64', e.target.value)}
              placeholder="Paste base64-encoded .ovpn config here…" />
          </Field>
        </div>

        <hr className="border-surface-border" />

        {/* ── Shadowsocks section ── */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-cyan-500 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={12} /> Shadowsocks Configuration
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="SS Port" required>
              <input type="number" className="form-input" value={form.ss_port}
                onChange={e => set('ss_port', Number(e.target.value))} placeholder="8388" required />
            </Field>
            <Field label="SS Password" required>
              <input className="form-input" value={form.ss_password}
                onChange={e => set('ss_password', e.target.value)} placeholder="Strong password…" required />
            </Field>
            <Field label="Encryption">
              <div className="relative">
                <select className={selCls} value={form.ss_encryption}
                  onChange={e => set('ss_encryption', e.target.value)}>
                  {SS_ENCRYPTIONS.map(enc => <option key={enc} value={enc}>{enc}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Finalize Server'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Remove confirm modal ─────────────────────────────────────────────────────
function RemoveModal({ open, onClose, onConfirm, server, loading }) {
  if (!server) return null
  return (
    <Modal open={open} onClose={onClose} title="Remove Server"
      subtitle="Removes this server from this app only. The physical machine is kept.">
      <p className="text-sm text-gray-600 mb-5">
        Remove <strong>{server.name}</strong> ({server.ip_address}) from this app?
        The VPN protocol rows for this app will be deleted, but the physical machine
        remains available to be finalized for other apps.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className="btn-primary flex-1 justify-center bg-red-600 hover:bg-red-700 gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AppConfigure() {
  const { appId }    = useParams()
  const navigate     = useNavigate()
  const { canWrite } = useAuth()

  const [appName,       setAppName]       = useState(appId)
  const [servers,       setServers]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [showFinalize,  setShowFinalize]  = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)
  const [removeTarget,  setRemoveTarget]  = useState(null)
  const [removing,      setRemoving]      = useState(false)
  const [togglingId,    setTogglingId]    = useState(null)

  useEffect(() => {
    appsApi.get(appId)
      .then(app => setAppName(app.name))
      .catch(() => {})
  }, [appId])

  const loadServers = useCallback(() => {
    setLoading(true); setError('')
    appsApi.listServers(appId)
      .then(data => setServers(data.servers || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [appId])

  useEffect(() => { loadServers() }, [loadServers])

  // Toggle active (operates on VPNServer rows via serversApi)
  async function handleToggleActive(server) {
    const id = server.id
    setTogglingId(id)
    try {
      await serversApi.toggleActive(id)
      setServers(prev => prev.map(s =>
        s.id === id
          ? { ...s, is_active: !s.is_active }
          : s
      ))
    } catch (err) {
      alert('Failed to toggle: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  // Toggle priority
  async function handleTogglePriority(server) {
    const id     = server.id
    const newVal = !server.is_priority_group
    try {
      await serversApi.update(id, { is_priority_group: newVal })
      setServers(prev => prev.map(s =>
        s.id === id
          ? { ...s, is_priority_group: newVal }
          : s
      ))
    } catch (err) {
      alert('Failed to update priority: ' + err.message)
    }
  }

  // Remove finalized server from this app
  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await appsApi.removeServer(appId, removeTarget.id)
      setServers(prev => prev.filter(s => s.id !== removeTarget.id))
      setRemoveTarget(null)
    } catch (err) {
      alert('Failed to remove: ' + err.message)
    } finally {
      setRemoving(false)
    }
  }

  function handleEdit(server) {
    setEditTarget(server)
    setShowFinalize(true)
  }

  function handleModalClose() {
    setShowFinalize(false)
    setEditTarget(null)
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/app-management')}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          </div>
          <p className="text-sm text-gray-400 ml-9">
            Finalized servers for this app — {servers.length} server{servers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => { setEditTarget(null); setShowFinalize(true) }}
            className="btn-primary gap-2 text-sm">
            <Plus size={14} /> Finalize Server
          </button>
        )}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadServers} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Server table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Finalized Servers</h3>
          {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>IP Address</th>
                <th>Protocols</th>
                <th>Config Tag</th>
                <th>City</th>
                <th>Type</th>
                <th>Capacity</th>
                <th className="text-center">Priority</th>
                <th className="text-center">Active</th>
                {canWrite && <th className="text-center">Edit</th>}
                {canWrite && <th className="text-center">Remove</th>}
              </tr>
            </thead>
            <tbody>
              {!loading && servers.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 11 : 9} className="text-center text-gray-400 py-12 text-sm">
                    <Server size={24} className="mx-auto mb-2 text-gray-300" />
                    No servers finalized yet.
                    {canWrite && <> Click <strong>"Finalize Server"</strong> to configure a machine for this app.</>}
                  </td>
                </tr>
              )}
              {servers.map(s => {
                const rowId      = s.id
                const isToggling = togglingId === rowId
                return (
                  <tr key={rowId} className={!s.is_active ? 'opacity-50' : ''}>
                    <td><span className="text-sm font-medium text-gray-800">{s.name}</span></td>
                    <td><span className="font-mono text-xs text-gray-600">{s.ip_address}</span></td>
                    <td>
                      <span className="flex items-center gap-1">
                        {s.has_openvpn     && <span className="tag-openvpn    flex items-center gap-0.5"><Shield size={9}/>ovpn</span>}
                        {s.has_shadowsocks && <span className="tag-shadowsocks flex items-center gap-0.5"><Radio  size={9}/>ss</span>}
                      </span>
                    </td>
                    <td>
                      {s.config_tag
                        ? <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{s.config_tag}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td>
                      {s.server_city
                        ? <span className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin size={12} className="text-gray-400" />{s.server_city}
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
                    {/* Priority */}
                    <td className="text-center">
                      {canWrite ? (
                        <button onClick={() => handleTogglePriority(s)} className="mx-auto block">
                          {s.is_priority_group
                            ? <CheckSquare size={18} className="text-brand-purple" />
                            : <Square      size={18} className="text-gray-300" />}
                        </button>
                      ) : (
                        s.is_priority_group
                          ? <CheckSquare size={18} className="text-brand-purple mx-auto block" />
                          : <Square      size={18} className="text-gray-300 mx-auto block" />
                      )}
                    </td>
                    {/* Active toggle */}
                    <td className="text-center">
                      {canWrite ? (
                        <button onClick={() => handleToggleActive(s)} disabled={isToggling}
                          className={`mx-auto block transition-colors ${
                            isToggling    ? 'text-gray-300 cursor-wait'
                            : s.is_active ? 'text-red-400 hover:text-red-600'
                            :               'text-gray-300 hover:text-emerald-500'
                          }`}>
                          {isToggling ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} />}
                        </button>
                      ) : (
                        <Flame size={18} className={`mx-auto block ${s.is_active ? 'text-emerald-500' : 'text-gray-300'}`} />
                      )}
                    </td>
                    {/* Edit */}
                    {canWrite && (
                      <td className="text-center">
                        <button onClick={() => handleEdit(s)}
                          className="mx-auto block text-gray-400 hover:text-brand-purple transition-colors"
                          title="Edit protocol config">
                          <Edit2 size={16} />
                        </button>
                      </td>
                    )}
                    {/* Remove */}
                    {canWrite && (
                      <td className="text-center">
                        <button onClick={() => setRemoveTarget(s)}
                          className="mx-auto block text-red-400 hover:text-red-600 transition-colors"
                          title="Remove from this app">
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
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Each entry is a physical machine finalized for this app with its own protocol settings.
        Removing a server here does not delete the machine — it can be finalized for other apps.
      </p>

      {/* Finalize / Edit Modal */}
      <FinalizeModal
        open={showFinalize}
        onClose={handleModalClose}
        onSaved={() => { loadServers(); handleModalClose() }}
        appId={appId}
        existingEntry={editTarget}
      />

      {/* Remove confirm */}
      <RemoveModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        server={removeTarget}
        loading={removing}
      />
    </div>
  )
}