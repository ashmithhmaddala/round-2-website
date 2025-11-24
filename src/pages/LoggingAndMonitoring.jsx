import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import '../admin.css';
import { API_URL } from '../utils/api';

const LoggingAndMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchLogs = async () => {
    try {
      const adminUsername = localStorage.getItem('currentAdminUsername');
      const response = await fetch(`${API_URL}/admin/logs`, {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-username': adminUsername || 'admin'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch logs:', response.status);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Socket listener for real-time log updates
  useEffect(() => {
    if (!socket) return;

    // Listen for any admin actions that would generate logs
    const handleAdminAction = () => {
      fetchLogs(); // Refresh logs when admin actions occur
    };

    socket.on('challenge:created', handleAdminAction);
    socket.on('challenge:updated', handleAdminAction);
    socket.on('challenge:deleted', handleAdminAction);
    socket.on('team:deleted', handleAdminAction);
    socket.on('competition:updated', handleAdminAction);
    socket.on('competition:status', handleAdminAction);
    socket.on('announcement:created', handleAdminAction);

    return () => {
      socket.off('challenge:created', handleAdminAction);
      socket.off('challenge:updated', handleAdminAction);
      socket.off('challenge:deleted', handleAdminAction);
      socket.off('team:deleted', handleAdminAction);
      socket.off('competition:updated', handleAdminAction);
      socket.off('competition:status', handleAdminAction);
      socket.off('announcement:created', handleAdminAction);
    };
  }, [socket]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Security Logs</h1>
        <button 
          className="btn-modern" 
          onClick={fetchLogs}
          style={{ width: 'auto', padding: '8px 16px', fontSize: '0.9rem' }}
        >
          Refresh Logs
        </button>
      </div>
      
      <div className="admin-card">
        {loading ? (
          <p>Loading logs...</p>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log._id || index} style={log.action.includes('FAILED') || log.action.includes('BLOCKED') ? { backgroundColor: 'rgba(255, 0, 0, 0.1)' } : {}}>
                    <td>{formatDate(log.timestamp)}</td>
                    <td>
                      <span className={`status-badge ${
                        log.action.includes('LOGIN') ? 'status-active' : 
                        log.action.includes('SOLVE') ? 'status-success' : 
                        log.action.includes('FAILED') ? 'status-ended' : 'status-upcoming'
                      }`} style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        backgroundColor: log.action.includes('FAILED') ? '#ff4444' : 
                                       log.action.includes('SOLVE') ? '#00C851' : 
                                       log.action.includes('LOGIN') ? '#33b5e5' : '#4285F4',
                        color: 'white'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.actor}</td>
                    <td>{log.role}</td>
                    <td>{log.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No logs available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoggingAndMonitoring;