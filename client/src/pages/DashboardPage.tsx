import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { documentApi, authApi } from '../services/api'
import { DocumentList, Doc } from '../components/DocumentList'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// Icon components
function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="9" y="1" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="9" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="9" y="9" width="6" height="6" rx="1" fill={active ? '#d97757' : '#888'} />
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="6.75" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
      <rect x="1" y="11.5" width="14" height="2.5" rx="1" fill={active ? '#d97757' : '#888'} />
    </svg>
  )
}

type TabType = 'my-docs' | 'shared-with-me' | 'recent' | 'starred'

export function DashboardPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Doc[] | null>(null)
  const [currentTab, setCurrentTab] = useState<TabType>('my-docs')

  // Filters state
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [selectedPerson, setSelectedPerson] = useState<string | 'public-link' | null>(null)
  const [selectedPersonRole, setSelectedPersonRole] = useState<'all' | 'owner' | 'shared'>('all')
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null)
  const [subMenuTop, setSubMenuTop] = useState(0)
  const [timeoutId, setTimeoutId] = useState<any>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | '7-days' | '30-days' | 'this-year' | 'last-year' | 'custom' | null>(null)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [tempCustomStartDate, setTempCustomStartDate] = useState('')
  const [tempCustomEndDate, setTempCustomEndDate] = useState('')

  // Dropdown open states
  const [showPersonDropdown, setShowPersonDropdown] = useState(false)
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [personSearch, setPersonSearch] = useState('')

  const navigate = useNavigate()
  const { signOut } = useAuth()
  const user = useAuthStore((s) => s.user)

  const fetchDocs = () => {
    documentApi.list().then(({ data }) => {
      setDocs(data as unknown as Doc[])
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchDocs()
    authApi.users().then(({ data }) => {
      setAllUsers(data.data || [])
    }).catch(err => console.error("Failed to fetch users", err))
  }, [])

  // Tìm kiếm phía server (tên + nội dung, ưu tiên tên) với debounce 300ms.
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) { setSearchResults(null); return }
    const t = setTimeout(() => {
      documentApi.search(q)
        .then(({ data }) => setSearchResults(data as unknown as Doc[]))
        .catch(() => setSearchResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function handleRename(id: string, title: string) {
    setError(null)
    try {
      await documentApi.update(id, { title })
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)))
      setSearchResults((prev) => prev ? prev.map((d) => (d.id === id ? { ...d, title } : d)) : prev)
    } catch {
      setError('Không thể đổi tên tài liệu. Vui lòng thử lại.')
    }
  }

  async function createDoc() {
    setCreating(true)
    setError(null)
    try {
      const { data } = await documentApi.create('Tài liệu mới')
      navigate(`/doc/${(data as any).id}`)
    } catch {
      setError('Không thể tạo tài liệu. Vui lòng thử lại.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteDoc(id: string) {
    if (!window.confirm('Xóa tài liệu này?')) return
    setError(null)
    try {
      await documentApi.delete(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setError('Không thể xóa tài liệu. Vui lòng thử lại.')
    }
  }

  async function handleToggleStar(id: string, currentlyStarred: boolean) {
    // Optimistic UI update
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isStarred: !currentlyStarred } : d))
    )
    try {
      if (currentlyStarred) {
        await documentApi.unstar(id)
      } else {
        await documentApi.star(id)
      }
    } catch (err) {
      console.error('Failed to toggle star:', err)
      // Rollback on error
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isStarred: currentlyStarred } : d))
      )
    }
  }

  // Tìm kiếm: khi có từ khóa, dùng kết quả server (tên + nội dung, ưu tiên tên); ngược lại toàn bộ docs.
  const isSearching = searchQuery.trim().length > 0
  const searchedDocs = isSearching ? (searchResults ?? []) : docs

  // Tab Filtering logic
  let tabFilteredDocs: Doc[] = []
  if (currentTab === 'my-docs') {
    tabFilteredDocs = searchedDocs.filter((d) => d.ownerId === user?.id)
  } else if (currentTab === 'shared-with-me') {
    tabFilteredDocs = searchedDocs.filter((d) => d.ownerId !== user?.id)
  } else if (currentTab === 'recent') {
    // Sort all by viewedAt (or updatedAt if not viewed yet) and show up to 15
    tabFilteredDocs = [...searchedDocs]
      .sort((a, b) => {
        const timeA = new Date(a.viewedAt || a.updatedAt).getTime()
        const timeB = new Date(b.viewedAt || b.updatedAt).getTime()
        return timeB - timeA
      })
      .slice(0, 15)
  } else if (currentTab === 'starred') {
    tabFilteredDocs = searchedDocs.filter((d) => d.isStarred)
  }

  // Combine Person & Date Range Filtering
  const filteredDocs = tabFilteredDocs.filter((d) => {
    // 1. Person filter
    if (selectedPerson) {
      if (selectedPerson === 'public-link') {
        if (d.publicRole === 'RESTRICTED') return false
      } else {
        const isOwner = d.ownerId === selectedPerson
        const isMember = d.memberIds?.includes(selectedPerson)
        
        if (selectedPersonRole === 'owner') {
          if (!isOwner) return false
        } else if (selectedPersonRole === 'shared') {
          if (isOwner || !isMember) return false
        } else {
          // 'all'
          if (!isOwner && !isMember) return false
        }
      }
    }

    // 2. Date filter
    if (selectedDateRange) {
      const docDate = new Date(d.updatedAt)
      const now = new Date()
      
      if (selectedDateRange === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        if (docDate < todayStart) return false
      } else if (selectedDateRange === '7-days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (docDate < sevenDaysAgo) return false
      } else if (selectedDateRange === '30-days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        if (docDate < thirtyDaysAgo) return false
      } else if (selectedDateRange === 'this-year') {
        if (docDate.getFullYear() !== now.getFullYear()) return false
      } else if (selectedDateRange === 'last-year') {
        if (docDate.getFullYear() !== now.getFullYear() - 1) return false
      } else if (selectedDateRange === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate)
          start.setHours(0, 0, 0, 0)
          if (docDate < start) return false
        }
        if (customEndDate) {
          const end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
          if (docDate > end) return false
        }
      }
    }

    return true
  })

  const initials = user?.name ? getInitials(user.name) : '?'

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'my-docs', label: 'Tài liệu của tôi', icon: '📄' },
    { id: 'shared-with-me', label: 'Được chia sẻ với tôi', icon: '👥' },
    { id: 'recent', label: 'Gần đây', icon: '🕒' },
    { id: 'starred', label: 'Có gắn dấu sao', icon: '⭐' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F8F8F6', color: '#1a1a1a' }}>

      {/* Header */}
      <header style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #E0E0DC',
        background: '#EFEFED',
        gap: 16,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 18, color: '#d97757', fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
          CollabEditor
        </span>
        <div style={{ flex: 1, maxWidth: 560 }}>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#FFFFFF',
              border: '1px solid #E0E0DC',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#1a1a1a',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#666' }}>{user?.name}</span>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#d97757',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            flexShrink: 0,
          }}>
            {initials}
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 240,
          background: '#EFEFED',
          borderRight: '1px solid #E0E0DC',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map((t) => {
              const active = currentTab === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setCurrentTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 20px',
                    background: active ? '#E4E4E0' : 'transparent',
                    borderLeft: `3px solid ${active ? '#d97757' : 'transparent'}`,
                    color: active ? '#1a1a1a' : '#555',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = '#EBEBE7'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              )
            })}
          </nav>
          <div style={{ padding: '16px', borderTop: '1px solid #E0E0DC' }}>
            <button
              onClick={signOut}
              style={{
                background: 'none',
                border: '1px solid #D0D0CC',
                borderRadius: 6,
                color: '#666',
                cursor: 'pointer',
                padding: '8px 0',
                width: '100%',
                fontSize: 13,
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {error && (
            <div style={{
              marginBottom: 20,
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              color: '#dc2626',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <p style={{ color: '#666', fontSize: 14 }}>Đang tải...</p>
          ) : (
            <>
              {/* All docs section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <h2 style={{ fontSize: 12, fontWeight: 600, color: '#666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {searchQuery
                      ? `Kết quả tìm kiếm`
                      : tabs.find((t) => t.id === currentTab)?.label || 'Tất cả tài liệu'}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={createDoc}
                      disabled={creating}
                      style={{
                        background: creating ? '#3a3a3a' : '#d97757',
                        border: 'none',
                        borderRadius: 6,
                        color: creating ? '#888' : '#fff',
                        cursor: creating ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        padding: '6px 14px',
                        transition: 'background 0.15s',
                      }}
                    >
                      {creating ? 'Đang tạo...' : '+ Tạo mới'}
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Dạng lưới"
                      style={{
                        background: viewMode === 'grid' ? '#E4E4E0' : 'none',
                        border: `1px solid ${viewMode === 'grid' ? '#BBBBB6' : '#D0D0CC'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <GridIcon active={viewMode === 'grid'} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      title="Dạng danh sách"
                      style={{
                        background: viewMode === 'list' ? '#E4E4E0' : 'none',
                        border: `1px solid ${viewMode === 'list' ? '#BBBBB6' : '#D0D0CC'}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ListIcon active={viewMode === 'list'} />
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap', position: 'relative' }}>
                  {/* Dropdown 1: Người */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => {
                        setShowPersonDropdown(!showPersonDropdown);
                        setShowDateDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 18,
                        border: `1px solid ${selectedPerson ? '#d97757' : '#D0D0CC'}`,
                        background: selectedPerson ? '#fff3f0' : '#FFFFFF',
                        color: selectedPerson ? '#d97757' : '#555',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        outline: 'none',
                      }}
                    >
                      <span>
                        {selectedPerson === null && 'Người'}
                        {selectedPerson === 'public-link' && 'Bất kỳ ai có đường liên kết'}
                        {selectedPerson !== null && selectedPerson !== 'public-link' && (() => {
                          const name = allUsers.find(u => u.id === selectedPerson)?.name || 'Người'
                          const roleText = selectedPersonRole === 'owner' ? 'Chủ sở hữu' : selectedPersonRole === 'shared' ? 'Được chia sẻ với' : 'Tất cả'
                          return `${name} (${roleText})`
                        })()}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
                    </button>
                    
                    {/* Dropdown panel 1: Người */}
                    {showPersonDropdown && (
                      <>
                        {/* Backdrop for click outside */}
                        <div onClick={() => setShowPersonDropdown(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          background: '#FFFFFF',
                          border: '1px solid #E0E0DC',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: 12,
                          width: 280,
                          zIndex: 999,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}>
                          {/* Search box */}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: 10, color: '#888', fontSize: 13 }}>🔍</span>
                            <input
                              type="text"
                              placeholder="Tìm người và nhóm"
                              value={personSearch}
                              onChange={(e) => setPersonSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 10px 6px 30px',
                                border: '1px solid #E0E0DC',
                                borderRadius: 6,
                                fontSize: 13,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                          
                          {/* Users List */}
                          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Anyone with the link */}
                            {(!personSearch || 'bất kỳ ai có đường liên kết'.includes(personSearch.toLowerCase())) && (
                              <div
                                onClick={() => {
                                  setSelectedPerson('public-link');
                                  setShowPersonDropdown(false);
                                  setPersonSearch('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  background: selectedPerson === 'public-link' ? '#fff3f0' : 'transparent',
                                  color: selectedPerson === 'public-link' ? '#d97757' : '#1a1a1a',
                                  fontSize: 13,
                                  fontWeight: selectedPerson === 'public-link' ? 600 : 500,
                                  transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                                onMouseLeave={(e) => e.currentTarget.style.background = selectedPerson === 'public-link' ? '#fff3f0' : 'transparent'}
                              >
                                <span style={{ fontSize: 16 }}>🌐</span>
                                <span>Bất kỳ ai có đường liên kết</span>
                              </div>
                            )}
                            
                            {/* Divider */}
                            <div style={{ height: '1px', background: '#E0E0DC', margin: '4px 0' }} />
                            
                            {/* List users */}
                            {allUsers
                              .filter(u => !personSearch || u.name.toLowerCase().includes(personSearch.toLowerCase()) || u.email.toLowerCase().includes(personSearch.toLowerCase()))
                              .map(u => {
                                const isMe = u.id === user?.id
                                const isSelected = selectedPerson === u.id
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      setSelectedPerson(u.id);
                                      setSelectedPersonRole('all');
                                      setShowPersonDropdown(false);
                                      setPersonSearch('');
                                    }}
                                    onMouseEnter={(e) => {
                                      if (timeoutId) {
                                        clearTimeout(timeoutId);
                                        setTimeoutId(null);
                                      }
                                      setHoveredPersonId(u.id);
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const parent = e.currentTarget.closest('.person-dropdown-panel');
                                      if (parent) {
                                        const parentRect = parent.getBoundingClientRect();
                                        setSubMenuTop(rect.top - parentRect.top);
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      const tId = setTimeout(() => {
                                        setHoveredPersonId(null);
                                      }, 150);
                                      setTimeoutId(tId);
                                    }}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '8px 10px',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      background: isSelected ? '#fff3f0' : (hoveredPersonId === u.id ? '#EBEBE7' : 'transparent'),
                                      fontSize: 13,
                                      transition: 'background 0.1s',
                                      position: 'relative',
                                    }}
                                  >
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                      <div style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? '#d97757' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                                        {isMe && <span style={{ fontSize: 11, color: '#888', fontWeight: 'normal', flexShrink: 0 }}>(tôi)</span>}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                                    </div>
                                    
                                    {/* Chevron arrow to prompt sub-menu */}
                                    <span style={{ fontSize: 11, color: '#888', marginLeft: 8, padding: '4px' }}>❯</span>
                                  </div>
                                )
                              })}
                          </div>

                          {/* Render Google Drive role sub-menu outside scroll container to prevent clipping */}
                          {hoveredPersonId && (
                            <div
                              onMouseEnter={() => {
                                if (timeoutId) {
                                  clearTimeout(timeoutId);
                                  setTimeoutId(null);
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredPersonId(null);
                              }}
                              style={{
                                position: 'absolute',
                                left: 'calc(100% + 4px)',
                                top: subMenuTop,
                                background: '#FFFFFF',
                                border: '1px solid #E0E0DC',
                                borderRadius: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                padding: '6px 0',
                                width: 160,
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              {[
                                { role: 'all', label: 'Tất cả' },
                                { role: 'owner', label: 'Chủ sở hữu' },
                                { role: 'shared', label: 'Được chia sẻ với' },
                              ].map((rOption) => {
                                const isSelected = selectedPerson === hoveredPersonId
                                const isActive = isSelected && selectedPersonRole === rOption.role
                                return (
                                  <div
                                    key={rOption.role}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPerson(hoveredPersonId);
                                      setSelectedPersonRole(rOption.role as any);
                                      setShowPersonDropdown(false);
                                      setHoveredPersonId(null);
                                      setPersonSearch('');
                                    }}
                                    style={{
                                      padding: '8px 16px',
                                      fontSize: 13,
                                      fontWeight: isActive ? 600 : 500,
                                      background: isActive ? '#fff3f0' : 'transparent',
                                      color: isActive ? '#d97757' : '#1a1a1a',
                                      transition: 'background 0.1s',
                                      cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = isActive ? '#fff3f0' : 'transparent'}
                                  >
                                    {rOption.label}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          
                          {selectedPerson && (
                            <button
                              onClick={() => {
                                setSelectedPerson(null);
                                setShowPersonDropdown(false);
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                background: 'none',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '4px 0',
                                outline: 'none',
                              }}
                            >
                              Xóa lọc
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dropdown 2: Lần sửa đổi gần đây nhất */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => {
                        setShowDateDropdown(!showDateDropdown);
                        setShowPersonDropdown(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 18,
                        border: `1px solid ${selectedDateRange ? '#d97757' : '#D0D0CC'}`,
                        background: selectedDateRange ? '#fff3f0' : '#FFFFFF',
                        color: selectedDateRange ? '#d97757' : '#555',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        outline: 'none',
                      }}
                    >
                      <span>
                        {selectedDateRange === null && 'Lần sửa đổi gần đây nhất'}
                        {selectedDateRange === 'today' && 'Hôm nay'}
                        {selectedDateRange === '7-days' && '7 ngày qua'}
                        {selectedDateRange === '30-days' && '30 ngày qua'}
                        {selectedDateRange === 'this-year' && 'Năm nay (2026)'}
                        {selectedDateRange === 'last-year' && 'Năm ngoái (2025)'}
                        {selectedDateRange === 'custom' && 'Phạm vi ngày tùy chỉnh'}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
                    </button>
                    
                    {/* Dropdown panel 2: Lần sửa đổi gần đây nhất */}
                    {showDateDropdown && (
                      <>
                        {/* Backdrop for click outside */}
                        <div onClick={() => setShowDateDropdown(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          background: '#FFFFFF',
                          border: '1px solid #E0E0DC',
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '8px 0',
                          width: 240,
                          zIndex: 999,
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          {[
                            { id: 'today', label: 'Hôm nay' },
                            { id: '7-days', label: '7 ngày qua' },
                            { id: '30-days', label: '30 ngày qua' },
                            { id: 'this-year', label: 'Năm nay (2026)' },
                            { id: 'last-year', label: 'Năm ngoái (2025)' },
                          ].map((item) => {
                            const isSelected = selectedDateRange === item.id
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedDateRange(item.id as any);
                                  setShowDateDropdown(false);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  cursor: 'pointer',
                                  background: isSelected ? '#fff3f0' : 'transparent',
                                  color: isSelected ? '#d97757' : '#1a1a1a',
                                  fontSize: 13,
                                  fontWeight: isSelected ? 600 : 500,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? '#fff3f0' : 'transparent'}
                              >
                                {item.label}
                              </div>
                            )
                          })}
                          
                          <div
                            onClick={() => {
                              setSelectedDateRange('custom');
                            }}
                            style={{
                              padding: '8px 16px',
                              cursor: 'pointer',
                              background: selectedDateRange === 'custom' ? '#fff3f0' : 'transparent',
                              color: selectedDateRange === 'custom' ? '#d97757' : '#1a1a1a',
                              fontSize: 13,
                              fontWeight: selectedDateRange === 'custom' ? 600 : 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                            onMouseLeave={(e) => e.currentTarget.style.background = selectedDateRange === 'custom' ? '#fff3f0' : 'transparent'}
                          >
                            <span>Phạm vi ngày tùy chỉnh</span>
                            <span style={{ fontSize: 11 }}>❯</span>
                          </div>

                          {selectedDateRange === 'custom' && (
                            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FAF9F6', borderTop: '1px solid #EFEFED' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#666' }}>Từ ngày:</span>
                                <input
                                  type="date"
                                  value={tempCustomStartDate}
                                  onChange={(e) => setTempCustomStartDate(e.target.value)}
                                  style={{
                                    padding: '4px 8px',
                                    border: '1px solid #E0E0DC',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 11, color: '#666' }}>Đến ngày:</span>
                                <input
                                  type="date"
                                  value={tempCustomEndDate}
                                  onChange={(e) => setTempCustomEndDate(e.target.value)}
                                  style={{
                                    padding: '4px 8px',
                                    border: '1px solid #E0E0DC',
                                    borderRadius: 4,
                                    fontSize: 12,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Cancel / Apply buttons matching screenshot */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            padding: '8px 16px',
                            borderTop: '1px solid #EFEFED',
                            marginTop: 4,
                          }}>
                            <button
                              onClick={() => {
                                setSelectedDateRange(null);
                                setCustomStartDate('');
                                setCustomEndDate('');
                                setTempCustomStartDate('');
                                setTempCustomEndDate('');
                                setShowDateDropdown(false);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#888',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '4px 8px',
                                outline: 'none',
                              }}
                            >
                              Xóa tất cả
                            </button>
                            <button
                              onClick={() => setShowDateDropdown(false)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '4px 8px',
                                outline: 'none',
                              }}
                            >
                              Huỷ
                            </button>
                            <button
                              onClick={() => {
                                if (selectedDateRange === 'custom') {
                                  setCustomStartDate(tempCustomStartDate);
                                  setCustomEndDate(tempCustomEndDate);
                                }
                                setShowDateDropdown(false);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#d97757',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '4px 8px',
                                outline: 'none',
                              }}
                            >
                              Áp dụng
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Clear All Filters Button */}
                  {(selectedPerson || selectedDateRange) && (
                    <button
                      onClick={() => {
                        setSelectedPerson(null);
                        setSelectedDateRange(null);
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setTempCustomStartDate('');
                        setTempCustomEndDate('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d97757',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        marginLeft: 8,
                        outline: 'none',
                      }}
                    >
                      Xóa bộ lọc ×
                    </button>
                  )}
                </div>

                <DocumentList
                  docs={filteredDocs}
                  onOpen={(id) => navigate(`/doc/${id}`)}
                  onDelete={deleteDoc}
                  onRename={handleRename}
                  onToggleStar={handleToggleStar}
                  viewMode={viewMode}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
