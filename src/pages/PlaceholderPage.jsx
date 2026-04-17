import React from 'react'
import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] p-10 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-surface-border flex items-center justify-center mb-4">
        <Construction size={28} className="text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">{title}</h2>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        This page is under construction. It will be available in a future update.
      </p>
    </div>
  )
}
