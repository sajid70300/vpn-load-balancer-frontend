/**
 * IspIntelligence.jsx — integrated with backend
 * Endpoints:
 *   GET    /admin/policies/isps
 *   POST   /admin/policies/isps
 *   PUT    /admin/policies/isps/:id
 *   DELETE /admin/policies/isps/:id
 *
 * Backend fields: { id, country, asn, protocol, status, bias_score, expiry, notes }
 *
 * Policies are GLOBAL — they apply across all apps and servers.
 * No app_name is required or stored for new policies.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Share2, TrendingUp, TrendingDown, Ban, Info, Edit2, Trash2, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { ispPoliciesApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    preferred: { bg: 'bg-emerald-500', Icon: TrendingUp },
    degraded:  { bg: 'bg-amber-400',   Icon: TrendingDown },
    blocked:   { bg: 'bg-red-500',     Icon: Ban },
  }
  const { bg, Icon } = map[status] || map.preferred
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full ${bg} flex items-center justify-center`}>
        <Icon size={11} className="text-white" />
      </div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white ${bg}`}>
        {status}
      </span>
    </div>
  )
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function PolicyModal({ open, onClose, onSaved, policy }) {
  const isEdit = !!policy

  const [country,   setCountry]   = useState('')
  const [asn,       setAsn]       = useState('')
  const [protocol,  setProtocol]  = useState('openvpn')
  const [status,    setStatus]    = useState('preferred')
  const [biasScore, setBiasScore] = useState(0)
  const [expiry,    setExpiry]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (policy) {
      setCountry(policy.country    || '')
      setAsn(policy.asn            || '')
      setProtocol(policy.protocol  || 'openvpn')
      setStatus(policy.status      || 'preferred')
      setBiasScore(policy.bias_score ?? 0)
      setExpiry(policy.expiry ? policy.expiry.slice(0, 16) : '')
      setNotes(policy.notes        || '')
    } else {
      setCountry(''); setAsn(''); setProtocol('openvpn')
      setStatus('preferred'); setBiasScore(0); setExpiry(''); setNotes('')
    }
    setError('')
  }, [policy, open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!country || !asn) return
    setLoading(true); setError('')
    try {
      if (isEdit) {
        await ispPoliciesApi.update(policy.id, {
          status,
          bias_score: biasScore,
          expiry: expiry || null,
          notes,
        })
      } else {
        await ispPoliciesApi.create({
          country:    country.toUpperCase(),
          asn,
          protocol,
          status,
          bias_score: biasScore,
          expiry:     expiry || null,
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

  const selClass = 'form-input appearance-none'

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? 'Edit ISP Policy' : 'Add ISP Policy'}
      subtitle="Configure global protocol behavior for a specific ISP (ASN)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Country Code</label>
            <input className="form-input uppercase" placeholder="CN"
              value={country} onChange={e => setCountry(e.target.value.toUpperCase())}
              maxLength={10} required disabled={isEdit} />
          </div>
          <div>
            <label className="form-label">ASN</label>
            <input className="form-input" placeholder="AS4134"
              value={asn} onChange={e => setAsn(e.target.value)}
              required disabled={isEdit} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Protocol</label>
            <select className={selClass} value={protocol} onChange={e => setProtocol(e.target.value)} disabled={isEdit}>
              <option value="openvpn">OpenVPN</option>
              <option value="shadowsocks">Shadowsocks</option>
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className={selClass} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="preferred">Preferred</option>
              <option value="degraded">Degraded</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Bias Score</label>
            <input type="number" className="form-input" value={biasScore}
              onChange={e => setBiasScore(Number(e.target.value))}
              placeholder="0" step="0.5" />
          </div>
          <div>
            <label className="form-label">Expiry (optional)</label>
            <input type="datetime-local" className="form-input" value={expiry}
              onChange={e => setExpiry(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea className="form-input resize-none" rows={3} value={notes}
            onChange={e => setNotes(e.target.value)} placeholder="Reason for this policy…" />
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
    <Modal open={open} onClose={onClose} title="Delete ISP Policy" subtitle="This action cannot be undone.">
      <p className="text-sm text-gray-600 mb-5">
        Delete the <strong>{policy.protocol}</strong> policy for ASN <strong>{policy.asn}</strong> in {policy.country}?
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
export default function IspIntelligence() {
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
    ispPoliciesApi.list()
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
      await ispPoliciesApi.delete(deletePolicy.id)
      setPolicies(prev => prev.filter(p => p.id !== deletePolicy.id))
      setDeletePolicy(null)
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  const totalIsps = [...new Set(policies.map(p => p.asn))].length
  const preferred = policies.filter(p => p.status === 'preferred').length
  const degraded  = policies.filter(p => p.status === 'degraded').length
  const blocked   = policies.filter(p => p.status === 'blocked').length

  function formatExpiry(val) {
    if (!val) return 'No expiry'
    return new Date(val).toLocaleDateString()
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ISP Intelligence</h1>
          <p className="text-sm text-gray-400 mt-0.5">Monitor ISP-specific protocol performance</p>
        </div>
        {canWrite && <button onClick={() => { setEditPolicy(null); setShowModal(true) }} className="btn-primary">
          <Plus size={16} /> Add Policy
        </button>}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Total ISPs (ASNs)</p>
          <p className="text-3xl font-bold text-gray-900">{totalIsps}</p>
          <Share2 size={16} className="text-gray-400 mt-2" />
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Preferred Routes</p>
          <p className="text-3xl font-bold text-emerald-500">{preferred}</p>
          <TrendingUp size={16} className="text-emerald-400 mt-2" />
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Degraded Routes</p>
          <p className="text-3xl font-bold text-amber-500">{degraded}</p>
          <TrendingDown size={16} className="text-amber-400 mt-2" />
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-3">Blocked Routes</p>
          <p className="text-3xl font-bold text-red-500">{blocked}</p>
          <Ban size={16} className="text-red-400 mt-2" />
        </div>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={loadPolicies} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden mb-5">
        <div className="px-5 py-3.5 border-b border-surface-border">
          <h3 className="text-sm font-semibold text-gray-800">ISP-Specific Policies</h3>
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
                <th>ASN</th>
                <th>Protocol</th>
                <th>Status</th>
                <th>Expiry</th>
                <th className="text-center">Edit</th>
                <th className="text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-10 text-sm">No ISP policies yet</td></tr>
              )}
              {policies.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-800">{p.country}</td>
                  <td>
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Share2 size={12} className="text-gray-400" />
                      <span className="font-mono text-xs">{p.asn}</span>
                    </span>
                  </td>
                  <td>
                    {p.protocol === 'openvpn'
                      ? <span className="tag-openvpn">{p.protocol}</span>
                      : <span className="tag-shadowsocks">{p.protocol}</span>
                    }
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-sm text-gray-500">{formatExpiry(p.expiry)}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-blue-800">How ISP Intelligence Works</h3>
        </div>
        <ul className="space-y-1.5">
          {[
            'ISP policies are global — they apply across all apps and servers',
            'The system detects when specific ISPs block or throttle certain protocols',
            'Policies can have an expiry date for automatic re-evaluation',
            'This intelligence helps the decision engine route traffic optimally per ISP',
          ].map(n => <li key={n} className="text-sm text-blue-700">• {n}</li>)}
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