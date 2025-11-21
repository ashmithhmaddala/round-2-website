import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaSearch, FaLock } from 'react-icons/fa'
import { getCurrentUser, logout, getUser, getTeam, getChallenges, submitFlag } from '../utils/api'

function Challenges() {
  const [currentUser, setCurrentUser] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [activeCategory, setActiveCategory] = useState('osint')
  const [modalOpen, setModalOpen] = useState(false)
  const [currentChallenge, setCurrentChallenge] = useState(null)
  const [flagInput, setFlagInput] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
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
  }, [navigate])

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
      } else {
        showMessage(result.message || 'Incorrect flag. Try again!', 'error')
      }
    } catch (error) {
      showMessage('Error submitting flag: ' + error.message, 'error')
    }
  }

  const getChallengesByCategory = (category) => {
    return challenges.filter(ch => ch.category === category)
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo-small">
            <FaShieldAlt /> OSINT & Crypto CTF
          </div>
          <div className="nav-links">
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }} className="nav-link">
              Team Dashboard
            </a>
            <span>Team: {teamData?.name}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="challenges-header">
          <div>
            <h1>Challenge Arena</h1>
            <p className="challenges-subtitle">Test your skills and solve challenges to earn points for your team</p>
          </div>
          <div className="score-display">
            <div className="score-label">Team Score</div>
            <strong>{teamData?.score || 0}</strong>
            <div className="score-unit">points</div>
          </div>
        </div>

        <div className="category-tabs">
          <button
            className={`tab-btn ${activeCategory === 'osint' ? 'active' : ''}`}
            onClick={() => setActiveCategory('osint')}
          >
            <FaSearch /> OSINT
          </button>
          <button
            className={`tab-btn ${activeCategory === 'crypto' ? 'active' : ''}`}
            onClick={() => setActiveCategory('crypto')}
          >
            <FaLock /> Cryptography
          </button>
        </div>

        <div className={`challenges-container ${activeCategory === 'osint' ? 'active' : ''}`}>
          <h2>OSINT Challenges</h2>
          {getChallengesByCategory('osint').length === 0 ? (
            <div className="empty-challenges">
              <FaSearch style={{ fontSize: '48px', color: '#4a90e2', marginBottom: '16px' }} />
              <h3>No OSINT challenges available yet</h3>
              <p>Check back soon for exciting challenges to test your investigation skills!</p>
            </div>
          ) : (
          <div className="challenges-grid">
            {getChallengesByCategory('osint').map((challenge) => (
              <div
                key={challenge.id}
                className={`challenge-card ${teamData?.solvedChallenges.includes(challenge.id) ? 'solved' : ''}`}
                data-challenge-id={challenge.id}
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

        <div className={`challenges-container ${activeCategory === 'crypto' ? 'active' : ''}`}>
          <h2>Cryptography Challenges</h2>
          {getChallengesByCategory('crypto').length === 0 ? (
            <div className="empty-challenges">
              <FaLock style={{ fontSize: '48px', color: '#8b5cf6', marginBottom: '16px' }} />
              <h3>No Cryptography challenges available yet</h3>
              <p>Check back soon for exciting challenges to test your decryption skills!</p>
            </div>
          ) : (
          <div className="challenges-grid">
            {getChallengesByCategory('crypto').map((challenge) => (
              <div
                key={challenge.id}
                className={`challenge-card ${teamData?.solvedChallenges.includes(challenge.id) ? 'solved' : ''}`}
                data-challenge-id={challenge.id}
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

        {message.text && (
          <div className={`message ${message.type}`} style={{ display: 'block' }}>
            {message.text}
          </div>
        )}
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
