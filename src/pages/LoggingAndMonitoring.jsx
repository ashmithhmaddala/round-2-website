import React, { useEffect, useState } from 'react';
import '../admin.css';
import { API_URL } from '../utils/api';

const LoggingAndMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/logs`);
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
                  <th>IP Address</th>
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
                    <td>
                      {log.ipAddress === '127.0.0.1' || log.ipAddress === '::1' 
                        ? <span title="This is your local computer's internal IP">Localhost (You)</span> 
                        : log.ipAddress}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No logs available.</td>
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