import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaSearch, FaLock, FaUsers, FaBell, FaClock, FaTimes, FaInfoCircle, FaExclamationTriangle, FaCheckCircle, FaSignOutAlt, FaHome } from 'react-icons/fa'
import { getCurrentUser, logout, getUser, getTeam, getChallenges, submitFlag, API_URL } from '../utils/api'
import '../pages/Dashboard.css'
import './Challenges.css'

function Challenges() {
  const [currentUser, setCurrentUser] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [activeCategory, setActiveCategory] = useState('osint')
  const [modalOpen, setModalOpen] = useState(false)
  const [currentChallenge, setCurrentChallenge] = useState(null)
  const [flagInput, setFlagInput] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [competition, setCompetition] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [shownAnnouncements, setShownAnnouncements] = useState(new Set())
  const [visiblePopups, setVisiblePopups] = useState([])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      const username = getCurrentUser()
      if (!username) {
        navigate('/')
        return
      }

      try {
        const user = await getUser(username)
        if (!user || !user.teamId) {
          alert('You must join a team first!')
          navigate('/dashboard')
          return
        }

        setCurrentUser(username)
        const [team, challengesData] = await Promise.all([
          getTeam(user.teamId),
          getChallenges()
        ])
        setTeamData(team)
        setChallenges(challengesData)
      } catch (error) {
        console.error('Error loading data:', error)
        navigate('/dashboard')
      }
    }
    loadData()

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
        
        // On first load, mark all existing announcements as already shown
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

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case 'info': return <FaInfoCircle />
      case 'warning': return <FaExclamationTriangle />
      case 'success': return <FaCheckCircle />
      default: return <FaBell />
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleOpenChallenge = (challenge) => {
    if (teamData.solvedChallenges.includes(challenge.id)) {
      showMessage('This challenge has already been solved by your team!', 'info')
      return
    }
    setCurrentChallenge(challenge)
    setModalOpen(true)
    setFlagInput('')
  }

  const handleSubmitFlag = async () => {
    if (!flagInput.trim()) {
      showMessage('Please enter a flag!', 'error')
      return
    }

    try {
      const result = await submitFlag(currentChallenge.id, flagInput, currentUser, teamData.code)
      if (result.success) {
        const updatedTeam = await getTeam(teamData.code)
        setTeamData(updatedTeam)
        showMessage(`Correct! +${result.points} points`, 'success')
        setModalOpen(false)
        setCurrentChallenge(null)
      } else if (result.error && result.error.toLowerCase().includes('too many')) {
        showMessage('You are submitting flags too quickly. Please wait a minute and try again.', 'warning')
      } else {
        showMessage(result.message || 'Incorrect flag. Try again!', 'error')
      }
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('too many')) {
        showMessage('You are submitting flags too quickly. Please wait a minute and try again.', 'warning')
      } else {
        showMessage('Error submitting flag: ' + error.message, 'error')
      }
    }
  }

  const getChallengesByCategory = (category) => {
    return challenges.filter(ch => ch.category === category)
  }

  return (
    <>
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <div className="brand-icon">
              <FaShieldAlt />
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

      <main className="challenges-main">
        <div className="challenges-wrapper">
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-icon score-icon">
                <FaShieldAlt />
              </div>
              <div className="stat-content">
                <span className="stat-label">Team Score</span>
                <span className="stat-value">{teamData?.score || 0}</span>
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="category-selector">
            <button
              className={`category-btn ${activeCategory === 'osint' ? 'active' : ''}`}
              onClick={() => setActiveCategory('osint')}
            >
              <div className="category-icon osint">
                <FaSearch />
              </div>
              <span className="category-name">OSINT</span>
            </button>
            <button
              className={`category-btn ${activeCategory === 'crypto' ? 'active' : ''}`}
              onClick={() => setActiveCategory('crypto')}
            >
              <div className="category-icon crypto">
                <FaLock />
              </div>
              <span className="category-name">Cryptography</span>
            </button>
          </div>

          {/* OSINT Challenges */}
          <div className={`challenges-section ${activeCategory === 'osint' ? 'active' : ''}`}>
            <div className="section-header">
              <h2>OSINT Challenges</h2>
              <span className="challenge-count">{getChallengesByCategory('osint').length} {getChallengesByCategory('osint').length === 1 ? 'Challenge' : 'Challenges'}</span>
            </div>
            {getChallengesByCategory('osint').length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaSearch />
                </div>
                <h3>No OSINT challenges available</h3>
                <p>Check back soon for exciting challenges to test your investigation skills!</p>
              </div>
            ) : (
            <div className="challenges-grid">
            {getChallengesByCategory('osint').map((challenge) => (
              <div
                key={challenge.id}
                className={`challenge-card ${teamData?.solvedChallenges.includes(challenge.id) ? 'solved' : ''}`}
              >
                <div className="challenge-header">
                  <h3>{challenge.title}</h3>
                  <span className={`difficulty ${challenge.difficulty}`}>{challenge.difficulty}</span>
                </div>
                <p className="challenge-description">
                  {challenge.description.substring(0, 120)}
                  {challenge.description.length > 120 ? '...' : ''}
                </p>
                <div className="challenge-footer">
                  <div className="challenge-meta">
                    <span className="points">{challenge.points} pts</span>
                    {challenge.solvedBy && challenge.solvedBy.length > 0 && (
                      <span className="solve-count">{challenge.solvedBy.length} {challenge.solvedBy.length === 1 ? 'solve' : 'solves'}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenChallenge(challenge)}
                    className="btn btn-small"
                    disabled={teamData?.solvedChallenges.includes(challenge.id)}
                  >
                    {teamData?.solvedChallenges.includes(challenge.id) ? '✓ Completed' : 'Start Challenge'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

          {/* Crypto Challenges */}
          <div className={`challenges-section ${activeCategory === 'crypto' ? 'active' : ''}`}>
            <div className="section-header">
              <h2>Cryptography Challenges</h2>
              <span className="challenge-count">{getChallengesByCategory('crypto').length} {getChallengesByCategory('crypto').length === 1 ? 'Challenge' : 'Challenges'}</span>
            </div>
            {getChallengesByCategory('crypto').length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FaLock />
                </div>
                <h3>No Cryptography challenges available</h3>
                <p>Check back soon for exciting challenges to test your decryption skills!</p>
              </div>
            ) : (
            <div className="challenges-grid">
            {getChallengesByCategory('crypto').map((challenge) => (
              <div
                key={challenge.id}
                className={`challenge-card ${teamData?.solvedChallenges.includes(challenge.id) ? 'solved' : ''}`}
              >
                <div className="challenge-header">
                  <h3>{challenge.title}</h3>
                  <span className={`difficulty ${challenge.difficulty}`}>{challenge.difficulty}</span>
                </div>
                <p className="challenge-description">
                  {challenge.description.substring(0, 120)}
                  {challenge.description.length > 120 ? '...' : ''}
                </p>
                <div className="challenge-footer">
                  <div className="challenge-meta">
                    <span className="points">{challenge.points} pts</span>
                    {challenge.solvedBy && challenge.solvedBy.length > 0 && (
                      <span className="solve-count">{challenge.solvedBy.length} {challenge.solvedBy.length === 1 ? 'solve' : 'solves'}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenChallenge(challenge)}
                    className="btn btn-small"
                    disabled={teamData?.solvedChallenges.includes(challenge.id)}
                  >
                    {teamData?.solvedChallenges.includes(challenge.id) ? '✓ Completed' : 'Start Challenge'}
                  </button>
                </div>
              </div>
            ))}
          </div>
            )}
          </div>

        </div>

        {message.text && (
          <div className={`message ${message.type}`} style={{ display: 'block', background: message.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : undefined, color: message.type === 'warning' ? '#f59e0b' : undefined, border: message.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.3)' : undefined }}>
            {message.text}
          </div>
        )}
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
          .map((announcement) => (
            <div key={announcement._id} className={`announcement-popup ${announcement.type}`}>
              <div className="notification-icon">
                {getAnnouncementIcon(announcement.type)}
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
          ))}
      </div>

      {modalOpen && currentChallenge && (
        <div className="modal" style={{ display: 'block' }}>
          <div className="modal-content">
            <span className="close" onClick={() => setModalOpen(false)}>
              &times;
            </span>
            <div className="modal-header-section">
              <h2>{currentChallenge.title}</h2>
              <div className="modal-badges">
                <span className={`difficulty ${currentChallenge.difficulty}`}>{currentChallenge.difficulty}</span>
                <span className="modal-points">{currentChallenge.points} points</span>
              </div>
            </div>
            <div className="modal-description">
              <h4>Challenge Description</h4>
              <p>{currentChallenge.description}</p>
            </div>
            <div className="input-group">
              <label htmlFor="flagInput">Submit Your Flag</label>
              <input
                type="text"
                id="flagInput"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitFlag()}
                placeholder="flag{your_answer_here}"
                autoFocus
              />
              <small className="input-hint">Press Enter or click Submit to validate your flag</small>
            </div>
            <button onClick={handleSubmitFlag} className="btn btn-primary">
              Submit Flag
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Challenges
