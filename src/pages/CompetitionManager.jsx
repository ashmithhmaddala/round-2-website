import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/api';
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
  }, []);

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/competition`);
      if (!response.ok) {
        throw new Error('Failed to fetch competition');
      }
      const data = await response.json();
      setCompetition(data);
      
      // Populate form
      setFormData({
        name: data.name,
        description: data.description,
        startTime: formatDateTimeLocal(data.startTime),
        endTime: formatDateTimeLocal(data.endTime),
        freezeTime: data.freezeTime ? formatDateTimeLocal(data.freezeTime) : '',
        allowLateSubmissions: data.allowLateSubmissions,
        showScoreboard: data.showScoreboard
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (dateString) => {
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
    try {
      const response = await fetch(`${API_URL}/admin/competition`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update competition');
      }

      const data = await response.json();
      setCompetition(data.competition);
      setIsEditing(false);
      alert('Competition settings updated successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change the competition status to "${newStatus}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/competition/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      const data = await response.json();
      setCompetition(data.competition);
      alert(`Competition status changed to "${newStatus}"`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#7f8c8d' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', color: '#e74c3c' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#ecf0f1' }}>Competition Management</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '10px 20px',
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ✏️ Edit Settings
          </button>
        )}
      </div>

      {/* Current Status */}
      {!isEditing && competition && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #252d3f 100%)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#ecf0f1', fontSize: '18px' }}>Current Status</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Competition Name</div>
              <div style={infoValueStyle}>{competition.name}</div>
            </div>
            
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Description</div>
              <div style={infoValueStyle}>{competition.description}</div>
            </div>
            
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Current Status</div>
              <div style={{
                ...infoValueStyle,
                color: getStatusColor(competition.status),
                fontWeight: '600'
              }}>
                {competition.status.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Start Time</div>
              <div style={infoValueStyle}>{new Date(competition.startTime).toLocaleString()}</div>
            </div>
            
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>End Time</div>
              <div style={infoValueStyle}>{new Date(competition.endTime).toLocaleString()}</div>
            </div>
            
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Freeze Time</div>
              <div style={infoValueStyle}>
                {competition.freezeTime ? new Date(competition.freezeTime).toLocaleString() : 'Not set'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Late Submissions</div>
              <div style={infoValueStyle}>{competition.allowLateSubmissions ? '✅ Allowed' : '❌ Not Allowed'}</div>
            </div>
            
            <div style={infoCardStyle}>
              <div style={infoLabelStyle}>Scoreboard</div>
              <div style={infoValueStyle}>{competition.showScoreboard ? '👁️ Visible' : '🙈 Hidden'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Control Buttons */}
      {!isEditing && (
        <div style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #252d3f 100%)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#ecf0f1', fontSize: '18px', marginBottom: '16px' }}>
            Manual Status Control
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleStatusChange('upcoming')}
              style={statusButtonStyle('#3498db')}
              disabled={competition?.status === 'upcoming'}
            >
              ⏳ Set Upcoming
            </button>
            <button
              onClick={() => handleStatusChange('live')}
              style={statusButtonStyle('#2ecc71')}
              disabled={competition?.status === 'live'}
            >
              🔴 Start Competition
            </button>
            <button
              onClick={() => handleStatusChange('frozen')}
              style={statusButtonStyle('#f39c12')}
              disabled={competition?.status === 'frozen'}
            >
              ❄️ Freeze Scoreboard
            </button>
            <button
              onClick={() => handleStatusChange('ended')}
              style={statusButtonStyle('#e74c3c')}
              disabled={competition?.status === 'ended'}
            >
              🏁 End Competition
            </button>
          </div>
          <div style={{ 
            marginTop: '12px', 
            fontSize: '13px', 
            color: '#95a5a6',
            fontStyle: 'italic'
          }}>
            Note: Status will auto-update based on times, but you can manually override it here.
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} style={{
          background: 'linear-gradient(135deg, #1a1f2e 0%, #252d3f 100%)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{ marginTop: 0, color: '#ecf0f1', fontSize: '18px' }}>Edit Competition Settings</h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Competition Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Start Time *</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>End Time *</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Freeze Time (Optional)</label>
                <input
                  type="datetime-local"
                  name="freezeTime"
                  value={formData.freezeTime}
                  onChange={handleInputChange}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ecf0f1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="allowLateSubmissions"
                  checked={formData.allowLateSubmissions}
                  onChange={handleInputChange}
                  style={{ cursor: 'pointer' }}
                />
                Allow Late Submissions
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ecf0f1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="showScoreboard"
                  checked={formData.showScoreboard}
                  onChange={handleInputChange}
                  style={{ cursor: 'pointer' }}
                />
                Show Scoreboard
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                background: '#2ecc71',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              💾 Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                fetchCompetition(); // Reset form
              }}
              style={{
                padding: '12px 24px',
                background: '#7f8c8d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              ✖️ Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Styles
const infoCardStyle = {
  background: 'rgba(0, 0, 0, 0.2)',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.05)'
};

const infoLabelStyle = {
  fontSize: '12px',
  color: '#95a5a6',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const infoValueStyle = {
  fontSize: '14px',
  color: '#ecf0f1',
  fontWeight: '500'
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#ecf0f1',
  fontSize: '14px',
  fontWeight: '500'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  color: '#ecf0f1',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const statusButtonStyle = (color) => ({
  padding: '10px 20px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  transition: 'all 0.2s',
  opacity: 1
});

const getStatusColor = (status) => {
  switch (status) {
    case 'upcoming': return '#3498db';
    case 'live': return '#2ecc71';
    case 'frozen': return '#f39c12';
    case 'ended': return '#e74c3c';
    default: return '#95a5a6';
  }
};

export default CompetitionManager;
