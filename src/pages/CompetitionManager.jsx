import React, { useState, useEffect } from 'react';
import { API_URL, getAdminHeaders } from '../utils/api';
import { FaClock, FaPlay, FaPause, FaStop, FaSnowflake, FaEdit, FaSave, FaTimes, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import { LuTrophy } from "react-icons/lu";
import '../admin.css';

const CompetitionManager = () => {
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    freezeTime: '',
    allowLateSubmissions: false,
    showScoreboard: true
  });

  useEffect(() => {
    fetchCompetition();
    const interval = setInterval(fetchCompetition, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCompetition = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/competition`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch competition');
      }
      const data = await response.json();
      setCompetition(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (competition) {
      setFormData({
        name: competition.name,
        description: competition.description,
        startTime: formatDateTimeLocal(competition.startTime),
        endTime: formatDateTimeLocal(competition.endTime),
        freezeTime: competition.freezeTime ? formatDateTimeLocal(competition.freezeTime) : '',
        allowLateSubmissions: competition.allowLateSubmissions,
        showScoreboard: competition.showScoreboard
      });
    }
    setIsEditing(true);
  };

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert local datetime-local strings to ISO strings (UTC)
    const submitData = {
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      freezeTime: formData.freezeTime ? new Date(formData.freezeTime).toISOString() : undefined
    };

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/competition`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'x-admin-username': localStorage.getItem('currentAdminUsername') || 'admin'
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update competition');
      }

      const data = await response.json();
      setCompetition(data.competition);
      setIsEditing(false);
      // Show success message (could be a toast)
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const confirmMessage = {
      upcoming: 'Reset competition to UPCOMING? This will lock all challenges.',
      live: 'START the competition? This will unlock challenges for all users.',
      frozen: 'FREEZE the scoreboard? Submissions will still be accepted but scores will be hidden.',
      ended: 'END the competition? No more submissions will be accepted.'
    };

    if (!confirm(confirmMessage[newStatus])) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/admin/competition/status`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'x-admin-username': localStorage.getItem('currentAdminUsername') || 'admin'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const data = await response.json();
      setCompetition(data.competition);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="competition-manager">
      <div className="manager-header">
        <div className="header-title">
          <LuTrophy className="header-icon" />
          <div>
            <h2>Competition Control Center</h2>
            <p>Manage timeline, status, and global settings</p>
          </div>
        </div>
        {!isEditing && (
          <button onClick={startEditing} className="btn-edit">
            <FaEdit /> Edit Settings
          </button>
        )}
      </div>

      {/* Status Control Panel */}
      {!isEditing && competition && (
        <div className="control-panel">
          <div className="status-display">
            <div className="status-label">Current Status</div>
            <div className={`status-badge ${competition.status}`}>
              {competition.status === 'upcoming' && <FaClock />}
              {competition.status === 'live' && <FaPlay />}
              {competition.status === 'frozen' && <FaSnowflake />}
              {competition.status === 'ended' && <FaStop />}
              <span>{competition.status.toUpperCase()}</span>
            </div>
          </div>

          <div className="control-buttons">
            <button
              onClick={() => handleStatusChange('upcoming')}
              className={`btn-control upcoming ${competition.status === 'upcoming' ? 'active' : ''}`}
              disabled={competition.status === 'upcoming'}
              title="Lock all challenges"
            >
              <FaHistory /> Reset / Upcoming
            </button>
            <button
              onClick={() => handleStatusChange('live')}
              className={`btn-control live ${competition.status === 'live' ? 'active' : ''}`}
              disabled={competition.status === 'live'}
              title="Unlock challenges"
            >
              <FaPlay /> Start Competition
            </button>
            <button
              onClick={() => handleStatusChange('frozen')}
              className={`btn-control frozen ${competition.status === 'frozen' ? 'active' : ''}`}
              disabled={competition.status === 'frozen'}
              title="Hide scoreboard updates"
            >
              <FaSnowflake /> Freeze Scoreboard
            </button>
            <button
              onClick={() => handleStatusChange('ended')}
              className={`btn-control ended ${competition.status === 'ended' ? 'active' : ''}`}
              disabled={competition.status === 'ended'}
              title="Stop submissions"
            >
              <FaStop /> End Competition
            </button>
          </div>
        </div>
      )}

      {/* Info Grid */}
      {!isEditing && competition && (
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon"><LuTrophy /></div>
            <div className="info-content">
              <label>Competition Name</label>
              <div className="value">{competition.name}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon"><FaCalendarAlt /></div>
            <div className="info-content">
              <label>Start Time</label>
              <div className="value">{new Date(competition.startTime).toLocaleString()}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon"><FaStop /></div>
            <div className="info-content">
              <label>End Time</label>
              <div className="value">{new Date(competition.endTime).toLocaleString()}</div>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon"><FaSnowflake /></div>
            <div className="info-content">
              <label>Freeze Time</label>
              <div className="value">
                {competition.freezeTime ? new Date(competition.freezeTime).toLocaleString() : 'Not set'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-header">
            <h3>Edit Configuration</h3>
            <button type="button" onClick={() => setIsEditing(false)} className="btn-close">
              <FaTimes />
            </button>
          </div>

          <div className="form-group">
            <label>Competition Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Freeze Time (Optional)</label>
              <input
                type="datetime-local"
                name="freezeTime"
                value={formData.freezeTime}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-row checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="allowLateSubmissions"
                checked={formData.allowLateSubmissions}
                onChange={handleInputChange}
              />
              Allow Late Submissions
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showScoreboard"
                checked={formData.showScoreboard}
                onChange={handleInputChange}
              />
              Show Scoreboard Publicly
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save">
              <FaSave /> Save Changes
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="btn-cancel">
              Cancel
            </button>
          </div>
        </form>
      )}

      <style jsx>{`
        .competition-manager {
          padding: 20px;
          color: var(--text-primary);
        }
        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .header-icon {
          font-size: 2.5rem;
          color: var(--text);
        }
        .header-title h2 {
          margin: 0;
          font-size: 1.8rem;
          color: var(--text-primary);
        }
        .header-title p {
          margin: 5px 0 0;
          color: var(--text-secondary);
        }
        .btn-edit {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--text-dim);
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn-edit:hover {
          background: transparent;
          border-color: var(--text);
        }

        .control-panel {
          background: var(--bg-card);
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid var(--border);
        }
        .status-display {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
        }
        .status-label {
          font-size: 1.1rem;
          color: var(--text-secondary);
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .status-badge.upcoming { background: transparent; color: var(--text); border: 1px solid var(--text-dim); }
        .status-badge.live { background: transparent; color: var(--text); border: 1px solid var(--text-dim); }
        .status-badge.frozen { background: transparent; color: var(--text); border: 1px solid var(--text-dim); }
        .status-badge.ended { background: transparent; color: var(--text); border: 1px solid var(--text-dim); }

        .control-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .btn-control {
          padding: 15px;
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
          opacity: 0.8;
        }
        .btn-control:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-2px);
        }
        .btn-control.active {
          opacity: 1;
          box-shadow: 0 0 0 2px var(--bg-dark), 0 0 0 4px currentColor;
        }
        .btn-control:disabled {
          cursor: default;
          opacity: 0.5;
        }
        .btn-control.upcoming { background: var(--bg-card); border-color: var(--text-dim); color: var(--text); }
        .btn-control.upcoming:hover:not(:disabled), .btn-control.upcoming.active { background: transparent; color: var(--text); border-color: var(--text); }
        
        .btn-control.live { background: var(--bg-card); border-color: var(--text-dim); color: var(--text); }
        .btn-control.live:hover:not(:disabled), .btn-control.live.active { background: transparent; color: var(--text); border-color: var(--text); }
        
        .btn-control.frozen { background: var(--bg-card); border-color: var(--text-dim); color: var(--text); }
        .btn-control.frozen:hover:not(:disabled), .btn-control.frozen.active { background: transparent; color: var(--text); border-color: var(--text); }
        
        .btn-control.ended { background: var(--bg-card); border-color: var(--text-dim); color: var(--text); }
        .btn-control.ended:hover:not(:disabled), .btn-control.ended.active { background: transparent; color: var(--text); border-color: var(--text); }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        .info-card {
          background: var(--bg-card);
          padding: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
          border: 1px solid var(--border);
        }
        .info-icon {
          font-size: 1.5rem;
          color: var(--text);
          background: transparent;
          padding: 10px;
          border-radius: 50%;
          border: 1px solid var(--text-dim);
        }
        .info-content label {
          display: block;
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 5px;
        }
        .info-content .value {
          font-size: 1.1rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .edit-form {
          background: var(--bg-card);
          padding: 30px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .btn-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 1.2rem;
          cursor: pointer;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: var(--text-secondary);
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px;
          background: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 1rem;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }
        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        .checkboxes {
          margin: 20px 0;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: var(--text-primary);
        }
        .form-actions {
          display: flex;
          gap: 15px;
          margin-top: 30px;
        }
        .btn-save {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--text-dim);
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-save:hover {
          background: transparent;
          border-color: var(--text);
        }
        .btn-cancel {
          background: var(--bg-dark);
          color: var(--text-primary);
          border: 1px solid var(--border);
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-cancel:hover {
          background: var(--bg-card-hover);
        }
      `}</style>
    </div>
  );
};

export default CompetitionManager;
