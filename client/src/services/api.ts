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
  users: () => api.get<{ data: { id: string; name: string; email: string }[] }>('/auth/users'),
}

// Documents
export const documentApi = {
  list: () => api.get<Document[]>('/documents'),
  create: (title?: string) => api.post('/documents', { title }),
  search: (q: string) => api.get(`/documents/search`, { params: { q } }),
  get: (id: string) => api.get(`/documents/${id}`),
  update: (id: string, data: { title?: string; publicRole?: 'RESTRICTED' | 'VIEWER' | 'EDITOR'; editorsCanShare?: boolean }) => api.patch(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
  star: (id: string) => api.post(`/documents/${id}/star`),
  unstar: (id: string) => api.delete(`/documents/${id}/star`),
  view: (id: string) => api.post(`/documents/${id}/view`),
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

// Upload
export const uploadApi = {
  image: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

