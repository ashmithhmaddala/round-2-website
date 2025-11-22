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
      <style jsx="true">{`
        /*
          --- Style Guide ---
          
          Font:
            - 'Inter', system-ui, sans-serif for modern, readable, and accessible text.
          
          Colors:
            --color-bg: #10131a;           /* App background, deep navy for eye comfort */
            --color-surface: #181c24;      /* Surfaces, cards, and form backgrounds */
            --color-card: #23283a;         /* Main card backgrounds for strong contrast */
            --color-accent: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%); /* Primary accent, blue-violet gradient for CTAs */
            --color-accent-green: linear-gradient(90deg, #10b981 0%, #3b82f6 100%); /* Success accent, green-blue gradient */
            --color-accent-violet: linear-gradient(90deg, #6366f1 0%, #a21caf 100%); /* Alternate accent, violet gradient */
            --color-border: #23283a;       /* Card and divider borders */
            --color-text: #f1f5f9;         /* Main text, high contrast */
            --color-text-muted: #94a3b8;   /* Muted/secondary text */
            --color-error: #ef4444;        /* Error states, red */
            --color-focus: #3b82f6;        /* Focus ring, blue for accessibility */
          
          Spacing:
            --space-xs: 0.5rem;            /* Extra small spacing, for tight gaps */
            --space-sm: 1rem;              /* Small spacing, for padding and margins */
            --space-md: 2rem;              /* Medium spacing, for card padding */
            --space-lg: 3rem;              /* Large spacing, for section separation */
          
          Border radius:
            --radius-sm: 8px;              /* Small radius, for buttons and inputs */
            --radius-md: 16px;             /* Medium radius, for cards and containers */
            --radius-lg: 24px;             /* Large radius, for hero and main cards */
          
          Shadow:
            --shadow-card: 0 4px 32px 0 rgba(59, 130, 246, 0.13); /* Card shadow, subtle blue for depth */
            --shadow-btn: 0 2px 8px 0 rgba(59, 130, 246, 0.18);   /* Button shadow, for affordance */
          
          Grid:
            - 12-column grid for main layout.
            - Cards: 1fr 1fr on desktop, 1fr on mobile for stacking.
          
          Accessibility:
            - All color choices meet AA/AAA contrast.
            - Focus rings on all interactive elements.
            - ARIA labels and roles for forms, buttons, and alerts.
            - Error state placeholders for form validation.
          
          Rationale:
            - Design tokens are centralized as CSS variables for easy theming and maintainability.
            - Gradients and accent colors are used for primary actions and highlights, not backgrounds, to avoid visual fatigue.
            - Spacing and radii are consistent for a unified, professional look.
            - Shadows are subtle to avoid distraction but provide clear separation.
        */
        :root {
          --color-bg: #10131a;
          --color-surface: #181c24;
          --color-card: #23283a;
          --color-accent: linear-gradient(90deg, #3b82f6 0%, #6366f1 100%);
          --color-accent-green: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
          --color-accent-violet: linear-gradient(90deg, #6366f1 0%, #a21caf 100%);
          --color-border: #23283a;
          --color-text: #f1f5f9;
          --color-text-muted: #94a3b8;
          --color-error: #ef4444;
          --color-focus: #3b82f6;
          --space-xs: 0.5rem;
          --space-sm: 1rem;
          --space-md: 2rem;
          --space-lg: 3rem;
          --radius-sm: 8px;
          --radius-md: 16px;
          --radius-lg: 24px;
          --shadow-card: 0 4px 32px 0 rgba(59, 130, 246, 0.13);
          --shadow-btn: 0 2px 8px 0 rgba(59, 130, 246, 0.18);
          --transition: 0.18s cubic-bezier(.4,0,.2,1);
        }
        body, .dashboard-main_upg {
          background: var(--color-bg);
          color: var(--color-text);
          font-family: 'Inter', system-ui, sans-serif;
        }
        .dashboard-navbar-upg {
          background: var(--color-surface);
          border-bottom: 1.5px solid var(--color-border);
          box-shadow: var(--shadow-card);
          padding: 0;
        }
        .dashboard-nav-container-upg {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-sm) var(--space-md);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dashboard-logo-upg {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }
        .dashboard-title-upg {
          font-weight: 800;
          font-size: 1.2rem;
          letter-spacing: -1px;
          color: #3b82f6;
        }
        .dashboard-event-sub-upg {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          font-weight: 500;
          margin-left: var(--space-xs);
        }
        .dashboard-nav-links-upg {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .dashboard-welcome-upg {
          color: var(--color-text);
          font-size: 1rem;
        }
        .dashboard-logout-btn-upg {
          font-size: 1rem;
          padding: 10px 22px;
        }
        .btn-upg {
          border: none;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 1rem;
          padding: 0.75em 1.5em;
          cursor: pointer;
          transition: box-shadow var(--transition), background var(--transition);
          box-shadow: var(--shadow-btn);
          outline: none;
        }
        .btn-primary-upg {
          background: var(--color-accent);
          color: #fff;
        }
        .btn-primary-upg:focus, .btn-primary-upg:hover {
          box-shadow: 0 0 0 3px #3b82f6aa;
        }
        .btn-accent-upg {
          background: var(--color-accent-green);
          color: #fff;
        }
        .btn-accent-upg:focus, .btn-accent-upg:hover {
          box-shadow: 0 0 0 3px #10b981aa;
        }
        .btn-secondary-upg {
          background: var(--color-card);
          color: var(--color-text);
        }
        .btn-secondary-upg:focus, .btn-secondary-upg:hover {
          background: var(--color-surface);
          box-shadow: 0 0 0 3px #6366f1aa;
        }
        .btn-upg:active {
          filter: brightness(0.97);
        }
        .dashboard-card-upg {
          background: linear-gradient(120deg, #23283a 80%, #23283a 100%);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: var(--space-lg) var(--space-md);
          border: 1.5px solid var(--color-border);
          display: flex;
          flex-direction: column;
          min-width: 0;
          transition: box-shadow var(--transition);
          position: relative;
        }
        .dashboard-card-header-upg {
          margin-bottom: var(--space-md);
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }
        .dashboard-card-header-upg h2 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }
        .dashboard-form-upg {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .dashboard-label-upg {
          color: var(--color-text-muted);
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25em;
        }
        .dashboard-input-upg {
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 1rem;
          padding: 0.9em 1.1em;
          transition: border-color var(--transition), box-shadow var(--transition);
          outline: none;
        }
        .dashboard-input-upg:focus {
          border-color: var(--color-focus);
          box-shadow: 0 0 0 3px #3b82f655;
        }
        .dashboard-input-upg[aria-invalid="true"] {
          border-color: var(--color-error);
        }
        .dashboard-error-upg {
          color: var(--color-error);
          font-size: 0.95rem;
          min-height: 1.2em;
          margin-bottom: 0.25em;
          display: block;
        }
        .dashboard-hero-upg {
          background: linear-gradient(90deg, #23283a 0%, #3b82f6 100%);
          padding: var(--space-lg) 0 var(--space-md) 0;
          text-align: center;
          position: relative;
        }
        .dashboard-hero-content-upg {
          max-width: 600px;
          margin: 0 auto;
        }
        .dashboard-hero-content-upg h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
          color: #fff;
          letter-spacing: -1px;
        }
        .dashboard-hero-underline-upg {
          width: 60px;
          height: 4px;
          margin: 0.5em auto 1em auto;
          background: var(--color-accent);
          border-radius: 2px;
        }
        .dashboard-hero-content-upg p {
          color: var(--color-text-muted);
          font-size: 1.1rem;
          margin: 0;
        }
        .dashboard-main-upg {
          max-width: 1100px;
          margin: -2.5rem auto 0 auto;
          padding: 0 var(--space-md) var(--space-lg) var(--space-md);
        }
        .dashboard-cards-upg {
          display: grid;
          grid-template-columns: 1fr 60px 1fr;
          gap: var(--space-lg);
          align-items: start;
          margin-top: 2.5rem; /* Push cards further down from hero */
        }
        .dashboard-divider-upg {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .dashboard-divider-upg span {
          background: var(--color-bg);
          color: #3b82f6;
          font-weight: 700;
          border-radius: 50%;
          border: 1.5px solid var(--color-border);
          padding: 0.5em 1.2em;
          font-size: 1.1rem;
          box-shadow: var(--shadow-btn);
        }
        .dashboard-team-upg {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2.5rem 0 3rem 0;
        }
        .dashboard-team-card-upg {
          background: var(--color-card);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          padding: 2.5rem 2rem 2rem 2rem;
          width: 100%;
          max-width: 700px;
          border: 1.5px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .dashboard-team-header-upg h2 {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }
        .dashboard-team-info-upg {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .dashboard-team-name-row-upg {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 1.2rem 1.5rem 1.2rem 1.5rem;
          margin-bottom: 0.5rem;
        }
        .dashboard-team-name-upg {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 0.2rem;
        }
        .dashboard-team-code-row-upg {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .dashboard-team-code-label-upg {
          color: var(--color-text-muted);
          font-size: 1rem;
        }
        .dashboard-team-code-upg {
          color: #10b981;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .dashboard-copy-btn-upg {
          background: #fff;
          color: #23283a;
          font-weight: 700;
          border-radius: var(--radius-sm);
          padding: 0.4em 1.1em;
          font-size: 1rem;
          margin-left: 0.5rem;
          box-shadow: var(--shadow-btn);
          border: none;
          transition: box-shadow var(--transition), background var(--transition);
        }
        .dashboard-copy-btn-upg:focus, .dashboard-copy-btn-upg:hover {
          background: #e0e7ef;
          box-shadow: 0 0 0 3px #3b82f6aa;
        }
        .dashboard-team-members-card-upg {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 1.1rem 1.5rem;
        }
        .dashboard-team-members-label-upg {
          color: var(--color-text-muted);
          font-weight: 700;
          font-size: 1.1rem;
          margin-bottom: 0.7rem;
          display: block;
        }
        .dashboard-team-members-list-upg {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
        }
        .dashboard-team-member-item-upg {
          background: #181c24;
          color: #fff;
          border-radius: var(--radius-sm);
          padding: 0.5em 1.1em;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dashboard-badge-upg {
          background: #3b82f6;
          color: #fff;
          border-radius: 12px;
          font-size: 0.85rem;
          padding: 0.2em 0.8em;
          margin-left: 0.5rem;
        }
        .dashboard-badge-self-upg {
          background: #10b981;
          color: #10172a;
          border-radius: 12px;
          font-size: 0.85rem;
          padding: 0.2em 0.8em;
          margin-left: 0.5rem;
        }
        .dashboard-team-stats-row-upg {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
          margin-bottom: 0.5rem;
        }
        .dashboard-team-stat-upg {
          background: var(--color-surface);
          border-radius: var(--radius-md);
          padding: 1.1rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }
        .dashboard-team-stat-label-upg {
          color: var(--color-text-muted);
          font-size: 1rem;
          margin-bottom: 0.3rem;
        }
        .dashboard-team-stat-value-upg {
          color: #3b82f6;
          font-size: 2rem;
          font-weight: 800;
        }
        .dashboard-team-actions-row-upg {
          display: flex;
          gap: 1.2rem;
          margin-top: 0.5rem;
        }
        .dashboard-team-action-btn-upg {
          flex: 1 1 0;
          font-size: 1.1rem;
          font-weight: 700;
          padding: 0.9em 0;
        }
        .dashboard-team-leave-btn-upg {
          background: #ef4444;
          color: #fff;
        }
        .dashboard-team-leave-btn-upg:focus, .dashboard-team-leave-btn-upg:hover {
          background: #dc2626;
        }
        @media (max-width: 700px) {
          .dashboard-team-card-upg {
            padding: 1.2rem 0.5rem;
          }
          .dashboard-team-info-upg {
            gap: 1rem;
          }
          .dashboard-team-stats-row-upg {
            grid-template-columns: 1fr;
            gap: 0.7rem;
          }
          .dashboard-team-actions-row-upg {
            flex-direction: column;
            gap: 0.7rem;
          }
        }
      `}</style>
    </>
  )
}

export default Dashboard
