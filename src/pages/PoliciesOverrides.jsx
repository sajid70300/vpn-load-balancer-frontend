import React, { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Zap, Shield, Settings, RefreshCw, Info } from 'lucide-react'
import { globalSettingsApi } from '../services/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0
        ${checked ? 'bg-brand-purple' : 'bg-gray-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform
          ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tooltip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={13} className="text-gray-400 cursor-help" />
      {show && (
        <div className="absolute z-50 left-5 -top-1 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ icon, title, titleColor = 'text-gray-900', children }) {
  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-surface-border">
        {icon}
        <h3 className={`text-sm font-semibold ${titleColor}`}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PoliciesOverrides() {
  const { canWrite } = useAuth()
  const [settings, setSettings]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Local editable cooldown values (user types before saving)
  const [cooldownForm, setCooldownForm] = useState({
    softMin: 5, hardMin: 60, failureThreshold: 10,
  })

  // ── Load settings on mount ────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await globalSettingsApi.get()
      setSettings(data)
      setCooldownForm({
        softMin:          Math.round(data.cooldown_soft_seconds / 60),
        hardMin:          Math.round(data.cooldown_hard_seconds / 60),
        failureThreshold: data.failure_rate_threshold,
      })
    } catch (e) {
      setError(e.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Generic save helper ───────────────────────────────────────────────────
  async function save(patch) {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const updated = await globalSettingsApi.update(patch)
      setSettings(updated)
      setSuccessMsg('Settings saved successfully')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) {
      setError(e.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // ── Protocol mode: mutually exclusive (auto / force_openvpn / force_shadowsocks)
  async function handleProtocolModeToggle(mode) {
    if (!settings || settings.protocol_mode === mode) return
    await save({ protocol_mode: mode })
  }

  // ── Emergency: force protocol (toggle — click again to revert to auto) ──
  async function handleForceProtocol(mode) {
    if (!settings) return
    const newMode = settings.protocol_mode === mode ? 'auto' : mode
    await save({ protocol_mode: newMode })
  }

  // ── Enforce country policies ──────────────────────────────────────────────
  async function handleEnforceCountry(val) {
    await save({ enforce_country_policies: val })
  }

  // ── Enforce ISP policies ──────────────────────────────────────────────────
  async function handleEnforceIsp(val) {
    await save({ enforce_isp_policies: val })
  }

  // ── Disable new connections ───────────────────────────────────────────────
  async function handleDisableNewConnections() {
    if (!settings) return
    await save({ disable_new_connections: !settings.disable_new_connections })
  }

  // ── Cooldown form save ────────────────────────────────────────────────────
  async function saveCooldownSettings() {
    await save({
      cooldown_soft_seconds:  cooldownForm.softMin * 60,
      cooldown_hard_seconds:  cooldownForm.hardMin * 60,
      failure_rate_threshold: cooldownForm.failureThreshold,
    })
  }

  // ── Active overrides for summary panel ───────────────────────────────────
  function getActiveOverrides() {
    if (!settings) return []
    const list = []
    if (settings.protocol_mode === 'force_openvpn')
      list.push({ key: 'force_openvpn', label: 'Force OpenVPN — All connections use OpenVPN as primary' })
    if (settings.protocol_mode === 'force_shadowsocks')
      list.push({ key: 'force_shadowsocks', label: 'Force Shadowsocks — All connections use Shadowsocks as primary' })
    if (settings.disable_new_connections)
      list.push({ key: 'disable_new', label: 'New Connections Disabled — Maintenance mode active' })
    if (!settings.enforce_country_policies)
      list.push({ key: 'no_country', label: 'Country Policies Disabled — Engine ignores country preferences' })
    if (!settings.enforce_isp_policies)
      list.push({ key: 'no_isp', label: 'ISP Policies Disabled — Engine ignores ISP/ASN policies' })
    return list
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500 text-sm">
        <RefreshCw size={15} className="animate-spin" /> Loading settings…
      </div>
    )
  }

  const activeOverrides = getActiveOverrides()
  const pm = settings?.protocol_mode ?? 'auto'

  return (
    <div className="p-6 animate-fade-in max-w-3xl">

      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policies & Overrides</h1>
        <p className="text-sm text-gray-400 mt-0.5">Global routing policies and emergency overrides</p>
      </div>

      {/* ── Error / success banners ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 mb-4 flex items-center gap-2">
          <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 mb-4">
          <p className="text-sm text-emerald-700 font-medium">✓ {successMsg}</p>
        </div>
      )}

      {/* ── Critical actions warning ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 mb-6 flex items-start gap-3">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Critical Actions</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Changes affect all future routing decisions immediately. Existing connections remain unaffected.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — Global Protocol Settings
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<Settings size={15} className="text-gray-500" />}
        title="Global Protocol Settings"
      >
        {/* Row 1: Auto Protocol Switching */}
        <ProtocolModeRow
          active={pm === 'auto'}
          disabled={saving || !canWrite}
          label="Auto Protocol Switching"
          desc="Decision engine selects the best protocol automatically based on real-time success/failure metrics, country and ISP policies."
          tooltip="Default mode. The backend scores both OpenVPN and Shadowsocks using historical success rates, latency, and policy biases — then picks the highest scorer as primary and second as fallback."
          onClick={() => handleProtocolModeToggle('auto')}
        />

        {/* Row 2: Force OpenVPN Globally */}
        <ProtocolModeRow
          active={pm === 'force_openvpn'}
          disabled={saving || !canWrite}
          label="Enable OpenVPN Globally"
          desc="Force OpenVPN as the primary protocol for all connections. Decision engine protocol scoring is bypassed."
          tooltip="Overrides the decision engine. Every best_server response will have OpenVPN as primary regardless of metrics. Useful when Shadowsocks is underperforming system-wide."
          onClick={() => handleProtocolModeToggle('force_openvpn')}
        />

        {/* Row 3: Force Shadowsocks Globally */}
        <ProtocolModeRow
          active={pm === 'force_shadowsocks'}
          disabled={saving || !canWrite}
          label="Enable Shadowsocks Globally"
          desc="Force Shadowsocks as the primary protocol for all connections. Decision engine protocol scoring is bypassed."
          tooltip="Overrides the decision engine. Every best_server response will have Shadowsocks as primary regardless of metrics. Useful in regions where OpenVPN is heavily blocked."
          onClick={() => handleProtocolModeToggle('force_shadowsocks')}
        />

        {/* Row 4: Enforce Country Policies — independent toggle */}
        <div className="flex items-center justify-between py-4 border-t border-surface-border mt-1">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-800">Enforce Country Policies</p>
              <Tooltip text="When enabled, country-level protocol preferences (e.g. prefer Shadowsocks in China) are applied as bias scores in the decision engine. When disabled, the engine ignores all country policies and routes purely on performance metrics." />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Apply country-specific protocol preferences as routing biases</p>
          </div>
          <Toggle
            checked={settings?.enforce_country_policies ?? true}
            onChange={handleEnforceCountry}
            disabled={saving || !canWrite}
          />
        </div>

        {/* Row 5: Enforce ISP Policies — independent toggle */}
        <div className="flex items-center justify-between py-4 border-t border-surface-border">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-800">Enforce ISP Policies</p>
              <Tooltip text="When enabled, ISP/ASN-level protocol policies (e.g. Shadowsocks blocked on China Telecom AS4134) are applied as bias scores in the decision engine. When disabled, the engine ignores all ISP policies regardless of their status (preferred/degraded/blocked)." />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Apply ISP-specific protocol policies (preferred / degraded / blocked) as routing biases</p>
          </div>
          <Toggle
            checked={settings?.enforce_isp_policies ?? true}
            onChange={handleEnforceIsp}
            disabled={saving || !canWrite}
          />
        </div>

        <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-surface-border">
          ⓘ Auto Switching, Enable OpenVPN, and Enable Shadowsocks are mutually exclusive — only one can be active at a time. Enforce Country Policies and Enforce ISP Policies are independent of this group.
        </p>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — Emergency Overrides
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<Zap size={15} className="text-red-500" />}
        title="Emergency Overrides"
        titleColor="text-red-600"
      >
        <div className="space-y-3">
          <EmergencyRow
            active={pm === 'force_openvpn'}
            label="Force All Connections to OpenVPN"
            desc="Override decision engine — use only in emergency. All new connections will use OpenVPN as primary."
            activateLabel="Activate"
            deactivateLabel="Deactivate"
            onToggle={() => handleForceProtocol('force_openvpn')}
            disabled={saving || !canWrite}
          />
          <EmergencyRow
            active={pm === 'force_shadowsocks'}
            label="Force All Connections to Shadowsocks"
            desc="Override decision engine — use only in emergency. All new connections will use Shadowsocks as primary."
            activateLabel="Activate"
            deactivateLabel="Deactivate"
            onToggle={() => handleForceProtocol('force_shadowsocks')}
            disabled={saving || !canWrite}
          />
          <EmergencyRow
            active={settings?.disable_new_connections ?? false}
            label="Disable New Connections"
            desc="Maintenance mode — block all new sessions. Existing connections are not affected."
            activateLabel="Enable"
            deactivateLabel="Disable"
            onToggle={handleDisableNewConnections}
            disabled={saving || !canWrite}
            dangerColor="bg-gray-700 hover:bg-gray-800"
          />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — Cooldown Configuration
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={<Shield size={15} className="text-gray-500" />}
        title="Cooldown Configuration"
      >
        {/* Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-800 leading-relaxed space-y-1.5">
          <p className="font-semibold text-blue-900">How Cooldowns Work</p>
          <p>
            Cooldown is triggered when <strong>both protocols fail</strong> for the same server from a specific country + ASN.
            The server is then excluded from routing for that country/ASN until the cooldown expires.
          </p>
          <div className="space-y-0.5 mt-1">
            <p>① <strong>Both protocols fail (1st time)</strong> → Soft cooldown (server excluded for soft duration)</p>
            <p>② <strong>Both protocols fail again after soft expires</strong> → Hard cooldown (maximum exclusion)</p>
            <p>③ <strong>3+ distinct ASNs from same country fail on same server</strong> → Entire country blocked on that server</p>
            <p>✓ <strong>Cooldown auto-expires</strong> via timer — no manual reset needed</p>
          </div>
          <p className="text-blue-700 italic">While in cooldown, the server is never returned for that country/ASN — clients always receive a healthy server.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Failure Rate Threshold */}
          <div className="col-span-2">
            <label className="form-label flex items-center gap-1.5">
              Failure Rate Threshold (%)
              <Tooltip text="If the failure rate of a server+protocol combination exceeds this percentage, the soft cooldown triggers. Default 10% means: more than 10% of attempts failing will start the cooldown." />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={100}
                value={cooldownForm.failureThreshold}
                onChange={e => setCooldownForm(f => ({ ...f, failureThreshold: Number(e.target.value) }))}
                className="form-input w-32"
                disabled={!canWrite}
              />
              <span className="text-sm text-gray-500">%</span>
              <span className="text-xs text-gray-400 ml-2">
                → cooldown triggers when failure rate &gt; {cooldownForm.failureThreshold}%
              </span>
            </div>
          </div>

          {/* Soft */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              Soft Cooldown
              <Tooltip text="First-level cooldown. Triggered when both protocols fail for a server from a specific country+ASN. After this timer expires and failures persist, escalates to hard cooldown." />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1}
                value={cooldownForm.softMin}
                onChange={e => setCooldownForm(f => ({ ...f, softMin: Number(e.target.value) }))}
                className="form-input flex-1"
                disabled={!canWrite}
              />
              <span className="text-sm text-gray-500 flex-shrink-0">min</span>
            </div>
          </div>

          {/* Hard */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              Hard Cooldown
              <Tooltip text="Maximum cooldown level. Applied when both protocols fail again after soft cooldown expires. Longest exclusion period." />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1}
                value={cooldownForm.hardMin}
                onChange={e => setCooldownForm(f => ({ ...f, hardMin: Number(e.target.value) }))}
                className="form-input flex-1"
                disabled={!canWrite}
              />
              <span className="text-sm text-gray-500 flex-shrink-0">min</span>
            </div>
          </div>
        </div>

        {canWrite && <button
          onClick={saveCooldownSettings}
          disabled={saving}
          className="btn-primary px-5 flex items-center gap-2"
        >
          {saving && <RefreshCw size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Cooldown Settings'}
        </button>}
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — Active Overrides Summary
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-surface-border">
          Active Overrides
        </h3>
        {activeOverrides.length === 0 ? (
          <div className="text-center py-8">
            <Shield size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No active overrides</p>
            <p className="text-xs text-gray-400 mt-1">System running in normal auto mode</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeOverrides.map(o => (
              <div key={o.key} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <span className="text-sm font-medium text-red-700">{o.label}</span>
                <span className="ml-auto text-xs text-red-500 font-medium">Active</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Protocol Mode Row (radio-button style, mutually exclusive) ───────────────
function ProtocolModeRow({ active, disabled, label, desc, tooltip, onClick }) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-surface-border transition-colors
      ${active ? '-mx-5 px-5 bg-purple-50' : ''}`}
    >
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {tooltip && <Tooltip text={tooltip} />}
          {active && (
            <span className="text-xs bg-brand-purple text-white px-2 py-0.5 rounded-full font-medium ml-1">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <Toggle checked={active} onChange={onClick} disabled={disabled} />
    </div>
  )
}

// ─── Emergency Override Row ───────────────────────────────────────────────────
function EmergencyRow({ active, label, desc, activateLabel, deactivateLabel, onToggle, disabled, dangerColor = 'bg-red-500 hover:bg-red-600' }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors
      ${active ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-surface-border'}`}
    >
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-red-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors ml-4 flex-shrink-0
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${active ? 'bg-emerald-500 hover:bg-emerald-600' : dangerColor}`}
      >
        {active ? deactivateLabel : activateLabel}
      </button>
    </div>
  )
}