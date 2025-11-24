import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaClock, FaUsers, FaFire, FaMedal, FaChartLine, FaBell, FaSignOutAlt, FaHome, FaTimes, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaSnowflake } from 'react-icons/fa'
import { LuTrophy } from "react-icons/lu";
import { getCurrentUser, logout, API_URL } from '../utils/api'
import { useSocket } from '../context/SocketContext'
import logo from '../assets/cseh_final_logo.png'
import '../pages/Dashboard.css'
import './Leaderboard.css'

function Leaderboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [competition, setCompetition] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [shownAnnouncements, setShownAnnouncements] = useState(new Set())
  const [visiblePopups, setVisiblePopups] = useState([])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'chart'
  const navigate = useNavigate()
  const { socket } = useSocket()

  useEffect(() => {
    const username = getCurrentUser()
    if (!username) {
      navigate('/', { replace: true })
      return
    }
    setCurrentUser(username)
  }, [navigate])

  // Fetch teams and competition data
  useEffect(() => {
    // Don't update leaderboard if frozen
    if (competition?.status === 'frozen') return

    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [competition?.status]) // Only re-run if status changes

  // Fetch competition data
  useEffect(() => {
    fetchCompetition()
    const interval = setInterval(fetchCompetition, 3000)
    return () => clearInterval(interval)
  }, [])

  // Calculate time left
  useEffect(() => {
    if (!competition) return

    const calculateTimeLeft = () => {
      const now = new Date()
      let targetTime

      if (competition.status === 'upcoming') {
        targetTime = new Date(competition.startTime)
      } else if (competition.status === 'live' || competition.status === 'frozen') {
        targetTime = new Date(competition.endTime)
      } else {
        return null
      }

      const difference = targetTime - now
      if (difference <= 0) return null

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      return { hours, minutes, seconds }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())
    return () => clearInterval(timer)
  }, [competition])

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 5000)
    return () => clearInterval(interval)
  }, [])

  // Socket.io listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Competition updated
    socket.on('competition:updated', ({ competition }) => {
      setCompetition(competition);
    });

    // Competition status changed
    socket.on('competition:status', ({ status, competition }) => {
      setCompetition(competition);
      
      if (status === 'frozen') {
        // Show frozen message or hide scoreboard
        console.log('Competition frozen');
      } else if (status === 'ended') {
        console.log('Competition ended');
      }
      
      // Re-fetch teams to update leaderboard
      fetchTeams();
    });

    // New announcement
    socket.on('announcement:created', ({ announcement }) => {
      setAnnouncements(prev => [announcement, ...prev]);
      if (!shownAnnouncements.has(announcement._id)) {
        setVisiblePopups(prev => [...prev, announcement]);
        setShownAnnouncements(prev => new Set([...prev, announcement._id]));
        setUnreadCount(prev => prev + 1);
      }
    });

    // Cleanup listeners
    return () => {
      socket.off('competition:updated');
      socket.off('competition:status');
      socket.off('announcement:created');
    };
  }, [socket, shownAnnouncements])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/teams`)
      if (response.ok) {
        const data = await response.json()
        // Sort teams by score (descending), then by last solve time (ascending)
        const sortedTeams = data.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          // If scores are equal, sort by who solved last (earlier is better for tie-breaking)
          return (a.lastSolveTime || 0) - (b.lastSolveTime || 0)
        })
        setTeams(sortedTeams)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setLoading(false)
    }
  }

  const fetchCompetition = async () => {
    try {
      const response = await fetch(`${API_URL}/competition`)
      if (response.ok) {
        const data = await response.json()
        setCompetition(data)
      }
    } catch (err) {
      console.error('Error fetching competition:', err)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/announcements`)
      if (response.ok) {
        const data = await response.json()
        
        const lastReadTime = localStorage.getItem('lastReadTime') || '0'
        const lastReadTimestamp = parseInt(lastReadTime)
        
        if (shownAnnouncements.size === 0 && data.announcements.length > 0) {
          const existingIds = new Set(data.announcements.map(a => a._id))
          setShownAnnouncements(existingIds)
          
          const unreadAnnouncements = data.announcements.filter(
            a => new Date(a.createdAt).getTime() > lastReadTimestamp
          )
          setUnreadCount(unreadAnnouncements.length)
        } else {
          const newAnnouncements = data.announcements.filter(
            announcement => !shownAnnouncements.has(announcement._id)
          )
          
          if (newAnnouncements.length > 0) {
            newAnnouncements.forEach(announcement => {
              setShownAnnouncements(prev => new Set([...prev, announcement._id]))
              setVisiblePopups(prev => [...prev, announcement._id])
              
              setTimeout(() => {
                dismissPopup(announcement._id)
              }, 30000)
            })
            
            setUnreadCount(prev => prev + newAnnouncements.length)
          }
        }
        
        setAnnouncements(data.announcements)
      }
    } catch (err) {
      console.error('Error fetching announcements:', err)
    }
  }

  const dismissPopup = (id) => {
    setVisiblePopups(prev => prev.filter(popupId => popupId !== id))
  }

  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel)
  }

  const markAllAsRead = () => {
    setUnreadCount(0)
    localStorage.setItem('lastReadTime', Date.now().toString())
  }

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <LuTrophy />
      case 2:
        return <FaMedal />
      case 3:
        return <FaMedal />
      default:
        return <span className="rank-number">#{rank}</span>
    }
  }

  const getMaxScore = () => {
    return teams.length > 0 ? teams[0].score : 100
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const isFrozen = competition?.status === 'frozen'

  return (
    <>
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="brand-icon">
              <img src={logo} alt="Logo" style={{ height: '100%', width: 'auto' }} />
            </div>
            <div className="brand-text">
              <h1>Cache Me If You Can</h1>
              <p>NHCE Cybersecurity CTF</p>
            </div>
          </div>
          <div className="nav-center">
            {competition && timeLeft && (competition.status === 'live' || competition.status === 'upcoming' || competition.status === 'frozen') && (
              <div className="nav-timer">
                <FaClock className="timer-icon" />
                <div className="timer-display">
                  <span className="timer-unit">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="timer-separator">:</span>
                  <span className="timer-unit">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="timer-separator">:</span>
                  <span className="timer-unit">{String(timeLeft.seconds).padStart(2, '0')}</span>
                </div>
                <span className="timer-label">{competition.status === 'upcoming' ? 'Starts in' : 'Ends in'}</span>
              </div>
            )}
          </div>
          <div className="nav-actions">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="btn-dashboard"
              title="Go to Team Dashboard"
            >
              <FaHome />
            </button>
            <button 
              onClick={toggleNotificationPanel}
              className="btn-notifications"
              aria-label="View notifications"
            >
              <FaBell />
              {unreadCount > 0 && (
                <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <div className="user-info">
              <span className="user-label">Logged in as</span>
              <span className="user-name">{currentUser}</span>
            </div>
            <button onClick={() => { logout(); navigate('/'); }} className="btn-logout">
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="leaderboard-main">
        <div className="leaderboard-wrapper">
          {/* Page Header */}
          <div className="leaderboard-header">
            <div className="header-left">
              <div className="header-icon">
                <LuTrophy />
              </div>
              <div className="header-text">
                <h1>Leaderboard</h1>
                <p>Live team rankings and competition standings</p>
              </div>
            </div>
            <div className="header-right">
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  <FaUsers /> Table
                </button>
                <button
                  className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
                  onClick={() => setViewMode('chart')}
                >
                  <FaChartLine /> Chart
                </button>
              </div>
            </div>
          </div>

          {/* Freeze Banner */}
          {isFrozen && (
            <div className="freeze-banner">
              <div className="freeze-icon">
                <FaFire />
              </div>
              <div className="freeze-content">
                <h3>Scoreboard Frozen</h3>
                <p>The leaderboard has been frozen. Rankings will be revealed after the competition ends.</p>
              </div>
            </div>
          )}

          {/* Competition Status Banner */}
          {competition?.status === 'upcoming' && (
            <div className="status-banner upcoming">
              <FaClock />
              <span>Competition hasn't started yet. Leaderboard will update when challenges begin.</span>
            </div>
          )}

          {competition?.status === 'frozen' && (
            <div className="status-banner frozen">
              <FaSnowflake />
              <span>Scoreboard is frozen. Submissions are still accepted but scores are hidden.</span>
            </div>
          )}

          {competition?.status === 'ended' && (
            <div className="status-banner ended">
              <LuTrophy />
              <span>Competition has ended. Final standings are displayed below.</span>
            </div>
          )}

          {/* Hidden Scoreboard Message */}
          {competition && !competition.showScoreboard ? (
            <div className="empty-state">
              <FaShieldAlt style={{ fontSize: '48px', color: 'var(--text-dim)', marginBottom: '16px' }} />
              <h3>Scoreboard Hidden</h3>
              <p>The scoreboard is currently hidden by the administrators.</p>
            </div>
          ) : (
            <>
              {/* Stats Overview */}
              <div className="stats-overview">
                <div className="stat-box">
                  <div className="stat-icon teams">
                    <FaUsers />
                  </div>
                  <div className="stat-data">
                    <span className="stat-value">{teams.length}</span>
                    <span className="stat-label">Total Teams</span>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon active">
                    <FaFire />
                  </div>
                  <div className="stat-data">
                    <span className="stat-value">{teams.filter(t => t.score > 0).length}</span>
                    <span className="stat-label">Active Teams</span>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon trophy">
                    <LuTrophy />
                  </div>
                  <div className="stat-data">
                    <span className="stat-value">{teams.length > 0 ? teams[0].score : 0}</span>
                    <span className="stat-label">Top Score</span>
                  </div>
                </div>
              </div>

              {/* Top 3 Podium */}
              {teams.length >= 3 && !isFrozen && viewMode === 'table' && (
                <div className="podium">
                  {/* Second Place */}
                  <div className="podium-position second">
                    <div className="podium-rank">
                      <FaMedal />
                      <span>2nd</span>
                    </div>
                    <div className="podium-team">
                      <div className="team-avatar silver">
                        {teams[1].name.charAt(0).toUpperCase()}
                      </div>
                      <h3>{teams[1].name}</h3>
                      <div className="team-score">{teams[1].score} pts</div>
                      <div className="team-solves">{teams[1].solvedChallenges.length} solves</div>
                    </div>
                  </div>

                  {/* First Place */}
                  <div className="podium-position first">
                    <div className="podium-rank">
                      <LuTrophy />
                      <span>1st</span>
                    </div>
                    <div className="podium-team">
                      <div className="team-avatar gold">
                        {teams[0].name.charAt(0).toUpperCase()}
                      </div>
                      <h3>{teams[0].name}</h3>
                      <div className="team-score">{teams[0].score} pts</div>
                      <div className="team-solves">{teams[0].solvedChallenges.length} solves</div>
                    </div>
                  </div>

                  {/* Third Place */}
                  <div className="podium-position third">
                    <div className="podium-rank">
                      <FaMedal />
                      <span>3rd</span>
                    </div>
                    <div className="podium-team">
                      <div className="team-avatar bronze">
                        {teams[2].name.charAt(0).toUpperCase()}
                      </div>
                      <h3>{teams[2].name}</h3>
                      <div className="team-score">{teams[2].score} pts</div>
                      <div className="team-solves">{teams[2].solvedChallenges.length} solves</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="leaderboard-table-container">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading leaderboard...</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="empty-state">
                      <LuTrophy />
                      <h3>No teams yet</h3>
                      <p>Be the first to create a team and start solving challenges!</p>
                    </div>
                  ) : (
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th className="rank-col">Rank</th>
                          <th className="team-col">Team</th>
                          <th className="members-col">Members</th>
                          <th className="score-col">Score</th>
                          <th className="solves-col">Solves</th>
                          <th className="time-col">Last Solve</th>
                          <th className="progress-col">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, index) => (
                          <tr key={team._id} className={`table-row ${index < 3 ? 'top-three' : ''}`}>
                            <td className="rank-cell">
                              <div className="rank-badge">
                                {getRankIcon(index + 1)}
                              </div>
                            </td>
                            <td className="team-cell">
                              <div className="team-info">
                                <div className="team-avatar-small">
                                  {team.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="team-details">
                                  <span className="team-name">{team.name}</span>
                                  <span className="team-code">ID: {team.code}</span>
                                </div>
                              </div>
                            </td>
                            <td className="members-cell">
                              <div className="members-count">
                                <FaUsers />
                                <span>{team.members.length}/3</span>
                              </div>
                            </td>
                            <td className="score-cell">
                              <span className="score-value">{team.score}</span>
                            </td>
                            <td className="solves-cell">
                              <span className="solves-badge">{team.solvedChallenges.length}</span>
                            </td>
                            <td className="time-cell">
                              <span className="time-text">{formatTime(team.lastSolveTime)}</span>
                            </td>
                            <td className="progress-cell">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill"
                                  style={{ width: `${(team.score / getMaxScore()) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Chart View */}
              {viewMode === 'chart' && (
                <div className="chart-container">
                  <div className="chart-header">
                    <h3>Score Distribution</h3>
                    <p>Visual comparison of team performance</p>
                  </div>
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Loading chart...</p>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="empty-state">
                      <FaChartLine />
                      <h3>No data available</h3>
                      <p>Chart will appear once teams start solving challenges</p>
                    </div>
                  ) : (
                    <div className="bar-chart">
                      {teams.slice(0, 10).map((team, index) => (
                        <div key={team._id} className="chart-bar-row">
                          <div className="chart-rank">
                            {getRankIcon(index + 1)}
                          </div>
                          <div className="chart-team-name">{team.name}</div>
                          <div className="chart-bar-container">
                            <div 
                              className={`chart-bar ${index < 3 ? 'top-three' : ''}`}
                              style={{ width: `${(team.score / getMaxScore()) * 100}%` }}
                            >
                              <span className="bar-label">{team.score} pts</span>
                            </div>
                          </div>
                          <div className="chart-solves">{team.solvedChallenges.length} solves</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <>
          <div className="notification-overlay" onClick={toggleNotificationPanel}></div>
          <div className="notification-panel">
            <div className="panel-header">
              <h3>
                <FaBell />
                Announcements
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={markAllAsRead} className="btn-mark-read">
                  Mark all read
                </button>
                <button className="panel-close" onClick={toggleNotificationPanel}>
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="panel-content">
              {announcements.length === 0 ? (
                <div className="no-notifications">
                  <FaBell />
                  <p>No announcements yet</p>
                </div>
              ) : (
                announcements.map((announcement) => {
                  const getIcon = () => {
                    switch (announcement.type) {
                      case 'info': return <FaInfoCircle />
                      case 'warning': return <FaExclamationTriangle />
                      case 'success': return <FaCheckCircle />
                      default: return <FaBell />
                    }
                  }

                  return (
                    <div key={announcement._id} className={`notification-item ${announcement.type}`}>
                      <div className="notification-icon">
                        {getIcon()}
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          {announcement.pinned && (
                            <span className="notification-type-badge">PINNED</span>
                          )}
                          <h4>{announcement.title}</h4>
                          {announcement.priority === 'high' && (
                            <span className="notification-priority">HIGH</span>
                          )}
                        </div>
                        <p>{announcement.message}</p>
                        {announcement.expiresAt && (
                          <span className="notification-time">
                            <FaClock />
                            Expires: {new Date(announcement.expiresAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Live Announcement Pop-ups */}
      <div className="announcement-popups">
        {announcements
          .filter(announcement => visiblePopups.includes(announcement._id))
          .map((announcement) => {
            const getIcon = () => {
              switch (announcement.type) {
                case 'info': return <FaInfoCircle />
                case 'warning': return <FaExclamationTriangle />
                case 'success': return <FaCheckCircle />
                default: return <FaBell />
              }
            }

            return (
              <div key={announcement._id} className={`announcement-popup ${announcement.type}`}>
                <div className="notification-icon">
                  {getIcon()}
                </div>
                <div className="notification-content">
                  <h4>{announcement.title}</h4>
                  <p>{announcement.message}</p>
                </div>
                <button 
                  className="popup-close" 
                  onClick={() => dismissPopup(announcement._id)}
                  aria-label="Dismiss"
                >
                  <FaTimes />
                </button>
              </div>
            )
          })}
      </div>
    </>
  )
}

export default Leaderboard
