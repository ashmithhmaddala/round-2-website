import React, { useState, useEffect } from 'react';
import '../admin.css';

const CompetitionTimer = () => {
  const [competition, setCompetition] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCompetition();
    const interval = setInterval(fetchCompetition, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!competition) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      let targetTime;
      let phase;

      if (competition.status === 'upcoming') {
        targetTime = new Date(competition.startTime);
        phase = 'starts';
      } else if (competition.status === 'live' || competition.status === 'frozen') {
        targetTime = new Date(competition.endTime);
        phase = 'ends';
      } else {
        return null;
      }

      const difference = targetTime - now;
      if (difference <= 0) return null;

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return { days, hours, minutes, seconds, phase };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    setTimeLeft(calculateTimeLeft());
    return () => clearInterval(timer);
  }, [competition]);

  const fetchCompetition = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/competition');
      if (!response.ok) {
        throw new Error('Failed to fetch competition data');
      }
      const data = await response.json();
      setCompetition(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return '#3498db';
      case 'live': return '#2ecc71';
      case 'frozen': return '#f39c12';
      case 'ended': return '#95a5a6';
      default: return '#34495e';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming': return '⏳ Upcoming';
      case 'live': return '🔴 Live';
      case 'frozen': return '❄️ Frozen';
      case 'ended': return '🏁 Ended';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
        Loading competition timer...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#e74c3c' }}>
        {error}
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>
        No competition configured
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1f2e 0%, #252d3f 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#ecf0f1'
          }}>
            {competition.name}
          </h2>
          <p style={{ 
            margin: '4px 0 0 0', 
            color: '#95a5a6',
            fontSize: '14px'
          }}>
            {competition.description}
          </p>
        </div>
        <div style={{
          padding: '8px 16px',
          background: getStatusColor(competition.status),
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#fff',
          whiteSpace: 'nowrap'
        }}>
          {getStatusLabel(competition.status)}
        </div>
      </div>

      {/* Countdown Timer */}
      {timeLeft && (competition.status === 'upcoming' || competition.status === 'live' || competition.status === 'frozen') && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '12px',
            fontSize: '14px',
            color: '#95a5a6',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Competition {timeLeft.phase} in
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {timeLeft.days > 0 && (
              <div style={timerUnitStyle}>
                <div style={timerValueStyle}>{timeLeft.days}</div>
                <div style={timerLabelStyle}>Days</div>
              </div>
            )}
            <div style={timerUnitStyle}>
              <div style={timerValueStyle}>{String(timeLeft.hours).padStart(2, '0')}</div>
              <div style={timerLabelStyle}>Hours</div>
            </div>
            <div style={timerUnitStyle}>
              <div style={timerValueStyle}>{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div style={timerLabelStyle}>Minutes</div>
            </div>
            <div style={timerUnitStyle}>
              <div style={timerValueStyle}>{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div style={timerLabelStyle}>Seconds</div>
            </div>
          </div>
        </div>
      )}

      {/* Competition Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '4px' }}>
            Start Time
          </div>
          <div style={{ fontSize: '14px', color: '#ecf0f1', fontWeight: '500' }}>
            {new Date(competition.startTime).toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '4px' }}>
            End Time
          </div>
          <div style={{ fontSize: '14px', color: '#ecf0f1', fontWeight: '500' }}>
            {new Date(competition.endTime).toLocaleString()}
          </div>
        </div>
        {competition.freezeTime && (
          <div>
            <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '4px' }}>
              Freeze Time
            </div>
            <div style={{ fontSize: '14px', color: '#ecf0f1', fontWeight: '500' }}>
              {new Date(competition.freezeTime).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {competition.status === 'ended' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(231, 76, 60, 0.1)',
          border: '1px solid rgba(231, 76, 60, 0.3)',
          borderRadius: '8px',
          color: '#e74c3c',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          🏁 Competition has ended. {competition.allowLateSubmissions ? 'Late submissions are allowed.' : 'No more submissions accepted.'}
        </div>
      )}

      {competition.status === 'frozen' && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(243, 156, 18, 0.1)',
          border: '1px solid rgba(243, 156, 18, 0.3)',
          borderRadius: '8px',
          color: '#f39c12',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          ❄️ Scoreboard is frozen. Submissions are still accepted but rankings are hidden.
        </div>
      )}
    </div>
  );
};

// Styles
const timerUnitStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: '80px'
};

const timerValueStyle = {
  fontSize: '40px',
  fontWeight: '700',
  color: '#ecf0f1',
  lineHeight: '1',
  fontFamily: 'monospace'
};

const timerLabelStyle = {
  fontSize: '12px',
  color: '#95a5a6',
  marginTop: '8px',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

export default CompetitionTimer;
