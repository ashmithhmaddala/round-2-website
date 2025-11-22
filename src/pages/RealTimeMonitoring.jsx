import { useState, useEffect } from 'react'
import { FaUsers, FaPuzzlePiece, FaCheckCircle, FaTrophy, FaClock, FaFire, FaEye, FaEyeSlash, FaChartLine } from 'react-icons/fa'
import { getRealtimeAnalytics, getChallengeStatistics, toggleChallengeVisibility } from '../utils/api'
import { Line } from 'react-chartjs-2'
import '../admin.css'

function RealTimeMonitoring() {
  const [analytics, setAnalytics] = useState(null)
  const [challengeStats, setChallengeStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadAnalytics(true) // Silent refresh
    }, 3000) // Refresh every 3 seconds for real-time feel

    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadAnalytics = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [realtimeData, challengeData] = await Promise.all([
        getRealtimeAnalytics(),
        getChallengeStatistics()
      ])
      setAnalytics(realtimeData)
      setChallengeStats(challengeData.challenges)
    } catch (error) {
      if (!silent) showMessage('Failed to load analytics: ' + error.message, 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleToggleVisibility = async (challengeId) => {
    try {
      await toggleChallengeVisibility(challengeId)
      await loadAnalytics()
      showMessage('Challenge visibility updated', 'success')
    } catch (error) {
      showMessage('Failed to update visibility: ' + error.message, 'error')
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3b8' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading real-time analytics...</p>
      </div>
    )
  }

  if (!analytics) return null

  const { metrics, recentSolves, mostPopular, solvesByDifficulty, firstBloods } = analytics

  return (
    <div className="realtime-monitoring">
      <div className="monitoring-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Real-Time Analytics & Monitoring</h2>
          <p className="section-description">Live competition statistics and activity tracking</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
            style={{ padding: '8px 16px', fontSize: '13px', width: 'auto', whiteSpace: 'nowrap' }}
          >
            <span className={`status-dot ${autoRefresh ? 'active' : 'paused'}`}></span>
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Updated {new Date(analytics.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="stats-grid" style={{ marginBottom: '32px', marginTop: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4a90e2, #357abd)' }}>
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>{metrics.activeTeams}</h3>
            <p>Active Teams (5min)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #00ff88, #00cc6e)' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3>{metrics.totalSolves}</h3>
            <p>Total Solves</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #7000ff, #5a00cc)' }}>
            <FaPuzzlePiece />
          </div>
          <div className="stat-content">
            <h3>{metrics.visibleChallenges}/{metrics.totalChallenges}</h3>
            <p>Visible Challenges</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ffaa00, #ff8800)' }}>
            <FaUsers />
          </div>
          <div className="stat-content">
            <h3>{metrics.totalPlayers}</h3>
            <p>Total Players</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Recent Activity */}
        <div className="recent-activity">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaClock /> Recent Solves
          </h3>
          <div className="activity-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentSolves.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No solves yet
              </p>
            ) : (
              recentSolves.map((solve, idx) => (
                <div key={idx} className="activity-item" style={{ animation: idx === 0 ? 'slideIn 0.3s ease' : 'none' }}>
                  <div className="activity-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                    <FaCheckCircle style={{ color: '#10b981' }} />
                  </div>
                  <div className="activity-content">
                    <h4>{solve.teamName}</h4>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                      Solved <strong>{solve.challengeTitle}</strong>
                      <span className={`category-badge ${solve.category}`} style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '11px' }}>
                        {solve.category}
                      </span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="activity-badge" style={{ fontSize: '14px', fontWeight: '600' }}>
                      +{solve.points}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(solve.solvedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* First Bloods */}
        <div className="recent-activity">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaTrophy style={{ color: '#fbbf24' }} /> First Bloods
          </h3>
          <div className="activity-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {firstBloods.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No first bloods yet
              </p>
            ) : (
              firstBloods.map((fb, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                    <FaTrophy style={{ color: '#fbbf24' }} />
                  </div>
                  <div className="activity-content">
                    <h4>{fb.teamName}</h4>
                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                      First to solve <strong>{fb.challengeTitle}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="activity-badge" style={{ fontSize: '14px', fontWeight: '600' }}>
                      +{fb.points}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(fb.solvedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Most Popular Challenges */}
      <div className="recent-activity" style={{ marginBottom: '32px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaFire style={{ color: '#ef4444' }} /> Most Popular Challenges
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {mostPopular.map((ch, idx) => (
            <div key={ch.id} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', fontWeight: '700', color: '#6b7280' }}>#{idx + 1}</span>
                <span className={`category-badge ${ch.category}`} style={{ padding: '4px 8px', fontSize: '11px' }}>
                  {ch.category}
                </span>
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                {ch.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                <FaCheckCircle style={{ color: '#10b981' }} />
                <span>{ch.attempts} solves</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Challenge Management with Visibility */}
      <div className="recent-activity">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaPuzzlePiece /> Challenge Management
        </h3>
        <div className="table-container" style={{ marginTop: '16px' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Points</th>
                <th>Solves</th>
                <th>Solve Rate</th>
                <th>First Blood</th>
                <th>Visibility</th>
              </tr>
            </thead>
            <tbody>
              {challengeStats.map(ch => (
                <tr key={ch.id}>
                  <td><strong>{ch.title}</strong></td>
                  <td>
                    <span className={`category-badge ${ch.category}`}>
                      {ch.category === 'osint' ? 'OSINT' : 'Crypto'}
                    </span>
                  </td>
                  <td>
                    <span className={`difficulty-badge ${ch.difficulty}`}>
                      {ch.difficulty}
                    </span>
                  </td>
                  <td><strong>{ch.points}</strong></td>
                  <td>{ch.totalSolves}</td>
                  <td>{ch.solveRate}%</td>
                  <td>
                    {ch.firstBlood?.teamName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaTrophy style={{ color: '#fbbf24', fontSize: '12px' }} />
                        <span style={{ fontSize: '13px' }}>{ch.firstBlood.teamName}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>-</span>
                    )}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleToggleVisibility(ch.id)}
                      className="btn-icon"
                      title={ch.visible ? 'Hide Challenge' : 'Show Challenge'}
                      style={{
                        background: ch.visible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: ch.visible ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                        color: ch.visible ? '#10b981' : '#ef4444'
                      }}
                    >
                      {ch.visible ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Solve Distribution */}
      <div className="recent-activity" style={{ marginTop: '32px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaChartLine /> Solve Distribution by Difficulty
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
          {Object.entries(solvesByDifficulty).map(([difficulty, count]) => (
            <div key={difficulty} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <span className={`difficulty-badge ${difficulty}`} style={{ padding: '6px 12px', fontSize: '13px' }}>
                {difficulty}
              </span>
              <h2 style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)', margin: '12px 0 4px' }}>
                {count}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Total Solves</p>
            </div>
          ))}
        </div>
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

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default RealTimeMonitoring
