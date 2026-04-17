import React from 'react'

export default function StatCard({ title, value, subtitle, badge, icon: Icon, progress }) {
  return (
    <div className="card p-5 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-surface-border flex items-center justify-center">
            <Icon size={15} className="text-gray-400" />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight leading-none">
          {value}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
          {badge && (
            <span className={`badge-${badge.color} text-[10px]`}>{badge.label}</span>
          )}
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-purple rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
