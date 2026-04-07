import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.data.token, data.data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function register(name: string, email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const { data } = await authApi.register(name, email, password)
      setAuth(data.data.token, data.data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  function signOut() {
    logout()
    navigate('/login')
  }

  return { login, register, signOut, loading, error }
}
