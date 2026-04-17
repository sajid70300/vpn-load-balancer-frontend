import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Download, TrendingUp, Users, Activity, BarChart2, ChevronDown } from 'lucide-react'
import {
  dailyConnections, protocolUsage24h, topCountries, bandwidthData,
  reportStats, userStats, connectionQuality, performanceTrends
} from '../data/mockData.js'

function TT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map(p => <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(0)}</p>)}
    </div>
  )
}

const periods = ['Last 7 days', 'Last 30 days', 'Last 90 days']

export default function ReportsAnalytics() {
  const [period,     setPeriod]     = useState('Last 7 days')
  const [showPeriod, setShowPeriod] = useState(false)

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Comprehensive usage and performance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowPeriod(!showPeriod)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-surface-border rounded-lg bg-white hover:bg-gray-50 font-medium text-gray-700">
              {period} <ChevronDown size={13} className="text-gray-400" />
            </button>
            {showPeriod && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-surface-border rounded-xl shadow-cardHover z-10 py-1 min-w-[140px]">
                {periods.map(p => (
                  <button key={p} onClick={() => { setPeriod(p); setShowPeriod(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${period === p ? 'text-brand-purple font-semibold' : 'text-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary"><Download size={14} /> Export Report</button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">Total Connections</p>
          <p className="text-3xl font-bold text-gray-900">{reportStats.totalConnections}</p>
          <div className="flex items-center gap-1.5 mt-2"><TrendingUp size={13} className="text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">{reportStats.totalConnectionsChange}</span></div>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">Success Rate</p>
          <p className="text-3xl font-bold text-gray-900">{reportStats.successRate}</p>
          <span className="badge-green mt-2 inline-block">{reportStats.successRateLabel}</span>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">Avg Session Duration</p>
          <p className="text-3xl font-bold text-gray-900">{reportStats.avgSessionDuration}</p>
          <p className="text-xs text-gray-400 mt-2">{reportStats.avgSessionNote}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-2">Total Bandwidth</p>
          <p className="text-3xl font-bold text-gray-900">{reportStats.totalBandwidth}</p>
          <p className="text-xs text-gray-400 mt-2">{reportStats.bandwidthNote}</p>
        </div>
      </div>

      {/* Daily connections area chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Daily Connection Attempts</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyConnections} margin={{ top:5, right:10, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/></linearGradient>
              <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
            <XAxis dataKey="day" tick={{ fontSize:10, fill:'#8b92a5' }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize:10, fill:'#8b92a5' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<TT />} />
            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-gray-600">{v}</span>} wrapperStyle={{ paddingTop:12 }} />
            <Area type="monotone" dataKey="total"      name="Total Attempts"        stroke="#6366f1" fill="url(#gT)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="successful" name="Successful Connections" stroke="#22d3ee" fill="url(#gS)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Protocol + Top Countries */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Protocol Usage (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={protocolUsage24h} margin={{ top:5, right:5, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
              <XAxis dataKey="time" tick={{ fontSize:9, fill:'#8b92a5' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize:9, fill:'#8b92a5' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<TT />} />
              <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-xs text-gray-600 capitalize">{v}</span>} wrapperStyle={{ paddingTop:10 }} />
              <Line type="monotone" dataKey="openvpn"     name="OpenVPN"     stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="shadowsocks" name="Shadowsocks" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Countries by Sessions</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topCountries} layout="vertical" margin={{ top:0, right:20, left:10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:9, fill:'#8b92a5' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="country" type="category" tick={{ fontSize:11, fill:'#374151', fontWeight:500 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<TT />} />
              <Bar dataKey="sessions" name="Sessions" fill="#6366f1" radius={[0,4,4,0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bandwidth */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Bandwidth Usage (24h)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={bandwidthData} margin={{ top:5, right:10, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02}/></linearGradient>
              <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f8" />
            <XAxis dataKey="time" tick={{ fontSize:9, fill:'#8b92a5' }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize:9, fill:'#8b92a5' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<TT />} />
            <Legend iconType="circle" iconSize={7} formatter={v => <span className="text-xs text-gray-600">{v}</span>} wrapperStyle={{ paddingTop:10 }} />
            <Area type="monotone" dataKey="upload"   name="Upload (GB)"   stroke="#22d3ee" fill="url(#gU)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="download" name="Download (GB)" stroke="#6366f1" fill="url(#gD)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Users size={15} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">User Statistics</h3></div>
          <div className="space-y-2.5">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Total Users</span><span className="text-sm font-semibold text-gray-900">{userStats.totalUsers.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Active Today</span><span className="text-sm font-semibold text-gray-900">{userStats.activeToday.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">New This Week</span><span className="text-sm font-semibold text-gray-900">{userStats.newThisWeek.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Activity size={15} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">Connection Quality</h3></div>
          <div className="space-y-2.5">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Avg Connect Time</span><span className="text-sm font-semibold text-gray-900">{connectionQuality.avgConnectTime}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Success Rate</span><span className="text-sm font-semibold text-gray-900">{connectionQuality.successRate}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Fallback Used</span><span className="text-sm font-semibold text-gray-900">{connectionQuality.fallbackUsed}</span></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><BarChart2 size={15} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-800">Performance Trends</h3></div>
          <div className="space-y-2.5">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Week over Week</span><span className="text-sm font-semibold text-emerald-600">{performanceTrends.weekOverWeek}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Month over Month</span><span className="text-sm font-semibold text-emerald-600">{performanceTrends.monthOverMonth}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-500">Peak Hour</span><span className="text-sm font-semibold text-gray-900">{performanceTrends.peakHour}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
