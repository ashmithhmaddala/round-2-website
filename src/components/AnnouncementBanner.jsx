import React, { useState, useEffect } from 'react';

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/announcements');
      if (!response.ok) throw new Error('Failed to fetch announcements');
      const data = await response.json();
      setAnnouncements(data.announcements);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setLoading(false);
    }
  };

  const getTypeConfig = (type) => {
    switch (type) {
      case 'info':
        return {
          icon: 'ℹ️',
          gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'rgba(59, 130, 246, 0.05)'
        };
      case 'warning':
        return {
          icon: '⚠️',
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.05)'
        };
      case 'success':
        return {
          icon: '✅',
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          background: 'rgba(16, 185, 129, 0.05)'
        };
      case 'error':
        return {
          icon: '❌',
          gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.05)'
        };
      case 'urgent':
        return {
          icon: '🚨',
          gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          border: '1px solid rgba(220, 38, 38, 0.4)',
          background: 'rgba(220, 38, 38, 0.08)'
        };
      default:
        return {
          icon: 'ℹ️',
          gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          border: '1px solid rgba(107, 114, 128, 0.3)',
          background: 'rgba(107, 114, 128, 0.05)'
        };
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return '🔴 High Priority';
      case 'medium': return '🟡 Medium';
      case 'low': return '🟢 Low';
      default: return '';
    }
  };

  if (loading) return null;

  // Separate pinned and regular announcements
  const pinnedAnnouncements = announcements.filter(a => a.pinned);
  const regularAnnouncements = announcements.filter(a => !a.pinned);

  if (announcements.length === 0) return null;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto 24px auto',
      padding: '0 16px'
    }}>
      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {pinnedAnnouncements.map((announcement) => {
            const config = getTypeConfig(announcement.type);
            return (
              <div
                key={announcement._id}
                style={{
                  background: config.background,
                  border: config.border,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                {/* Gradient bar on left */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: config.gradient
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  paddingLeft: '8px'
                }}>
                  <div style={{
                    fontSize: '24px',
                    lineHeight: '1',
                    marginTop: '2px'
                  }}>
                    {config.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '4px',
                      flexWrap: 'wrap'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#ecf0f1'
                      }}>
                        📌 {announcement.title}
                      </h3>
                      
                      {announcement.priority !== 'low' && (
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: announcement.priority === 'high' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(245, 158, 11, 0.2)',
                          color: announcement.priority === 'high' ? '#ef4444' : '#f59e0b',
                          fontWeight: '600'
                        }}>
                          {getPriorityLabel(announcement.priority)}
                        </span>
                      )}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#cbd5e1',
                      lineHeight: '1.6'
                    }}>
                      {announcement.message}
                    </p>

                    {announcement.expiresAt && (
                      <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#94a3b8'
                      }}>
                        ⏰ Expires: {new Date(announcement.expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Regular Announcements */}
      {regularAnnouncements.length > 0 && (
        <div>
          {regularAnnouncements.map((announcement) => {
            const config = getTypeConfig(announcement.type);
            return (
              <div
                key={announcement._id}
                style={{
                  background: config.background,
                  border: config.border,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Gradient bar on left */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: config.gradient
                }} />

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  paddingLeft: '6px'
                }}>
                  <div style={{
                    fontSize: '18px',
                    lineHeight: '1',
                    marginTop: '2px'
                  }}>
                    {config.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '4px',
                      flexWrap: 'wrap'
                    }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#ecf0f1'
                      }}>
                        {announcement.title}
                      </h4>
                      
                      {announcement.priority === 'high' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          fontWeight: '600'
                        }}>
                          {getPriorityLabel(announcement.priority)}
                        </span>
                      )}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#cbd5e1',
                      lineHeight: '1.5'
                    }}>
                      {announcement.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;
