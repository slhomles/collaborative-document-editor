import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/authStore'

// Chuyển lỗi axios thành thông báo tiếng Việt dễ hiểu. Phân biệt lỗi mạng (server không chạy)
// với lỗi do server trả về để người dùng biết phải làm gì.
function authErrorMessage(err: any, fallback: string): string {
  if (!err.response) {
    return 'Không kết nối được máy chủ. Kiểm tra server (cổng 3000) đã chạy chưa.'
  }
  const msg = err.response.data?.error || err.response.data?.message
  if (msg === 'Email already in use') return 'Email đã được sử dụng.'
  if (msg === 'Invalid credentials') return 'Email hoặc mật khẩu không đúng.'
  if (msg === 'Invalid input') return 'Thông tin không hợp lệ (mật khẩu tối thiểu 6 ký tự).'
  return msg || fallback
}

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
      setError(authErrorMessage(err, 'Đăng nhập thất bại'))
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
      setError(authErrorMessage(err, 'Đăng ký thất bại'))
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
