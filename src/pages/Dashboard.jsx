import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaUserPlus, FaCopy, FaRocket } from 'react-icons/fa'
import { getCurrentUser, logout, getUser, createTeam, joinTeam, getTeam, leaveTeam } from '../utils/api'

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
      setTeamData(result.team)
      setHasTeam(true)
      showMessage('Team created successfully! Redirecting to challenges...', 'success')
      setTimeout(() => navigate('/challenges'), 1000)
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
      setTeamData(result.team)
      setHasTeam(true)
      showMessage('Successfully joined the team! Redirecting to challenges...', 'success')
      setTimeout(() => navigate('/challenges'), 1000)
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
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo-small">
            <FaShieldAlt /> OSINT & Crypto CTF
          </div>
          <div className="nav-links">
            <span>Welcome, {currentUser}!</span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        {!hasTeam ? (
          <div className="dashboard-box">
            <h2>Team Management</h2>
            <p className="subtitle">Create a new team or join an existing one to start competing!</p>

            <div className="team-options">
              <div className="option-card">
                <h3>
                  <FaUsers /> Create New Team
                </h3>
                <form onSubmit={handleCreateTeam}>
                  <div className="input-group">
                    <label htmlFor="teamName">Team Name</label>
                    <input
                      type="text"
                      id="teamName"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      required
                      placeholder="Enter team name"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Create Team
                  </button>
                </form>
              </div>

              <div className="option-divider">
                <span>OR</span>
              </div>

              <div className="option-card">
                <h3>
                  <FaUserPlus /> Join Existing Team
                </h3>
                <form onSubmit={handleJoinTeam}>
                  <div className="input-group">
                    <label htmlFor="teamCode">Team Code</label>
                    <input
                      type="text"
                      id="teamCode"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value)}
                      required
                      placeholder="Enter 6-digit code"
                    />
                  </div>
                  <button type="submit" className="btn btn-success">
                    Join Team
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-box">
            <h2>Your Team</h2>

            <div className="team-info">
              <div className="team-header">
                <h3>{teamData.name}</h3>
                <div className="team-code-display">
                  <span>
                    Team Code: <strong>{teamData.code}</strong>
                  </span>
                  <button onClick={handleCopyCode} className="btn btn-small">
                    <FaCopy /> Copy
                  </button>
                </div>
              </div>

              <div className="team-members">
                <h4>Team Members</h4>
                <ul>
                  {teamData.members.map((member) => (
                    <li key={member}>
                      {member}
                      {member === teamData.createdBy && <span className="badge">Leader</span>}
                      {member === currentUser && <span className="badge-self">You</span>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="team-stats">
                <div className="stat-card">
                  <span className="stat-label">Challenges Solved</span>
                  <span className="stat-value">{teamData.solvedChallenges.length}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Total Score</span>
                  <span className="stat-value">{teamData.score}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={() => navigate('/challenges')} className="btn btn-primary">
                  <FaRocket /> Start Challenges
                </button>
                <button onClick={handleLeaveTeam} className="btn btn-danger">
                  Leave Team
                </button>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`message ${message.type}`} style={{ display: 'block' }}>
            {message.text}
          </div>
        )}
      </div>
    </>
  )
}

export default Dashboard
