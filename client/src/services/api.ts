import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
type AuthUser = { id: string; name: string; email: string; createdAt: string }
type AuthResponse = { data: { token: string; user: AuthUser } }

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { name, email, password }),
  me: () => api.get<{ data: AuthUser }>('/auth/me'),
}

// Documents
export const documentApi = {
  list: () => api.get<Document[]>('/documents'),
  create: (title?: string) => api.post('/documents', { title }),
  search: (q: string) => api.get(`/documents/search`, { params: { q } }),
  get: (id: string) => api.get(`/documents/${id}`),
  update: (id: string, title: string) => api.patch(`/documents/${id}`, { title }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  addMember: (id: string, email: string, role: string) =>
    api.post(`/documents/${id}/members`, { email, role }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/documents/${id}/members/${userId}`),
}

// Versions
export const versionApi = {
  list: (docId: string) => api.get(`/documents/${docId}/versions`),
  create: (docId: string, label?: string) => api.post(`/documents/${docId}/versions`, { label }),
  get: (docId: string, versionId: string) => api.get(`/documents/${docId}/versions/${versionId}`),
}
