/**
 * CountryIntelligence.jsx — integrated with backend
 * Endpoints:
 *   GET    /admin/policies/countries
 *   POST   /admin/policies/countries
 *   PUT    /admin/policies/countries/:id
 *   DELETE /admin/policies/countries/:id
 *
 * Backend fields: { id, country, preferred_protocol, fallback_protocol,
 *                   protocol_bias_score, is_active, notes, created_at, updated_at }
 *
 * Policies are GLOBAL — they apply across all apps and servers.
 * No app_name is required or stored for new policies.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Globe, Edit2, Trash2, Info, Loader2, AlertCircle } from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { countryPoliciesApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// Countries with high censorship — used to compute the "censorship" display label
const HIGH_CENSORSHIP = new Set(['CN', 'RU', 'IR', 'KP', 'CU', 'BY', 'VE', 'MM', 'ET'])

function censorshipLevel(code) {
  return HIGH_CENSORSHIP.has(code?.toUpperCase()) ? 'High' : 'Low'
}

// ─── Policy Modal (Add + Edit) ────────────────────────────────────────────────
function PolicyModal({ open, onClose, onSaved, policy }) {
  const isEdit = !!policy

  const [country,    setCountry]    = useState('')
  const [preferred,  setPreferred]  = useState('')
  const [fallback,   setFallback]   = useState('')
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (policy) {
      setCountry(policy.country  || '')
      setPreferred(policy.preferred_protocol  || '')
      setFallback(policy.fallback_protocol    || '')
      setNotes(policy.notes || '')
    } else {
      setCountry(''); setPreferred(''); setFallback(''); setNotes('')
    }
    setError('')
  }, [policy, open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!country || !preferred || !fallback) return
    setLoading(true); setError('')
    try {
      if (isEdit) {
        await countryPoliciesApi.update(policy.id, {
          preferred_protocol: preferred,
          fallback_protocol:  fallback,
          notes,
        })
      } else {
        await countryPoliciesApi.create({
          country:            country.toUpperCase(),
          preferred_protocol: preferred,
          fallback_protocol:  fallback,
          notes,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? 'Edit Country Policy' : 'Create Country Policy'}
      subtitle="Define global protocol preferences for a specific country">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="form-label">Country Code (e.g. CN, RU, US)</label>
          <input className="form-input uppercase" placeholder="CN"
            value={country} onChange={e => setCountry(e.target.value.toUpperCase())}
            maxLength={10} required disabled={isEdit} />
        </div>

        <div>
          <label className="form-label">Preferred Protocol</label>
          <select className="form-input appearance-none" value={preferred}
            onChange={e => setPreferred(e.target.value)} required>
            <option value="">Select protocol</option>
            <option value="openvpn">OpenVPN</option>
            <option value="shadowsocks">Shadowsocks</option>
          </select>
        </div>

        <div>
          <label className="form-label">Fallback Protocol</label>
          <select className="form-input appearance-none" value={fallback}
            onChange={e => setFallback(e.target.value)} required>
            <option value="">Select protocol</option>
            <option value="openvpn">OpenVPN</option>
            <option value="shadowsocks">Shadowsocks</option>
          </select>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Add context about this policy..." className="form-input resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Policy'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, policy, loading }) {
  if (!policy) return null
  return (
    <Modal open={open} onClose={onClose} title="Delete Policy" subtitle="This action cannot be undone.">
      <p className="text-sm text-gray-600 mb-5">
        Delete the global policy for country <strong>{policy.country}</strong>?
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CountryIntelligence() {
  const { canWrite } = useAuth()
  const [policies,     setPolicies]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editPolicy,   setEditPolicy]   = useState(null)
  const [deletePolicy, setDeletePolicy] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const loadPolicies = useCallback(() => {
    setLoading(true); setError('')
    countryPoliciesApi.list()
      .then(data => setPolicies(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  async function handleDelete() {
    if (!deletePolicy) return
    setDeleting(true)
    try {
      await countryPoliciesApi.delete(deletePolicy.id)
      setPolicies(prev => prev.filter(p => p.id !== deletePolicy.id))
      setDeletePolicy(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const ssPref   = policies.filter(p => p.preferred_protocol === 'shadowsocks').length
  const ovpnPref = policies.filter(p => p.preferred_protocol === 'openvpn').length

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Country Intelligence</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage country-specific protocol policies</p>
        </div>
        {canWrite && <button onClick={() => { setEditPolicy(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Add Policy
        </button>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Total Countries</p>
          <p className="text-3xl font-bold text-gray-900">{policies.length}</p>
          <Globe size={16} className="text-gray-400 mt-2" />
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">Shadowsocks Preferred</p>
          <p className="text-3xl font-bold text-gray-900">{ssPref}</p>
          <span className="badge-yellow mt-2 inline-block">High Censorship</span>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">OpenVPN Preferred</p>
          <p className="text-3xl font-bold text-gray-900">{ovpnPref}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-900 text-white mt-2">Low Censorship</span>
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadPolicies} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">Country Policies</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-brand-purple" />
          </div>
        ) : (
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Censorship</th>
                <th>Preferred</th>
                <th>Fallback</th>
                <th>Notes</th>
                <th className="text-center">Edit</th>
                <th className="text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-10 text-sm">No policies yet</td></tr>
              )}
              {policies.map(p => {
                const censorship = censorshipLevel(p.country)
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <Globe size={14} className="text-gray-400" /> {p.country}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        censorship === 'High' ? 'bg-red-100 text-red-700' : 'bg-gray-900 text-white'
                      }`}>{censorship}</span>
                    </td>
                    <td>
                      <span className={p.preferred_protocol === 'openvpn' ? 'tag-openvpn' : 'tag-shadowsocks'}>
                        {p.preferred_protocol}
                      </span>
                    </td>
                    <td>
                      <span className={p.fallback_protocol === 'openvpn' ? 'tag-openvpn' : 'tag-shadowsocks'}>
                        {p.fallback_protocol}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500 max-w-xs">{p.notes || '—'}</td>
                    <td className="text-center">
                      {canWrite && <button onClick={() => { setEditPolicy(p); setShowModal(true) }}
                        className="mx-auto block text-gray-400 hover:text-brand-purple transition-colors">
                        <Edit2 size={15} />
                      </button>}
                    </td>
                    <td className="text-center">
                      {canWrite && <button onClick={() => setDeletePolicy(p)}
                        className="mx-auto block text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Important Notes</span>
        </div>
        <ul className="space-y-1.5 text-sm text-amber-700">
          <li>• Country policies are global — they apply across all apps and servers</li>
          <li>• Policies are biases, not hard rules — the decision engine weighs them alongside real-time metrics</li>
          <li>• Changes affect future connections only, not existing sessions</li>
          <li>• High censorship countries typically benefit from Shadowsocks due to its obfuscation capabilities</li>
        </ul>
      </div>

      <PolicyModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditPolicy(null) }}
        onSaved={loadPolicies}
        policy={editPolicy}
      />
      <DeleteModal
        open={!!deletePolicy}
        onClose={() => setDeletePolicy(null)}
        onConfirm={handleDelete}
        policy={deletePolicy}
        loading={deleting}
      />
    </div>
  )
}