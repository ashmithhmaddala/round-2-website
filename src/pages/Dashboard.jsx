import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaUserPlus, FaCopy, FaRocket } from 'react-icons/fa'
import { getCurrentUser, logout, getUser, createTeam, joinTeam, getTeam, leaveTeam } from '../utils/api'
import CompetitionTimer from '../components/CompetitionTimer'
import AnnouncementBanner from '../components/AnnouncementBanner'
import './Dashboard.css'

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null)
  const [hasTeam, setHasTeam] = useState(false)
  const [teamData, setTeamData] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')
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
    try {
      const result = await createTeam(teamName, currentUser)
      // Immediately re-check team status to update UI
      await checkTeamStatus(currentUser)
      showMessage('Team created successfully!', 'success')
      setTeamName('')
    } catch (error) {
      showMessage('Failed to create team: ' + error.message, 'error')
    }
  }

  const handleJoinTeam = async (e) => {
    e.preventDefault()
    if (teamCode.length !== 6) {
      showMessage('Team code must be 6 digits.', 'error')
      return
    }
    try {
      const result = await joinTeam(teamCode, currentUser)
      // Immediately re-check team status to update UI
      await checkTeamStatus(currentUser)
      showMessage('Successfully joined the team!', 'success')
      setTeamCode('')
    } catch (error) {
      showMessage('Failed to join team: ' + error.message, 'error')
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
    <>
      {/* --- Style Guide and rationale in comments --- */}
      {/*
        Font: 'Inter', system-ui, sans-serif
        Colors: #10131a (bg), #181c24 (surface), #23283a (card), #3b82f6 (accent), #10b981 (accent-green), #6366f1 (accent-violet), #f1f5f9 (text), #94a3b8 (muted)
        Spacing: 0.5rem, 1rem, 2rem, 3rem
        Border radius: 8px, 16px, 24px
        Shadow: 0 4px 32px 0 rgba(59,130,246,0.10)
        Grid: 12-col, 1fr 1fr for cards, 1fr for mobile
        Accessibility: AA/AAA contrast, focus rings, ARIA labels
      */}
      <nav className="dashboard-navbar-upg" aria-label="Main navigation">
        <div className="dashboard-nav-container-upg">
          <div className="dashboard-logo-upg">
            <FaShieldAlt style={{ marginRight: 10, color: '#3b82f6' }} />
            <span className="dashboard-title-upg">Cache Me If You Can</span>
            <span className="dashboard-event-sub-upg">Cybersecurity & Ethical Hacking Club, NHCE</span>
          </div>
          <div className="dashboard-nav-links-upg">
            <span className="dashboard-welcome-upg">Welcome, <b>{currentUser}</b>!</span>
            <button onClick={handleLogout} className="btn-upg btn-secondary-upg dashboard-logout-btn-upg">
              Logout
            </button>
          </div>
        </div>
      </nav>
      <header className="dashboard-hero-upg">
        <div className="dashboard-hero-content-upg">
          <h1>Dashboard</h1>
          <div className="dashboard-hero-underline-upg" />
          <p>Manage your team, track your progress, and get ready for the challenges!</p>
        </div>
      </header>
      <main className="dashboard-main-upg">
        {/* Competition Timer */}
        <div style={{ maxWidth: '1200px', margin: '0 auto 24px auto', padding: '0 16px' }}>
          <CompetitionTimer />
        </div>

        {/* Announcements */}
        <AnnouncementBanner />

        {!hasTeam ? (
          <section className="dashboard-cards-upg" aria-label="Team Management">
            <article className="dashboard-card-upg" aria-labelledby="create-team-heading">
              <header className="dashboard-card-header-upg">
                <h2 id="create-team-heading"><FaUsers style={{ color: '#3b82f6', marginRight: 8 }} /> Create New Team</h2>
              </header>
              <form onSubmit={handleCreateTeam} className="dashboard-form-upg" autoComplete="off" aria-label="Create Team">
                <label htmlFor="teamName" className="dashboard-label-upg">Team Name</label>
                <input
                  type="text"
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  placeholder="Enter team name"
                  className="dashboard-input-upg"
                  aria-required="true"
                  aria-invalid={message.type === 'error' && message.text.includes('Team name') ? 'true' : 'false'}
                />
                <span className="dashboard-error-upg" aria-live="polite">
                  {message.type === 'error' && message.text.includes('Team name') ? message.text : ''}
                </span>
                <button type="submit" className="btn-upg btn-primary-upg dashboard-btn-upg">
                  Create Team
                </button>
              </form>
            </article>
            <div className="dashboard-divider-upg" aria-hidden="true"><span>OR</span></div>
            <article className="dashboard-card-upg" aria-labelledby="join-team-heading">
              <header className="dashboard-card-header-upg">
                <h2 id="join-team-heading"><FaUserPlus style={{ color: '#10b981', marginRight: 8 }} /> Join Existing Team</h2>
              </header>
              <form onSubmit={handleJoinTeam} className="dashboard-form-upg" autoComplete="off" aria-label="Join Team">
                <label htmlFor="teamCode" className="dashboard-label-upg">Team Code</label>
                <input
                  type="text"
                  id="teamCode"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  required
                  placeholder="Enter 6-digit code"
                  className="dashboard-input-upg"
                  pattern="\d{6}"
                  aria-required="true"
                  aria-invalid={message.type === 'error' && message.text.includes('code') ? 'true' : 'false'}
                  inputMode="numeric"
                  maxLength={6}
                />
                <span className="dashboard-error-upg" aria-live="polite">
                  {message.type === 'error' && message.text.includes('code') ? message.text : ''}
                </span>
                <button type="submit" className="btn-upg btn-accent-upg dashboard-btn-upg">
                  Join Team
                </button>
              </form>
            </article>
          </section>
        ) : (
          <section className="dashboard-team-upg" aria-label="Your Team">
            <div className="dashboard-team-card-upg">
              <div className="dashboard-team-header-upg">
                <h2>Your Team</h2>
              </div>
              <div className="dashboard-team-info-upg">
                <div className="dashboard-team-name-row-upg">
                  <span className="dashboard-team-name-upg">{teamData.name}</span>
                  <div className="dashboard-team-code-row-upg">
                    <span className="dashboard-team-code-label-upg">Team Code:</span>
                    <span className="dashboard-team-code-upg">{teamData.code}</span>
                    <button onClick={handleCopyCode} className="btn-upg dashboard-copy-btn-upg" aria-label="Copy team code" tabIndex={0}>
                      <FaCopy style={{ marginRight: 4 }} aria-hidden="true" /> Copy
                    </button>
                  </div>
                </div>
                <div className="dashboard-team-members-card-upg">
                  <span className="dashboard-team-members-label-upg">Team Members</span>
                  <ul className="dashboard-team-members-list-upg">
                    {teamData.members.map((member) => (
                      <li key={member} className="dashboard-team-member-item-upg">
                        {member}
                        {member === teamData.createdBy && <span className="dashboard-badge-upg">Leader</span>}
                        {member === currentUser && <span className="dashboard-badge-self-upg">You</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="dashboard-team-stats-row-upg">
                  <div className="dashboard-team-stat-upg">
                    <span className="dashboard-team-stat-label-upg">Challenges Solved</span>
                    <span className="dashboard-team-stat-value-upg">{teamData.solvedChallenges.length}</span>
                  </div>
                  <div className="dashboard-team-stat-upg">
                    <span className="dashboard-team-stat-label-upg">Total Score</span>
                    <span className="dashboard-team-stat-value-upg">{teamData.score}</span>
                  </div>
                </div>
                <div className="dashboard-team-actions-row-upg">
                  <button onClick={() => navigate('/challenges')} className="btn-upg btn-primary-upg dashboard-team-action-btn-upg" aria-label="Start Challenges" tabIndex={0}>
                    <FaRocket style={{ marginRight: 6 }} aria-hidden="true" /> Start Challenges
                  </button>
                  <button onClick={handleLeaveTeam} className="btn-upg dashboard-team-leave-btn-upg dashboard-team-action-btn-upg" aria-label="Leave Team" tabIndex={0}>
                    Leave Team
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {message.text && (
          <div
            className={`message ${message.type} dashboard-message`}
            style={{ display: 'block' }}
            role={message.type === 'error' ? 'alert' : 'status'}
            aria-live={message.type === 'error' ? 'assertive' : 'polite'}
            tabIndex={-1}
          >
            {message.text}
          </div>
        )}
      </main>
    </>
  )
}

export default Dashboard
