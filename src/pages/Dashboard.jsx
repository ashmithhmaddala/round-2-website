import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaUserPlus, FaCopy, FaRocket, FaSignOutAlt, FaTrophy, FaChartLine, FaClock, FaTimes, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaBell, FaMedal } from 'react-icons/fa'
import { getCurrentUser, logout, getUser, createTeam, joinTeam, getTeam, leaveTeam, API_URL } from '../utils/api'
import logo from '../assets/cseh_final_logo.png'
import './Dashboard.css'

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [hasTeam, setHasTeam] = useState(false)
  const [teamData, setTeamData] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [competition, setCompetition] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [shownAnnouncements, setShownAnnouncements] = useState(new Set())
  const [visiblePopups, setVisiblePopups] = useState([])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [isJoiningTeam, setIsJoiningTeam] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const username = getCurrentUser()
    if (!username) {
      navigate('/')
      return
    }
    setCurrentUser(username)
    checkTeamStatus(username)

    // Periodically check if session is still valid (every 60 seconds)
    const sessionCheckInterval = setInterval(() => {
      const stillValid = getCurrentUser()
      if (!stillValid) {
        navigate('/')
      }
    }, 60000) // Check every minute

    return () => clearInterval(sessionCheckInterval)
  }, [navigate])

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
        
        // Get last read timestamp from localStorage
        const lastReadTime = localStorage.getItem('lastReadTime') || '0'
        const lastReadTimestamp = parseInt(lastReadTime)
        
        // On first load, mark all existing announcements as already shown (don't pop them up)
        if (shownAnnouncements.size === 0 && data.announcements.length > 0) {
          const existingIds = new Set(data.announcements.map(a => a._id))
          setShownAnnouncements(existingIds)
          
          // Count only announcements created after last read time
          const unreadAnnouncements = data.announcements.filter(
            a => new Date(a.createdAt).getTime() > lastReadTimestamp
          )
          setUnreadCount(unreadAnnouncements.length)
        } else {
          // Show only NEW announcements as pop-ups
          const newAnnouncements = data.announcements.filter(
            announcement => !shownAnnouncements.has(announcement._id)
          )
          
          if (newAnnouncements.length > 0) {
            newAnnouncements.forEach(announcement => {
              setShownAnnouncements(prev => new Set([...prev, announcement._id]))
              setVisiblePopups(prev => [...prev, announcement._id])
              
              // Auto-dismiss after 30 seconds
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
    // Save current timestamp to localStorage
    localStorage.setItem('lastReadTime', Date.now().toString())
  }

  const clearAllAnnouncements = () => {
    setVisiblePopups([])
  }

  const checkTeamStatus = async (username) => {
    try {
      const user = await getUser(username)
      if (user && user.teamId) {
        const team = await getTeam(user.teamId)
        setTeamData(team)
        setHasTeam(true)
      } else {
        setHasTeam(false)
      }
    } catch (error) {
      console.error('Error checking team status:', error)
      setHasTeam(false)
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    if (teamName.length < 3) {
      showMessage('Team name must be at least 3 characters long.', 'error')
      return
    }
    
    setIsCreatingTeam(true)
    try {
      const result = await createTeam(teamName, currentUser)
      // Immediately re-check team status to update UI
      await checkTeamStatus(currentUser)
      showMessage('Team created successfully!', 'success')
      setTeamName('')
    } catch (error) {
      showMessage('Failed to create team: ' + error.message, 'error')
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const handleJoinTeam = async (e) => {
    e.preventDefault()
    if (teamCode.length !== 6) {
      showMessage('Team code must be 6 digits.', 'error')
      return
    }
    
    setIsJoiningTeam(true)
    try {
      const result = await joinTeam(teamCode, currentUser)
      // Immediately re-check team status to update UI
      await checkTeamStatus(currentUser)
      showMessage('Successfully joined the team!', 'success')
      setTeamCode('')
    } catch (error) {
      showMessage('Failed to join team: ' + error.message, 'error')
    } finally {
      setIsJoiningTeam(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(teamData.code).then(() => {
      showMessage('Team code copied to clipboard!', 'success')
    })
  }

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return
    try {
      await leaveTeam(currentUser, teamData.code)
      showMessage('You have left the team.', 'success')
      setHasTeam(false)
      setTeamData(null)
    } catch (error) {
      showMessage('Failed to leave team: ' + error.message, 'error')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!currentUser) {
    return <div>Loading...</div>
  }
  if (hasTeam && !teamData) {
    return <div>Loading team data...</div>
    navigate('/')
  }

  return (
    <div className="dashboard-container">
      {/* Navigation */}
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
              onClick={() => navigate('/leaderboard')} 
              className="btn-dashboard"
              title="View Leaderboard"
            >
              <FaMedal />
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
            <button onClick={handleLogout} className="btn-logout">
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        <div className="content-wrapper">
          {/* Page Header */}
          <div className="page-header">
            <div className="header-content">
              <h2>Team Dashboard</h2>
              <p className="header-subtitle">Manage your team and compete in challenges</p>
            </div>
          </div>

          {/* Team Management */}
          {!hasTeam ? (
            <div className="team-setup">
              <div className="setup-grid">
                {/* Create Team Card */}
                <div className="setup-card create-card">
                  <div className="setup-card-header">
                    <div className="card-icon-wrapper create">
                      <FaUsers />
                    </div>
                  </div>
                  <div className="setup-card-content">
                    <h3>Create Team</h3>
                    <p className="card-description">Establish a new team and invite members using a secure team code</p>
                  </div>
                  <form onSubmit={handleCreateTeam} className="setup-form">
                    <div className="input-field">
                      <label htmlFor="teamName">Team Name</label>
                      <input
                        type="text"
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                        required
                        className="input-primary"
                      />
                    </div>
                    <button type="submit" className="btn-action btn-create" disabled={isCreatingTeam}>
                      <FaUsers />
                      <span>{isCreatingTeam ? 'Creating...' : 'Create Team'}</span>
                    </button>
                  </form>
                </div>

                {/* Join Team Card */}
                <div className="setup-card join-card">
                  <div className="setup-card-header">
                    <div className="card-icon-wrapper join">
                      <FaUserPlus />
                    </div>
                  </div>
                  <div className="setup-card-content">
                    <h3>Join Team</h3>
                    <p className="card-description">Enter your team's 6-digit access code to join</p>
                  </div>
                  <form onSubmit={handleJoinTeam} className="setup-form">
                    <div className="input-field">
                      <label htmlFor="teamCode">Team Code</label>
                      <input
                        type="text"
                        id="teamCode"
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value)}
                        placeholder="000000"
                        required
                        maxLength={6}
                        pattern="\d{6}"
                        inputMode="numeric"
                        className="input-primary input-code"
                      />
                    </div>
                    <button type="submit" className="btn-action btn-join" disabled={isJoiningTeam}>
                      <FaUserPlus />
                      <span>{isJoiningTeam ? 'Joining...' : 'Join Team'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="team-overview">
              {/* Team Header */}
              <div className="team-info-banner">
                <div className="banner-left">
                  <div className="team-badge">
                    <FaUsers />
                  </div>
                  <div className="team-details">
                    <h3 className="team-title">{teamData.name}</h3>
                    <div className="team-meta">
                      <span className="meta-label">Team ID</span>
                      <span className="meta-value">{teamData.code}</span>
                      <button onClick={handleCopyCode} className="btn-copy-code">
                        <FaCopy />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="banner-right">
                  <div className="team-score-display">
                    <div className="score-item">
                      <span className="score-label">Score</span>
                      <span className="score-value">{teamData.score}</span>
                    </div>
                    <div className="score-divider"></div>
                    <div className="score-item">
                      <span className="score-label">Solved</span>
                      <span className="score-value">{teamData.solvedChallenges.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Grid */}
              <div className="dashboard-grid">
                {/* Members Card */}
                <div className="info-card members-section">
                  <div className="info-card-header">
                    <div className="header-title">
                      <FaUsers />
                      <h4>Team Members</h4>
                    </div>
                    <div className="count-badge">{teamData.members.length}/3</div>
                  </div>
                  <div className="card-body">
                    <div className="members-list">
                      {teamData.members.map((member) => (
                        <div key={member} className="member-row">
                          <div className="member-avatar">
                            {member.charAt(0).toUpperCase()}
                          </div>
                          <div className="member-data">
                            <span className="member-name">{member}</span>
                            <div className="member-badges">
                              {member === teamData.createdBy && (
                                <span className="badge badge-leader">Leader</span>
                              )}
                              {member === currentUser && (
                                <span className="badge badge-current">You</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button onClick={() => navigate('/challenges')} className="btn-primary-action">
                  <span>Start Challenges</span>
                </button>
                <button onClick={handleLeaveTeam} className="btn-danger-action">
                  <span>Leave Team</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Message */}
      {message.text && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Notification Panel */}
      {showNotificationPanel && (
        <>
          <div 
            className="notification-overlay" 
            onClick={toggleNotificationPanel}
          />
          <div className="notification-panel">
            <div className="panel-header">
              <h3>
                <FaBell />
                <span>Notifications</span>
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={markAllAsRead} className="btn-mark-read">
                  Mark all read
                </button>
                <button 
                  onClick={toggleNotificationPanel} 
                  className="panel-close"
                  aria-label="Close notifications"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="panel-content">
              {announcements.length === 0 ? (
                <div className="no-notifications">
                  <FaBell />
                  <p>No announcements</p>
                </div>
              ) : (
                announcements.map((announcement) => {
                  const getIcon = () => {
                    switch (announcement.type) {
                      case 'info': return <FaInfoCircle />
                      case 'warning': return <FaExclamationTriangle />
                      case 'success': return <FaCheckCircle />
                      case 'error': return <FaTimesCircle />
                      case 'urgent': return <FaBell />
                      default: return <FaInfoCircle />
                    }
                  }

                  return (
                    <div 
                      key={announcement._id} 
                      className={`notification-item ${announcement.type}`}
                    >
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
          .filter(a => visiblePopups.includes(a._id))
          .slice(0, 3)
          .map((announcement, index) => {
            const getIcon = () => {
              switch (announcement.type) {
                case 'info': return <FaInfoCircle />
                case 'warning': return <FaExclamationTriangle />
                case 'success': return <FaCheckCircle />
                case 'error': return <FaTimesCircle />
                case 'urgent': return <FaBell />
                default: return <FaInfoCircle />
              }
            }

            return (
              <div 
                key={announcement._id} 
                className={`announcement-popup ${announcement.type} ${announcement.pinned ? 'pinned' : ''}`}
                style={{ bottom: `${1 + (index * 6.5)}rem` }}
              >
                <div className="popup-icon">
                  {getIcon()}
                </div>
                <div className="popup-content">
                  {announcement.pinned && <span className="popup-badge">PINNED</span>}
                  <h4>{announcement.title}</h4>
                  <p>{announcement.message}</p>
                  {announcement.priority === 'high' && (
                    <span className="popup-priority">High Priority</span>
                  )}
                </div>
                <button 
                  onClick={() => dismissPopup(announcement._id)} 
                  className="popup-close"
                  aria-label="Dismiss announcement"
                >
                  <FaTimes />
                </button>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default Dashboard
