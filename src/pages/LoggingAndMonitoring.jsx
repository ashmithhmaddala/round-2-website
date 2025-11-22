import React, { useEffect, useState } from 'react';
import '../admin.css';

const LoggingAndMonitoring = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Fetch logs from the backend
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="admin-page">
      <h1>Logging and Monitoring</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Method</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td>{log.timestamp}</td>
              <td>{log.method}</td>
              <td>{log.url}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No logs available.</p>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LoggingAndMonitoring;