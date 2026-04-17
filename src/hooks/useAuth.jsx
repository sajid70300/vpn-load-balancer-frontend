import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('vpn_token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vpn_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  // Derive initials from name
  const userWithInitials = user ? {
    ...user,
    initials: user.name
      ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : user.email[0].toUpperCase(),
  } : null

  // Verify token on mount (silent check)
  useEffect(() => {
    const token = localStorage.getItem('vpn_token')
    if (!token) return
    authApi.me()
      .then(u => {
        setUser(u)
        localStorage.setItem('vpn_user', JSON.stringify(u))
        setIsAuthenticated(true)
      })
      .catch(() => {
        // Token expired or invalid — log out
        localStorage.removeItem('vpn_token')
        localStorage.removeItem('vpn_user')
        setIsAuthenticated(false)
        setUser(null)
      })
  }, [])

  async function login(email, password) {
    try {
      const data = await authApi.login({ email, password })
      localStorage.setItem('vpn_token', data.access_token)
      localStorage.setItem('vpn_user', JSON.stringify(data.user))
      setUser(data.user)
      setIsAuthenticated(true)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || 'Login failed' }
    }
  }

  async function register(name, email, password) {
    try {
      const data = await authApi.register({ name, email, password })
      // If superadmin (first user), auto-login
      if (data.status === 'active') {
        return await login(email, password)
      }
      return { success: true, pending: true }
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' }
    }
  }

  function logout() {
    localStorage.removeItem('vpn_token')
    localStorage.removeItem('vpn_user')
    setIsAuthenticated(false)
    setUser(null)
  }

  // Role helpers
  const isSuperAdmin = user?.role === 'superadmin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const isUser = user?.role === 'user'

  // Permission check: can the current user perform write (add/edit/delete) actions?
  const canWrite = isAdmin  // superadmin + admin can write; user cannot

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user: userWithInitials,
      login, register, logout,
      isSuperAdmin, isAdmin, isUser, canWrite,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}