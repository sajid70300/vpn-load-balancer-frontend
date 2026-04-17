import React from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts'
import {
  Server, Zap, TrendingUp, Clock, AlertTriangle, Info
} from 'lucide-react'
import StatCard from '../components/ui/StatCard.jsx'
import {
  mockStats, protocolDistribution, serverLoadData,
  successRateData, recentAlerts
} from '../data/mockData.js'

// ─── Custom Tooltip for Line Chart ───────────────────────────────────────────
function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

// ─── Custom Tooltip for Bar Chart ────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{label}</p>
      <p className="text-brand-purpleLight">{payload[0].value}% load</p>
    </div>
  )
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, outerRadius, name, value }) {
  const RADIAN = Math.PI / 180
  const r = outerRadius + 28
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const color = name === 'OpenVPN' ? '#6366f1' : '#22d3ee'
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      fontSize={11} fontWeight={500} fill={color}>
      {name}: {value}%
    </text>
  )
}

export default function HomeOverview() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Real-time monitoring and system health</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Servers"
          value={mockStats.activeServers}
          subtitle={`${mockStats.totalServers} total servers`}
          icon={Server}
          progress={(mockStats.activeServers / mockStats.totalServers) * 100}
        />
        <StatCard
          title="Active Sessions"
          value={mockStats.activeSessions}
          subtitle={`${mockStats.sessionCapacityPct}% capacity`}
          icon={Zap}
          progress={mockStats.sessionCapacityPct}
        />
        <StatCard
          title="Success Rate"
          value={`${mockStats.successRate}%`}
          icon={TrendingUp}
          badge={{ label: mockStats.successRateLabel, color: 'green' }}
        />
        <StatCard
          title="Avg Connect Time"
          value={mockStats.avgConnectTime}
          icon={Clock}
          badge={{ label: mockStats.avgConnectTimeLabel, color: 'blue' }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Protocol Distribution Pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Protocol Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={protocolDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                labelLine={true}
                label={<PieLabel />}
              >
                {protocolDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [`${v}%`, n]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8ecf4' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Server Load Bar Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Server Load Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={serverLoadData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" vertical={false} />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 11, fill: '#8b92a5' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#8b92a5' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f4f6fb' }} />
              <Bar dataKey="load" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protocol Success Rate Line Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Protocol Success Rate (24h)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={successRateData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#8b92a5' }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis
              domain={[85, 100]}
              tick={{ fontSize: 10, fill: '#8b92a5' }}
              axisLine={false}
              tickLine={false}
              width={30}
              tickFormatter={v => v}
            />
            <Tooltip content={<CustomLineTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(val) => <span className="text-xs text-gray-600 capitalize">{val}</span>}
              wrapperStyle={{ paddingTop: 12 }}
            />
            <Line
              type="monotone"
              dataKey="openvpn"
              name="OpenVPN"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="shadowsocks"
              name="Shadowsocks"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Alerts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Recent Alerts</h3>
        </div>
        <div className="space-y-3">
          {recentAlerts.map(alert => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              {alert.type === 'warning'
                ? <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                : <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
