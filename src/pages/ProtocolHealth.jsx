/**
 * ProtocolHealth.jsx — integrated with backend
 *
 * Top cards: GET /admin/metrics/summary
 *   Returns: { protocol_stats: [{protocol, success_rate, avg_connect_time_ms,
 *               total_attempts, success_count, failure_count}] }
 *
 * Country table: GET /admin/metrics/protocols (aggregated client-side by country)
 *   The backend returns per-server metrics with a `country` field.
 *   We group by country and average the success_rate per protocol.
 *
 * Date filter: passed as-is to API (backend ignores unknown params gracefully,
 * so we show the filter UI but note it only has effect if backend is extended).
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Shield, TrendingUp, Calendar, Search, Loader2, AlertCircle } from 'lucide-react'
import { metricsApi } from '../services/api.js'

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProtocolHealth() {
  const [summary,       setSummary]       = useState(null)
  const [countryRows,   setCountryRows]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [currentPage,   setCurrentPage]   = useState(1)
  const PAGE_SIZE = 30

  const load = useCallback(() => {
    setLoading(true); setError('')
    Promise.all([
      metricsApi.summary(),
      metricsApi.protocolsByCountry({ min_attempts: 1 }),
    ])
      .then(([sum, byCountry]) => {
        setSummary(sum)
        setCountryRows(byCountry.countries || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Extract per-protocol stats from summary
  const getStats = (protocol) => {
    if (!summary?.protocol_stats) return null
    return summary.protocol_stats.find(s => s.protocol === protocol) || null
  }
  const ovpnStats = getStats('openvpn')
  const ssStats   = getStats('shadowsocks')

  const filtered = countryRows.filter(r =>
    r.country.toLowerCase().includes(countryFilter.toLowerCase())
  )

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(currentPage, totalPages)
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleFilterChange = (e) => {
    setCountryFilter(e.target.value)
    setCurrentPage(1)
  }

  const protocols = [
    { key: 'openvpn',     label: 'OpenVPN',     color: 'text-brand-purple', stats: ovpnStats },
    { key: 'shadowsocks', label: 'Shadowsocks', color: 'text-cyan-500',     stats: ssStats },
  ]

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Protocol Health</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor protocol performance and reliability</p>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={load} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Protocol summary cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-purple" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            {protocols.map(({ key, label, color, stats }) => (
              <div key={key} className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={18} className={color} />
                  <h3 className="text-base font-semibold text-gray-900">{label}</h3>
                </div>
                {stats ? (
                  <div className="space-y-0">
                    {[
                      {
                        label: 'Success Rate',
                        value: (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-gray-900 text-white">
                              {stats.success_rate}%
                            </span>
                            <TrendingUp size={14} className="text-emerald-500" />
                          </div>
                        ),
                      },
                      {
                        label: 'Avg Connect Time',
                        value: <span className="text-sm font-semibold text-gray-900">{(stats.avg_connect_time_ms / 1000).toFixed(2)}s</span>,
                      },
                      {
                        label: 'Total Attempts',
                        value: <span className="text-sm font-semibold text-gray-900">{(stats.total_attempts || 0).toLocaleString()}</span>,
                      },
                      {
                        label: 'Successful',
                        value: <span className="text-sm font-semibold text-emerald-600">{(stats.success_count || 0).toLocaleString()}</span>,
                      },
                      {
                        label: 'Failed',
                        value: <span className="text-sm font-semibold text-red-500">{(stats.failure_count || 0).toLocaleString()}</span>,
                      },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-surface-border last:border-0">
                        <span className="text-sm text-gray-600">{row.label}</span>
                        {row.value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No data yet — metrics are recorded after client connections.</p>
                )}
              </div>
            ))}
          </div>

          {/* Country table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-gray-800">Protocol Performance by Country</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={countryFilter} onChange={handleFilterChange}
                      placeholder="Filter by Country..."
                      className="pl-8 pr-3 py-1.5 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple w-44" />
                  </div>
                </div>
              </div>
            </div>
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="w-16">S.No</th>
                  <th className="text-brand-purple">Country</th>
                  <th className="text-brand-purple">OpenVPN Success Rate</th>
                  <th className="text-brand-purple">Shadowsocks Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-10 text-sm">
                      {countryRows.length === 0
                        ? 'No per-country metrics yet — data populates after client connections with country codes.'
                        : 'No countries match your filter'}
                    </td>
                  </tr>
                )}
                {paginated.map((row, i) => (
                  <tr key={row.country}>
                    <td className="text-gray-500">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="font-semibold text-gray-800">{row.country}</td>
                    <td>
                      {row.openvpn_success_rate != null
                        ? <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            {row.openvpn_success_rate}%
                            <TrendingUp size={13} />
                            <span className="text-xs text-gray-400 font-normal">({row.openvpn_attempts} attempts)</span>
                          </span>
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </td>
                    <td>
                      {row.shadowsocks_success_rate != null
                        ? <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            {row.shadowsocks_success_rate}%
                            <TrendingUp size={13} />
                            <span className="text-xs text-gray-400 font-normal">({row.shadowsocks_attempts} attempts)</span>
                          </span>
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-400">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} countries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-surface-border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 text-xs rounded-lg border ${
                            p === safePage
                              ? 'bg-brand-purple text-white border-brand-purple'
                              : 'border-surface-border bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-surface-border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}