/**
 * SystemSettings.jsx — User Management & System Settings
 *
 * Superadmin: approve/reject pending users, change roles, delete anyone (except self/superadmin)
 * Admin: view users, delete users only
 * User: view-only (this page is hidden for users via sidebar, but protected anyway)
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users, ShieldCheck, Shield, UserCheck, UserX, Trash2, ChevronDown,
  Loader2, AlertCircle, Clock, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react'
import Modal from '../components/ui/Modal.jsx'
import { authApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Role badge ─────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    superadmin: 'bg-purple-100 text-purple-700 border-purple-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    user: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[role] || styles.user}`}>
      {role === 'superadmin' && <ShieldCheck size={11} />}
      {role === 'admin' && <Shield size={11} />}
      {role}
    </span>
  )
}

// ─── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }
  const icons = {
    active: <CheckCircle2 size={11} />,
    pending: <Clock size={11} />,
    rejected: <XCircle size={11} />,
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {icons[status]} {status}
    </span>
  )
}

// ─── Delete confirm modal ───────────────────────────────────────────────────
function DeleteUserModal({ open, onClose, onConfirm, target, loading }) {
  if (!target) return null
  return (
    <Modal open={open} onClose={onClose} title="Delete User" subtitle="This action cannot be undone.">
      <p className="text-sm text-gray-600 mb-5">
        Are you sure you want to delete <strong>{target.name}</strong> ({target.email})?
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

// ─── Role change dropdown ───────────────────────────────────────────────────
function RoleDropdown({ currentRole, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = React.useRef(null)
  const options = ['admin', 'user']

  function handleOpen() {
    if (disabled) return
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(!open)
  }

  return (
    <>
      <button ref={btnRef} onClick={handleOpen} disabled={disabled}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
        {currentRole} <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px]"
            style={{ top: pos.top, left: pos.left }}>
            {options.map(r => (
              <button key={r} onClick={() => { onChange(r); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${r === currentRole ? 'font-semibold text-brand-purple' : 'text-gray-700'}`}>
                {r}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}


export default function SystemSettings() {
  const { user: me, isSuperAdmin, isAdmin } = useAuth()

  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // userId being acted on
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const allUsers = await authApi.listUsers()
      setUsers(allUsers)
      if (isSuperAdmin) {
        const pending = await authApi.listPending()
        setPendingUsers(pending)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Actions ────────────────────────────────────────────────────────────────
  async function handleApprove(id) {
    setActionLoading(id)
    try {
      await authApi.approve(id)
      await fetchData()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  async function handleReject(id) {
    setActionLoading(id)
    try {
      await authApi.reject(id)
      await fetchData()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  async function handleRoleChange(id, newRole) {
    setActionLoading(id)
    try {
      await authApi.updateRole(id, newRole)
      await fetchData()
    } catch (err) { setError(err.message) }
    finally { setActionLoading(null) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await authApi.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      await fetchData()
    } catch (err) { setError(err.message) }
    finally { setDeleteLoading(false) }
  }

  function canDelete(target) {
    if (!me) return false
    if (target.id === me.id) return false
    if (target.role === 'superadmin') return false
    if (isSuperAdmin) return true
    if (isAdmin && target.role === 'user') return true
    return false
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-10 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-surface-border flex items-center justify-center mb-4">
          <Shield size={28} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Access Restricted</h2>
        <p className="text-sm text-gray-400 text-center max-w-xs">
          You do not have permission to access system settings.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} /> System Settings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage users, roles, and registration approvals</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="btn-secondary gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pending Approvals — superadmin only */}
      {isSuperAdmin && pendingUsers.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border bg-amber-50/50">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock size={15} className="text-amber-600" />
              Pending Approvals
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                {pendingUsers.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-surface-border">
            {pendingUsers.map(u => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700">
                    {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(u.id)} disabled={actionLoading === u.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50">
                    {actionLoading === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                    Approve
                  </button>
                  <button onClick={() => handleReject(u.id)} disabled={actionLoading === u.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50">
                    {actionLoading === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserX size={13} />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Users size={15} /> All Users
            <span className="ml-1 text-xs font-normal text-gray-400">({users.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Registered</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Last Login</th>
                  <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'}`}>
                          {u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isSuperAdmin && u.role !== 'superadmin' && u.status === 'active' ? (
                        <RoleDropdown
                          currentRole={u.role}
                          onChange={(r) => handleRoleChange(u.id, r)}
                          disabled={actionLoading === u.id}
                        />
                      ) : (
                        <RoleBadge role={u.role} />
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {canDelete(u) && (
                        <button onClick={() => setDeleteTarget(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                      {u.id === me?.id && (
                        <span className="text-xs text-gray-400 italic">You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteUserModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
        loading={deleteLoading}
      />
    </div>
  )
}