import { useState, useEffect } from 'react'
import { FaBullhorn, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaThumbtack, FaClock, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa'
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementStatus, toggleAnnouncementPin } from '../utils/api'
import '../admin.css'

function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    pinned: false,
    expiresAt: ''
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAllAnnouncements()
      setAnnouncements(data.announcements)
    } catch (error) {
      showMessage('Failed to load announcements: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    setShowForm(true)
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      pinned: false,
      expiresAt: ''
    })
  }

  const handleEdit = (announcement) => {
    setEditingId(announcement._id)
    setShowForm(true)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      pinned: announcement.pinned,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, 16) : ''
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const currentAdmin = localStorage.getItem('currentAdminUsername') || 'admin'
      const announcementData = {
        ...formData,
        expiresAt: formData.expiresAt || null,
        createdBy: currentAdmin
      }

      if (editingId) {
        await updateAnnouncement(editingId, announcementData)
        showMessage('Announcement updated!', 'success')
      } else {
        await createAnnouncement(announcementData)
        showMessage('Announcement created!', 'success')
      }

      setShowForm(false)
      await loadAnnouncements()
    } catch (error) {
      showMessage('Failed to save announcement: ' + error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      showMessage('Announcement deleted!', 'success')
      await loadAnnouncements()
    } catch (error) {
      showMessage('Failed to delete announcement: ' + error.message, 'error')
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      await toggleAnnouncementStatus(id)
      await loadAnnouncements()
      showMessage('Status updated!', 'success')
    } catch (error) {
      showMessage('Failed to toggle status: ' + error.message, 'error')
    }
  }

  const handleTogglePin = async (id) => {
    try {
      await toggleAnnouncementPin(id)
      await loadAnnouncements()
      showMessage('Pin status updated!', 'success')
    } catch (error) {
      showMessage('Failed to toggle pin: ' + error.message, 'error')
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const getTypeIcon = (type) => {
    switch(type) {
      case 'warning': return <FaExclamationTriangle style={{ color: '#f59e0b' }} />
      case 'error': return <FaExclamationTriangle style={{ color: '#ef4444' }} />
      case 'success': return <FaCheckCircle style={{ color: '#10b981' }} />
      case 'urgent': return <FaExclamationTriangle style={{ color: '#dc2626' }} />
      default: return <FaInfoCircle style={{ color: '#3b82f6' }} />
    }
  }

  const getTypeColor = (type) => {
    switch(type) {
      case 'warning': return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' }
      case 'error': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' }
      case 'success': return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' }
      case 'urgent': return { bg: 'rgba(220, 38, 38, 0.15)', border: 'rgba(220, 38, 38, 0.4)', text: '#dc2626' }
      default: return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' }
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'rgba(107, 114, 128, 0.2)',
      medium: 'rgba(59, 130, 246, 0.2)',
      high: 'rgba(245, 158, 11, 0.2)',
      critical: 'rgba(239, 68, 68, 0.2)'
    }
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        background: colors[priority],
        color: 'var(--text-primary)'
      }}>
        {priority}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3b8' }}>
        <p>Loading announcements...</p>
      </div>
    )
  }

  return (
    <div className="announcements-manager">
      <div className="section-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FaBullhorn /> Announcements
          </h2>
          <p className="section-description">
            Broadcast messages to all participants
          </p>
        </div>
        <button onClick={handleAdd} className="btn-add-challenge">
          <FaPlus /> Create Announcement
        </button>
      </div>

      {showForm && (
        <div className="challenge-form-card" style={{ marginBottom: '24px' }}>
          <div className="form-card-header">
            <h3>{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h3>
            <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
          </div>
          <form onSubmit={handleSave}>
            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
                required
              />
            </div>

            <div className="form-field">
              <label>Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows="5"
                placeholder="Enter announcement message..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-field">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Leave empty for no expiration
                </small>
              </div>

              <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                />
                <label htmlFor="pinned" style={{ margin: 0, cursor: 'pointer' }}>
                  Pin to top
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Announcement' : 'Create Announcement'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <FaBullhorn style={{ fontSize: '48px', color: '#6b7280', marginBottom: '12px' }} />
            <p>No announcements yet</p>
          </div>
        ) : (
          announcements.map(announcement => {
            const typeColor = getTypeColor(announcement.type)
            const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date()
            
            return (
              <div
                key={announcement._id}
                className="announcement-card"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${typeColor.border}`,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px',
                  opacity: announcement.active ? 1 : 0.5,
                  position: 'relative'
                }}
              >
                {announcement.pinned && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    color: '#fbbf24',
                    fontSize: '18px'
                  }}>
                    <FaThumbtack />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: typeColor.bg,
                    border: `1px solid ${typeColor.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {getTypeIcon(announcement.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {announcement.title}
                      </h3>
                      {getPriorityBadge(announcement.priority)}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                      {announcement.message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>By {announcement.createdBy}</span>
                        <span>•</span>
                        <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                        {announcement.expiresAt && (
                          <>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isExpired ? '#ef4444' : '#10b981' }}>
                              <FaClock />
                              {isExpired ? 'Expired' : `Expires ${new Date(announcement.expiresAt).toLocaleString()}`}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="action-buttons">
                        <button
                          onClick={() => handleTogglePin(announcement._id)}
                          className="btn-icon"
                          title={announcement.pinned ? 'Unpin' : 'Pin'}
                          style={{
                            background: announcement.pinned ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-card)',
                            border: announcement.pinned ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--border)',
                            color: announcement.pinned ? '#fbbf24' : 'var(--text-primary)'
                          }}
                        >
                          <FaThumbtack />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(announcement._id)}
                          className="btn-icon"
                          title={announcement.active ? 'Deactivate' : 'Activate'}
                          style={{
                            background: announcement.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: announcement.active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            color: announcement.active ? '#10b981' : '#ef4444'
                          }}
                        >
                          {announcement.active ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button
                          onClick={() => handleEdit(announcement)}
                          className="btn-icon"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement._id)}
                          className="btn-icon btn-danger"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`} style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 1000,
          display: 'block'
        }}>
          {message.text}
        </div>
      )}
    </div>
  )
}

export default AnnouncementsManager
