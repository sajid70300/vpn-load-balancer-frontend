/**
 * api.js  —  Central API service for VPN Dashboard
 *
 * Place this file at:  src/services/api.js
 */

const BASE_URL = import.meta.env.VITE_API_URL || ''

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function request(path, options = {}) {
  const url   = `${BASE_URL}${path}`
  const token = localStorage.getItem('vpn_token')
  const authHeader = token ? `Bearer ${token}` : `Bearer ${API_KEY}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {}
    throw new Error(detail)
  }

  if (res.status === 204) return null
  return res.json()
}

const get  = (path, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request(`${path}${qs}`)
}
const post = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) })
const put  = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) })
const del  = (path)         => request(path, { method: 'DELETE' })


// ─── Physical Machines (bare infrastructure — Step 1 of 2-step server flow) ───
export const physicalMachinesApi = {
  /**
   * GET /admin/machines/
   * Returns: { total, skip, limit, machines: [...] }
   * Each machine has: id, name, ip_address, server_type, server_city,
   *   server_country, flag_image_url, max_capacity, monitoring_api_url,
   *   is_active, created_at, updated_at, finalized_apps: string[]
   */
  list: (params) => get('/admin/machines/', params),

  /** GET /admin/machines/:id */
  get: (id) => get(`/admin/machines/${id}`),

  /**
   * POST /admin/machines/
   * Required: name, ip_address
   * Optional: server_type, server_city, server_country, flag_image_url,
   *           max_capacity, monitoring_api_url, is_active
   */
  create: (payload) => post('/admin/machines/', payload),

  /** PUT /admin/machines/:id — all fields optional */
  update: (id, payload) => put(`/admin/machines/${id}`, payload),

  /** DELETE /admin/machines/:id — also cascades all linked VPNServer rows */
  delete: (id) => del(`/admin/machines/${id}`),

  /** POST /admin/machines/:id/toggle-active */
  toggleActive: (id) => post(`/admin/machines/${id}/toggle-active`),
}


// ─── Physical Servers (unified OpenVPN + Shadowsocks) ─────────────────────────
export const serversApi = {
  /**
   * GET /admin/servers/
   * params: { skip, limit, search, server_type, app_name, is_active }
   * Returns: { total, skip, limit, servers: [...] }
   *
   * Each server object has:
   *   ovpn_id, ss_id              — DB row IDs for each protocol
   *   has_openvpn, has_shadowsocks — booleans
   *   current_users               — combined session count (both protocols)
   *   max_capacity                — shared cap for the physical machine
   *   management_port, ovpn_base64, config_tag, cn_match  — OpenVPN fields
   *   ss_port, ss_password, ss_encryption                 — Shadowsocks fields
   *   Shared: name, ip_address, app_name, server_type, server_city,
   *           server_country, flag_image_url, is_priority_group,
   *           monitoring_api_url, is_active, cpu_usage, ram_usage,
   *           ping_latency_ms, load_score
   */
  list: (params) => get('/admin/servers/', params),

  /** GET /admin/servers/:id — get by either protocol row ID */
  get: (id) => get(`/admin/servers/${id}`),

  /**
   * POST /admin/servers/
   * JSON body — PhysicalServerCreate:
   *   Required: name, ip_address, app_name, ss_password
   *   Optional: server_type, server_city, server_country, flag_image_url,
   *             max_capacity, is_priority_group, monitoring_api_url, is_active,
   *             management_port, ovpn_base64, config_tag, cn_match,
   *             ss_port, ss_encryption
   * Creates BOTH an OpenVPN row and a Shadowsocks row atomically.
   */
  create: (payload) => post('/admin/servers/', payload),

  /**
   * PUT /admin/servers/:id  (JSON body, all fields optional)
   * Shared fields written to both rows; protocol fields to relevant row only.
   */
  update: (id, payload) => put(`/admin/servers/${id}`, payload),

  /** DELETE /admin/servers/:id — deletes both protocol rows + all sessions */
  delete: (id) => del(`/admin/servers/${id}`),

  /** POST /admin/servers/:id/toggle-active — toggles is_active on both rows */
  toggleActive: (id) => post(`/admin/servers/${id}/toggle-active`),

  /** POST /admin/servers/:id/reset-peaks */
  resetPeaks: (id) => post(`/admin/servers/${id}/reset-peaks`),
}


// ─── App Management ───────────────────────────────────────────────────────────
export const appsApi = {
  /** GET /admin/apps/ */
  list: () => get('/admin/apps/'),

  /** GET /admin/apps/:appId */
  get: (appId) => get(`/admin/apps/${appId}`),

  /** POST /admin/apps/ — { name, app_id } */
  create: (payload) => post('/admin/apps/', payload),

  /** PUT /admin/apps/:appId — { name?, status? } */
  update: (appId, payload) => put(`/admin/apps/${appId}`, payload),

  /** DELETE /admin/apps/:appId */
  delete: (appId) => del(`/admin/apps/${appId}`),

  /** GET /admin/apps/:appId/analytics */
  analytics: (appId) => get(`/admin/apps/${appId}/analytics`),

  /**
   * GET /admin/apps/:appId/servers
   * Finalized VPNServer entries for this app (grouped by physical machine).
   * Returns: { app_id, servers: [...], total }
   * Each server has: ovpn_id, ss_id, physical_machine_id, name, ip_address,
   *   server_type, server_city, is_active, is_priority_group, current_users,
   *   max_capacity, has_openvpn, has_shadowsocks, management_port, ovpn_base64,
   *   config_tag, cn_match, ss_port, ss_password, ss_encryption + metrics
   */
  listServers: (appId) => get(`/admin/apps/${appId}/servers`),

  /**
   * POST /admin/apps/:appId/servers/finalize
   * Finalizes a PhysicalMachine for this app — creates or updates the two
   * VPNServer rows (openvpn + shadowsocks) with the supplied protocol config.
   * Body: { machine_id, is_priority_group, management_port, ovpn_base64,
   *         config_tag, cn_match, ss_port, ss_password, ss_encryption }
   */
  finalizeServer: (appId, payload) =>
    post(`/admin/apps/${appId}/servers/finalize`, payload),

  /**
   * DELETE /admin/apps/:appId/servers/:ovpnId
   * Removes the finalized VPNServer rows for this machine+app.
   * The PhysicalMachine record is kept — it stays available for other apps.
   */
  removeServer: (appId, ovpnId) =>
    del(`/admin/apps/${appId}/servers/${ovpnId}`),
}


// ─── Live Sessions ────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: (params) => get('/all_users/', params),
  load: (params) => get('/servers_load/', params),
}


// ─── Protocol Metrics ────────────────────────────────────────────────────────
export const metricsApi = {
  summary:          (params) => get('/admin/metrics/summary', params),
  protocols:        (params) => get('/admin/metrics/protocols', params),
  protocolsByCountry: (params) => get('/admin/metrics/protocols/by-country', params),
  resetCooldown:    (id)     => post(`/admin/metrics/${id}/reset-cooldown`),
}


// ─── Country Policies ─────────────────────────────────────────────────────────
export const countryPoliciesApi = {
  list:   (params)      => get('/admin/policies/countries', params),
  create: (payload)     => post('/admin/policies/countries', payload),
  update: (id, payload) => put(`/admin/policies/countries/${id}`, payload),
  delete: (id)          => del(`/admin/policies/countries/${id}`),
}


// ─── ISP Policies ─────────────────────────────────────────────────────────────
export const ispPoliciesApi = {
  list:   (params)      => get('/admin/policies/isps', params),
  create: (payload)     => post('/admin/policies/isps', payload),
  update: (id, payload) => put(`/admin/policies/isps/${id}`, payload),
  delete: (id)          => del(`/admin/policies/isps/${id}`),
}


// ─── Global Settings ─────────────────────────────────────────────────────────
export const globalSettingsApi = {
  get:    ()        => get('/admin/settings/'),
  update: (payload) => put('/admin/settings/', payload),
}


// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsApi = {
  summary: () => get('/admin/stats/summary'),
  apps:    () => get('/admin/stats/apps'),
}


// ─── Auth & User Management ─────────────────────────────────────────────────
export const authApi = {
  register:    (payload)  => post('/auth/register', payload),
  login:       (payload)  => post('/auth/login', payload),
  me:          ()         => get('/auth/me'),
  listUsers:   ()         => get('/auth/users'),
  listPending: ()         => get('/auth/users/pending'),
  approve:     (id)       => put(`/auth/users/${id}/approve`, {}),
  reject:      (id)       => put(`/auth/users/${id}/reject`, {}),
  updateRole:  (id, role) => put(`/auth/users/${id}/role`, { role }),
  deleteUser:  (id)       => del(`/auth/users/${id}`),
}


// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditApi = {
  logs:    (params) => get('/admin/audit/logs', params),
  summary: ()       => get('/admin/audit/logs/summary'),
}


// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  /**
   * GET /admin/notifications/
   * params: { unread_only?: bool, limit?: int }
   * Returns: { unread_count, notifications: [...] }
   * Each notification: { id, type, server_id, server_name, server_ip,
   *   app_name, message, is_read, created_at }
   */
  list: (params) => get('/admin/notifications/', params),

  /** POST /admin/notifications/mark-all-read */
  markAllRead: () => post('/admin/notifications/mark-all-read'),

  /** POST /admin/notifications/:id/mark-read */
  markRead: (id) => post(`/admin/notifications/${id}/mark-read`),
}