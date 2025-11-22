import React, { useState, useEffect } from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaBell, FaClock } from 'react-icons/fa';
import { API_URL } from '../utils/api';

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
      const response = await fetch(`${API_URL}/announcements`);
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
          icon: FaInfoCircle,
          gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          iconColor: '#3b82f6',
          label: 'Information'
        };
      case 'warning':
        return {
          icon: FaExclamationTriangle,
          gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderColor: 'rgba(245, 158, 11, 0.4)',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          iconColor: '#f59e0b',
          label: 'Warning'
        };
      case 'success':
        return {
          icon: FaCheckCircle,
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          iconColor: '#10b981',
          label: 'Success'
        };
      case 'error':
        return {
          icon: FaTimesCircle,
          gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderColor: 'rgba(239, 68, 68, 0.4)',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          iconColor: '#ef4444',
          label: 'Error'
        };
      case 'urgent':
        return {
          icon: FaBell,
          gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          borderColor: 'rgba(220, 38, 38, 0.5)',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          iconColor: '#dc2626',
          label: 'Urgent'
        };
      default:
        return {
          icon: FaInfoCircle,
          gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          borderColor: 'rgba(107, 114, 128, 0.4)',
          backgroundColor: 'rgba(107, 114, 128, 0.08)',
          iconColor: '#6b7280',
          label: 'Notice'
        };
    }
  };

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high': 
        return { label: 'High Priority', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
      case 'medium': 
        return { label: 'Medium Priority', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' };
      case 'low': 
        return { label: 'Low Priority', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' };
      default: 
        return null;
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
            const Icon = config.icon;
            const priorityConfig = getPriorityConfig(announcement.priority);
            
            return (
              <div
                key={announcement._id}
                style={{
                  background: config.backgroundColor,
                  border: `1px solid ${config.borderColor}`,
                  borderRadius: '12px',
                  padding: '18px 20px',
                  marginBottom: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease'
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
                  gap: '16px',
                  paddingLeft: '8px'
                }}>
                  {/* Icon */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: config.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 12px ${config.borderColor}`
                  }}>
                    <Icon style={{ color: 'white', fontSize: '20px' }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: config.gradient,
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        PINNED
                      </div>
                      
                      <h3 style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: '700',
                        color: '#f1f5f9'
                      }}>
                        {announcement.title}
                      </h3>
                      
                      {priorityConfig && announcement.priority !== 'low' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: priorityConfig.bgColor,
                          color: priorityConfig.color,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {priorityConfig.label}
                        </span>
                      )}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '14.5px',
                      color: '#cbd5e1',
                      lineHeight: '1.6'
                    }}>
                      {announcement.message}
                    </p>

                    {announcement.expiresAt && (
                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FaClock style={{ fontSize: '11px' }} />
                        <span>Expires: {new Date(announcement.expiresAt).toLocaleString()}</span>
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
            const Icon = config.icon;
            const priorityConfig = getPriorityConfig(announcement.priority);
            
            return (
              <div
                key={announcement._id}
                style={{
                  background: config.backgroundColor,
                  border: `1px solid ${config.borderColor}`,
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '10px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
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
                  gap: '12px',
                  paddingLeft: '6px'
                }}>
                  {/* Icon */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: config.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon style={{ color: 'white', fontSize: '16px' }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '6px',
                      flexWrap: 'wrap'
                    }}>
                      <h4 style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#f1f5f9'
                      }}>
                        {announcement.title}
                      </h4>
                      
                      {priorityConfig && announcement.priority === 'high' && (
                        <span style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          background: priorityConfig.bgColor,
                          color: priorityConfig.color,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {priorityConfig.label}
                        </span>
                      )}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '13.5px',
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
