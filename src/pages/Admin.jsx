import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaPuzzlePiece, FaChartLine, FaSync, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaTrophy, FaClock, FaCheckCircle, FaFilter, FaSearch } from 'react-icons/fa'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getAllTeams, deleteTeam, getChallenges, createChallenge, updateChallenge, deleteChallenge, setAdminAuth, getAdminAuth, getAllAdmins, createAdmin, deleteAdmin, changePassword, resetPassword } from '../utils/api'
import '../admin.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [teams, setTeams] = useState([])
  const [challenges, setChallenges] = useState([])
  const [admins, setAdmins] = useState([])
  const [currentAdmin, setCurrentAdmin] = useState(null)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showForm, setShowForm] = useState(false)
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formData, setFormData] = useState({
    id: '', title: '', category: 'osint', difficulty: 'easy',
    points: '', description: '', flag: ''
  })
  const [adminFormData, setAdminFormData] = useState({
    username: '', email: '', password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordModalType, setPasswordModalType] = useState('change')
  const [targetAdmin, setTargetAdmin] = useState(null)
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const auth = getAdminAuth()
    if (!auth) {
      navigate('/admin-login')
      return
    }
    loadData()
  }, [navigate])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData(true) // Silent refresh
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [teamsData, challengesData, adminsData] = await Promise.all([
        getAllTeams(),
        getChallenges(),
        getAllAdmins()
      ])
      setTeams(teamsData)
      setChallenges(challengesData)
      setAdmins(adminsData)
      setLastUpdated(new Date())
    } catch (error) {
      if (!silent) showMessage('Failed to load data: ' + error.message, 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const handleLogout = () => {
    setAdminAuth(false)
    navigate('/')
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 3000)
  }

  const handleDeleteTeam = async (code) => {
    if (!confirm('Delete this team?')) return
    try {
      await deleteTeam(code)
      await loadData()
      showMessage('Team deleted!', 'success')
    } catch (error) {
      showMessage('Failed to delete team: ' + error.message, 'error')
    }
  }

  const handleAddChallenge = () => {
    setEditingId(null)
    setShowForm(true)
    setFormData({ id: '', title: '', category: 'osint', difficulty: 'easy', points: '', description: '', flag: '' })
  }

  const handleEditChallenge = (challenge) => {
    setEditingId(challenge.id)
    setShowForm(true)
    setFormData({ ...challenge, points: challenge.points.toString() })
  }

  const handleSaveChallenge = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const challengeData = {
        id: formData.id,
        title: formData.title,
        category: formData.category,
        difficulty: formData.difficulty,
        points: parseInt(formData.points),
        description: formData.description,
        flag: formData.flag
      }

      if (editingId) {
        await updateChallenge(editingId, challengeData)
        showMessage('Challenge updated!', 'success')
      } else {
        await createChallenge(challengeData)
        showMessage('Challenge created!', 'success')
      }

      await loadData()
      setShowForm(false)
    } catch (error) {
      showMessage('Failed to save challenge: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChallenge = async (id) => {
    if (!confirm('Delete this challenge?')) return
    try {
      await deleteChallenge(id)
      await loadData()
      showMessage('Challenge deleted!', 'success')
    } catch (error) {
      showMessage('Failed to delete challenge: ' + error.message, 'error')
    }
  }

  const handleAddAdmin = () => {
    setShowAdminForm(true)
    setAdminFormData({ username: '', email: '', password: '' })
  }

  const handleSaveAdmin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const adminUsername = localStorage.getItem('currentAdminUsername')
      await createAdmin(adminFormData.username, adminFormData.email, adminFormData.password, adminUsername)
      await loadData()
      showMessage('Admin created successfully!', 'success')
      setShowAdminForm(false)
    } catch (error) {
      showMessage('Failed to create admin: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (username) => {
    if (!confirm(`Delete admin "${username}"?`)) return
    try {
      await deleteAdmin(username)
      await loadData()
      showMessage('Admin deleted!', 'success')
    } catch (error) {
      showMessage('Failed to delete admin: ' + error.message, 'error')
    }
  }

  const openChangePasswordModal = () => {
    setPasswordModalType('change')
    setTargetAdmin(null)
    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPasswordModal(true)
  }

  const openResetPasswordModal = (admin) => {
    setPasswordModalType('reset')
    setTargetAdmin(admin)
    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      showMessage('New passwords do not match!', 'error')
      return
    }

    try {
      if (passwordModalType === 'change') {
        const currentAdminUsername = localStorage.getItem('currentAdminUsername')
        await changePassword(
          currentAdminUsername,
          passwordFormData.currentPassword,
          passwordFormData.newPassword
        )
        showMessage('Password changed successfully!', 'success')
      } else {
        const currentAdminUsername = localStorage.getItem('currentAdminUsername')
        await resetPassword(
          targetAdmin.username,
          passwordFormData.newPassword,
          currentAdminUsername
        )
        showMessage(`Password reset successfully for ${targetAdmin.username}!`, 'success')
      }
      setShowPasswordModal(false)
      setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      showMessage(error.message, 'error')
    }
  }

  const generatePasswordForModal = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    const password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setPasswordFormData({ ...passwordFormData, newPassword: password, confirmPassword: password })
    showMessage('Secure password generated!', 'success')
  }

  const currentUserRole = admins.find(a => a.username === localStorage.getItem('currentAdminUsername'))?.role

  const teamArray = teams || []
  const totalPlayers = teamArray.reduce((sum, team) => sum + (team.members?.length || 0), 0)
  const totalChallenges = challenges.length
  const osintChallenges = challenges.filter(ch => ch.category === 'osint').length
  const cryptoChallenges = challenges.filter(ch => ch.category === 'crypto').length
  const totalSolved = teamArray.reduce((sum, team) => sum + team.solvedChallenges.length, 0)
  const avgScore = teamArray.length > 0 ? Math.round(teamArray.reduce((sum, team) => sum + team.score, 0) / teamArray.length) : 0
  const topTeam = teamArray.length > 0 ? [...teamArray].sort((a, b) => b.score - a.score)[0] : null

  // Filtered teams for search
  const filteredTeams = teamArray.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.code.includes(searchTerm)
  )

  // Filtered challenges
  const filteredChallenges = challenges.filter(ch => {
    const matchesSearch = ch.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ch.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || ch.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Chart data
  const scoresData = {
    labels: teamArray.map(t => t.name),
    datasets: [{ 
      label: 'Score', 
      data: teamArray.map(t => t.score), 
      backgroundColor: 'rgba(74, 144, 226, 0.8)',
      borderColor: 'rgba(74, 144, 226, 1)',
      borderWidth: 2
    }]
  }

  const solvedData = {
    labels: teamArray.map(t => t.name),
    datasets: [{
      label: 'Challenges Solved',
      data: teamArray.map(t => t.solvedChallenges.length),
      backgroundColor: [
        'rgba(74, 144, 226, 0.8)',
        'rgba(112, 0, 255, 0.8)',
        'rgba(0, 255, 136, 0.8)',
        'rgba(255, 170, 0, 0.8)',
        'rgba(255, 107, 107, 0.8)',
        'rgba(78, 205, 196, 0.8)'
      ]
    }]
  }

  const categoryData = {
    labels: ['OSINT', 'Cryptography'],
    datasets: [{
      data: [osintChallenges, cryptoChallenges],
      backgroundColor: ['rgba(74, 144, 226, 0.8)', 'rgba(112, 0, 255, 0.8)']
    }]
  }

  const navigationItems = [
    { name: 'Overview', path: '/admin' },
    { name: 'Teams', path: '/admin/teams' },
    { name: 'Challenges', path: '/admin/challenges' },
    { name: 'Analytics', path: '/admin/analytics' },
    { name: 'Admins', path: '/admin/admins' },
    { name: 'Logging & Monitoring', path: '/admin/logging' },
  ];

  return (
    <>
      <nav className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand">
            <FaShieldAlt className="brand-icon" />
            <div className="brand-text">
              <h1>CTF Admin</h1>
              <span>Control Panel</span>
            </div>
          </div>
          <div className="admin-nav-right">
            {lastUpdated && (
              <div className="status-indicator">
                <span className={`status-dot ${autoRefresh ? 'active' : 'paused'}`}></span>
                <span className="status-text">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-main">
        <div className="admin-sidebar">
          {navigationItems.map((item) => (
            <button 
              key={item.name}
              className={`sidebar-tab ${activeTab === item.name.toLowerCase() ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.name.toLowerCase())}
            >
              {item.name === 'Logging & Monitoring' ? <FaChartLine /> : item.name === 'Teams' ? <FaUsers /> : item.name === 'Challenges' ? <FaPuzzlePiece /> : item.name === 'Analytics' ? <FaChartLine /> : item.name === 'Admins' ? <FaShieldAlt /> : null}
              <span>{item.name}</span>
            </button>
          ))}
          
          <div className="sidebar-footer">
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)} 
              className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
            >
              {autoRefresh ? 'Live Updates' : 'Updates Paused'}
            </button>
          </div>
        </div>

        <div className="admin-content">
          <div className="content-header">
            <div className="header-left">
              <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
              <p className="header-subtitle">
                {activeTab === 'overview' && 'System overview and key metrics'}
                {activeTab === 'teams' && `${filteredTeams.length} teams registered`}
                {activeTab === 'challenges' && `${filteredChallenges.length} challenges available`}
                {activeTab === 'analytics' && 'Performance insights and statistics'}
                {activeTab === 'admins' && `${admins.length} admin accounts`}
              </p>
            </div>
            <button onClick={() => loadData()} className="refresh-btn" disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} />
            </button>
          </div>

          {activeTab === 'overview' && (
          <div className="admin-section active">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4a90e2, #357abd)' }}>
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>{teamArray.length}</h3>
                  <p>Total Teams</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #7000ff, #5a00cc)' }}>
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>{totalPlayers}</h3>
                  <p>Total Players</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #00ff88, #00cc6e)' }}>
                  <FaPuzzlePiece />
                </div>
                <div className="stat-content">
                  <h3>{totalChallenges}</h3>
                  <p>Total Challenges</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ffaa00, #ff8800)' }}>
                  <FaCheckCircle />
                </div>
                <div className="stat-content">
                  <h3>{totalSolved}</h3>
                  <p>Total Solves</p>
                </div>
              </div>
            </div>

            {topTeam && (
              <div className="featured-team">
                <div className="featured-header">
                  <FaTrophy style={{ color: '#ffaa00' }} />
                  <h3>Leading Team</h3>
                </div>
                <div className="featured-content">
                  <h2>{topTeam.name}</h2>
                  <div className="featured-stats">
                    <div className="featured-stat">
                      <span className="label">Score</span>
                      <span className="value">{topTeam.score}</span>
                    </div>
                    <div className="featured-stat">
                      <span className="label">Solved</span>
                      <span className="value">{topTeam.solvedChallenges.length}/{totalChallenges}</span>
                    </div>
                    <div className="featured-stat">
                      <span className="label">Members</span>
                      <span className="value">{topTeam.members.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overview-charts">
              <div className="chart-card">
                <h3>Challenge Distribution</h3>
                <Doughnut data={categoryData} options={{ responsive: true, maintainAspectRatio: true }} />
              </div>
              <div className="chart-card">
                <h3>Team Scores Comparison</h3>
                <Bar 
                  data={scoresData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: true,
                    plugins: {
                      legend: { display: false }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="recent-activity">
              <h3>Recent Teams</h3>
              <div className="activity-list">
                {teamArray.slice(-5).reverse().map(team => (
                  <div key={team.code} className="activity-item">
                    <div className="activity-icon">
                      <FaUsers />
                    </div>
                    <div className="activity-content">
                      <h4>{team.name}</h4>
                      <p>Created {new Date(team.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="activity-badge">
                      {team.score} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="admin-section active">
            <div className="section-header">
              <div>
                <h2>Teams Management</h2>
                <p className="section-description">Monitor all registered teams, their members, and performance</p>
              </div>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr><th>Team Name</th><th>Code</th><th>Members</th><th>Score</th><th>Solved</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {teamArray.map(team => (
                    <tr key={team.code}>
                      <td><strong>{team.name}</strong></td>
                      <td><span className="team-code">{team.code}</span></td>
                      <td>{team.members.length} member{team.members.length !== 1 ? 's' : ''}</td>
                      <td><span className="score-badge">{team.score}</span></td>
                      <td>{team.solvedChallenges.length}</td>
                      <td>{new Date(team.createdAt).toLocaleDateString()}</td>
                      <td className="action-buttons">
                        <button 
                          className="btn-icon" 
                          onClick={() => setSelectedTeam(team)}
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDeleteTeam(team.code)}
                          title="Delete Team"
                          style={{ 
                            background: 'rgba(255, 71, 87, 0.1)', 
                            border: '1px solid rgba(255, 71, 87, 0.3)',
                            color: '#ff4757'
                          }}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="admin-section active">
            <div className="challenges-toolbar">
              <div className="toolbar-left">
                <div className="search-box">
                  <FaSearch />
                  <input 
                    type="text" 
                    placeholder="Search challenges..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-group">
                  <FaFilter />
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    <option value="osint">OSINT</option>
                    <option value="crypto">Cryptography</option>
                  </select>
                </div>
              </div>
              <button onClick={handleAddChallenge} className="btn-add-challenge">
                <FaPlus />
                <span>Create Challenge</span>
              </button>
            </div>

            {showForm && (
              <div className="challenge-form-card">
                <div className="form-card-header">
                  <h3>{editingId ? 'Edit Challenge' : 'Create New Challenge'}</h3>
                  <button className="close-btn" onClick={() => setShowForm(false)}>×</button>
                </div>
                <form onSubmit={handleSaveChallenge}>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Challenge ID</label>
                      <input 
                        type="text" 
                        value={formData.id} 
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })} 
                        disabled={!!editingId}
                        placeholder="e.g., osint-1"
                        required 
                      />
                    </div>
                    <div className="form-field">
                      <label>Title</label>
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                        placeholder="Challenge title"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-field">
                      <label>Category</label>
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                        <option value="osint">OSINT</option>
                        <option value="crypto">Cryptography</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Difficulty</label>
                      <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Points</label>
                      <input 
                        type="number" 
                        value={formData.points} 
                        onChange={(e) => setFormData({ ...formData, points: e.target.value })} 
                        placeholder="100"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <label>Description</label>
                    <textarea 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      rows="4"
                      placeholder="Describe the challenge..."
                      required 
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>Flag</label>
                    <input 
                      type="text" 
                      value={formData.flag} 
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })} 
                      placeholder="CTF{...}"
                      required 
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : (editingId ? 'Update Challenge' : 'Create Challenge')}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="challenges-table-container">
              <table className="challenges-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Points</th>
                    <th>Solves</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChallenges.map(ch => (
                    <tr key={ch.id} onClick={() => setSelectedChallenge(ch)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="challenge-title-cell">
                          <strong>{ch.title}</strong>
                          <span className="challenge-id-small">{ch.id}</span>
                        </div>
                      </td>
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
                      <td>{ch.solvedBy?.length || 0}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon" 
                            onClick={() => handleEditChallenge(ch)}
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="btn-icon btn-danger" 
                            onClick={() => handleDeleteChallenge(ch.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredChallenges.length === 0 && (
                <div className="empty-state">
                  <FaPuzzlePiece style={{ fontSize: '48px', color: '#6b7280', marginBottom: '12px' }} />
                  <p>No challenges found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="admin-section active">
            <div className="section-header"><h2>Analytics & Statistics</h2></div>
            <div className="analytics-grid">
              <div className="chart-card"><h3>Team Scores</h3><Bar data={scoresData} options={{ responsive: true, maintainAspectRatio: true }} /></div>
              <div className="chart-card"><h3>Challenges Solved</h3><Doughnut data={solvedData} options={{ responsive: true, maintainAspectRatio: true }} /></div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="admin-section active">
            <div className="section-header">
              <div>
                <h2>Admin Management</h2>
                <p className="section-description">Manage administrator accounts and permissions</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={openChangePasswordModal} className="btn-change-password">
                  <FaShieldAlt /> Change My Password
                </button>
                <button onClick={handleAddAdmin} className="btn-add-challenge">
                  <FaPlus /> Add Admin
                </button>
              </div>
            </div>

            {showAdminForm && (
              <div className="challenge-form-card">
                <div className="form-card-header">
                  <h3>Create New Admin</h3>
                  <button className="close-btn" onClick={() => setShowAdminForm(false)}>×</button>
                </div>
                <form onSubmit={handleSaveAdmin}>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Username</label>
                      <input 
                        type="text" 
                        value={adminFormData.username} 
                        onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })} 
                        placeholder="admin_username"
                        required 
                      />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input 
                        type="email" 
                        value={adminFormData.email} 
                        onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })} 
                        placeholder="admin@example.com"
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <label>Password</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={adminFormData.password} 
                          onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })} 
                          placeholder="Enter secure password"
                          required 
                          minLength="8"
                          style={{ width: '100%', paddingRight: '45px' }}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="btn-icon"
                          style={{ 
                            position: 'absolute', 
                            right: '8px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            padding: '4px'
                          }}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
                          const password = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                          setAdminFormData({ ...adminFormData, password });
                          showMessage('Secure password generated! Make sure to save it.', 'success');
                        }}
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', padding: '10px 16px' }}
                      >
                        Generate
                      </button>
                    </div>
                    <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Password must be at least 8 characters long. Click "Generate" for a secure random password.
                    </small>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Admin'}
                    </button>
                    <button type="button" onClick={() => setShowAdminForm(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin.username}>
                      <td><strong>{admin.username}</strong></td>
                      <td>{admin.email}</td>
                      <td>
                        <span className={`difficulty-badge ${admin.role === 'super_admin' ? 'hard' : 'medium'}`}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td>{admin.createdBy || 'System'}</td>
                      <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                      <td className="action-buttons">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {currentUserRole === 'super_admin' && (
                            <button 
                              className="btn-icon" 
                              onClick={() => openResetPasswordModal(admin)}
                              title="Reset Password"
                              style={{
                                background: 'rgba(74, 144, 226, 0.1)',
                                border: '1px solid rgba(74, 144, 226, 0.3)',
                                color: '#4a90e2'
                              }}
                            >
                              <FaShieldAlt />
                            </button>
                          )}
                          {admin.role !== 'super_admin' && (
                            <button 
                              className="btn-icon btn-danger" 
                              onClick={() => handleDeleteAdmin(admin.username)}
                              title="Delete Admin"
                            >
                              <FaTrash />
                            </button>
                          )}
                          {admin.role === 'super_admin' && currentUserRole !== 'super_admin' && (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

          {message.text && <div className={`message ${message.type}`} style={{ display: 'block' }}>{message.text}</div>}
        </div>
      </div>

      {selectedTeam && (
        <div className="modal" style={{ display: 'block' }} onClick={() => setSelectedTeam(null)}>
          <div className="modal-content team-detail-modal" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={() => setSelectedTeam(null)}>&times;</span>
            <h2>{selectedTeam.name}</h2>
            <div className="team-detail-grid">
              <div className="team-detail-item">
                <span className="label">Team Code:</span>
                <span className="value team-code">{selectedTeam.code}</span>
              </div>
              <div className="team-detail-item">
                <span className="label">Total Score:</span>
                <span className="value">{selectedTeam.score} points</span>
              </div>
              <div className="team-detail-item">
                <span className="label">Challenges Solved:</span>
                <span className="value">{selectedTeam.solvedChallenges.length}/{totalChallenges}</span>
              </div>
              <div className="team-detail-item">
                <span className="label">Created:</span>
                <span className="value">{new Date(selectedTeam.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="team-members-section">
              <h3>Team Members ({selectedTeam.members.length})</h3>
              <ul className="members-list">
                {selectedTeam.members.map((member, idx) => (
                  <li key={idx}>
                    <FaUsers /> {member}
                  </li>
                ))}
              </ul>
            </div>
            {selectedTeam.solvedChallenges.length > 0 && (
              <div className="team-solves-section">
                <h3>Solved Challenges</h3>
                <div className="solved-challenges">
                  {selectedTeam.solvedChallenges.map((chId, idx) => {
                    const challenge = challenges.find(c => c.id === chId)
                    return challenge ? (
                      <div key={idx} className="solved-badge">
                        <FaCheckCircle /> {challenge.title}
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedChallenge && (
        <div className="modal" style={{ display: 'block' }} onClick={() => setSelectedChallenge(null)}>
          <div className="modal-content challenge-detail-modal" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={() => setSelectedChallenge(null)}>&times;</span>
            <div className="challenge-detail-header">
              <h2>{selectedChallenge.title}</h2>
              <div className="challenge-detail-badges">
                <span className={`category-badge ${selectedChallenge.category}`}>
                  {selectedChallenge.category === 'osint' ? 'OSINT' : 'Cryptography'}
                </span>
                <span className={`difficulty-badge ${selectedChallenge.difficulty}`}>
                  {selectedChallenge.difficulty}
                </span>
              </div>
            </div>
            
            <div className="challenge-detail-grid">
              <div className="challenge-detail-item">
                <span className="label">Challenge ID:</span>
                <span className="value challenge-id">{selectedChallenge.id}</span>
              </div>
              <div className="challenge-detail-item">
                <span className="label">Points:</span>
                <span className="value points-value">{selectedChallenge.points}</span>
              </div>
              <div className="challenge-detail-item">
                <span className="label">Category:</span>
                <span className="value">{selectedChallenge.category === 'osint' ? 'OSINT' : 'Cryptography'}</span>
              </div>
              <div className="challenge-detail-item">
                <span className="label">Difficulty:</span>
                <span className="value">{selectedChallenge.difficulty}</span>
              </div>
              <div className="challenge-detail-item">
                <span className="label">Total Solves:</span>
                <span className="value">{selectedChallenge.solvedBy?.length || 0}</span>
              </div>
            </div>

            <div className="challenge-detail-section">
              <h3>Description</h3>
              <div className="challenge-description-box">
                {selectedChallenge.description}
              </div>
            </div>

            <div className="challenge-detail-section">
              <h3>Flag (Correct Answer)</h3>
              <div className="flag-display">
                <code>{selectedChallenge.flag}</code>
              </div>
            </div>

            {selectedChallenge.solvedBy && selectedChallenge.solvedBy.length > 0 && (
              <div className="challenge-detail-section">
                <h3>Solved By ({selectedChallenge.solvedBy.length} teams)</h3>
                <div className="solved-by-list">
                  {selectedChallenge.solvedBy.map((teamCode, idx) => {
                    const team = teams.find(t => t.code === teamCode)
                    return team ? (
                      <div key={idx} className="solved-by-item">
                        <FaTrophy style={{ color: '#fbbf24' }} />
                        <span>{team.name}</span>
                        <span className="team-code-small">{team.code}</span>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            )}

            <div className="challenge-detail-actions">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedChallenge(null); 
                  handleEditChallenge(selectedChallenge); 
                }} 
                className="btn btn-primary"
              >
                <FaEdit /> Edit Challenge
              </button>
              <button 
                onClick={() => setSelectedChallenge(null)} 
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal" style={{ display: 'block' }} onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content challenge-form-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="form-card-header">
              <h3>
                <FaShieldAlt /> {passwordModalType === 'change' ? 'Change Password' : `Reset Password for ${targetAdmin?.username}`}
              </h3>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              {passwordModalType === 'change' && (
                <div className="form-field">
                  <label>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordFormData.currentPassword} 
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })} 
                      placeholder="Enter current password"
                      required 
                      style={{ paddingRight: '45px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="btn-icon"
                      style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        padding: '4px'
                      }}
                    >
                      {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="form-field">
                <label>New Password</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      value={passwordFormData.newPassword} 
                      onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })} 
                      placeholder="Enter new password"
                      required 
                      minLength="8"
                      style={{ width: '100%', paddingRight: '45px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="btn-icon"
                      style={{ 
                        position: 'absolute', 
                        right: '8px', 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        padding: '4px'
                      }}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={generatePasswordForModal}
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '10px 16px' }}
                  >
                    Generate
                  </button>
                </div>
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </small>
              </div>
              
              <div className="form-field">
                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordFormData.confirmPassword} 
                    onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })} 
                    placeholder="Confirm new password"
                    required 
                    style={{ paddingRight: '45px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="btn-icon"
                    style={{ 
                      position: 'absolute', 
                      right: '8px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: '4px'
                    }}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (passwordModalType === 'change' ? 'Change Password' : 'Reset Password')}
                </button>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Admin
