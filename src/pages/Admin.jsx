import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaUsers, FaPuzzlePiece, FaChartLine, FaSync, FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaTrophy, FaClock, FaCheckCircle, FaFilter, FaSearch, FaBroadcastTower, FaBullhorn, FaBan, FaPlay, FaUpload, FaDownload, FaTimes, FaFileAlt, FaInfoCircle, FaFileAudio, FaFileVideo, FaFileImage, FaFileCode, FaFileArchive, FaFilePdf, FaFile } from 'react-icons/fa'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getAllTeams, deleteTeam, getChallenges, createChallenge, updateChallenge, deleteChallenge, setAdminAuth, getAdminAuth, getAllAdmins, createAdmin, deleteAdmin, changePassword, resetPassword, toggleChallengeVisibility, toggleChallengeDisabled, uploadChallengeFile, deleteChallengeFile, getChallengeFileUrl, getAllUsers, deleteUser, toggleUserBan } from '../utils/api'
import { useSocket } from '../context/SocketContext'
import logo from '../assets/cseh_final_logo.png'
import RealTimeMonitoring from './RealTimeMonitoring'
import AnnouncementsManager from './AnnouncementsManager'
import CompetitionManager from './CompetitionManager'
import LoggingAndMonitoring from './LoggingAndMonitoring'
import '../admin.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [teams, setTeams] = useState([])
  const [challenges, setChallenges] = useState([])
  const [admins, setAdmins] = useState([])
  const [users, setUsers] = useState([])
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
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [flagCache, setFlagCache] = useState(() => {
    // Load flag cache from localStorage on init
    const saved = localStorage.getItem('admin_flag_cache')
    return saved ? JSON.parse(saved) : {}
  })
  const navigate = useNavigate()
  const { socket } = useSocket()

  useEffect(() => {
    const auth = getAdminAuth()
    if (!auth) {
      navigate('/admin-login', { replace: true })
      return
    }
    loadData()
  }, [navigate])

  // Socket.io handles real-time updates from other admins
  // Keep minimal polling for fallback, but only if autoRefresh is on
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadData(true) // Silent refresh as fallback
    }, 30000) // Reduced from 5s to 30s - socket handles real-time

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Socket.io listeners for multi-admin synchronization
  useEffect(() => {
    if (!socket) return;

    // Listen for changes from other admins and auto-refresh
    socket.on('challenge:created', () => {
      loadData(true); // Silent refresh
      showMessage('Challenge created by another admin', 'info');
    });

    socket.on('challenge:updated', () => {
      loadData(true);
      showMessage('Challenge updated by another admin', 'info');
    });

    socket.on('challenge:deleted', () => {
      loadData(true);
      showMessage('Challenge deleted by another admin', 'info');
    });

    socket.on('challenge:visibility', () => {
      loadData(true);
    });

    socket.on('challenge:disabled', () => {
      loadData(true);
    });

    socket.on('team:deleted', () => {
      loadData(true);
      showMessage('Team deleted by another admin', 'info');
    });

    socket.on('competition:updated', () => {
      showMessage('Competition settings updated by another admin', 'info');
    });

    socket.on('competition:status', ({ status }) => {
      showMessage(`Competition status changed to ${status} by another admin`, 'info');
    });

    socket.on('announcement:created', () => {
      showMessage('New announcement created by another admin', 'info');
    });

    // Cleanup listeners
    return () => {
      socket.off('challenge:created');
      socket.off('challenge:updated');
      socket.off('challenge:deleted');
      socket.off('challenge:visibility');
      socket.off('challenge:disabled');
      socket.off('team:deleted');
      socket.off('competition:updated');
      socket.off('competition:status');
      socket.off('announcement:created');
    };
  }, [socket])

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This will remove them from their team.`)) return
    try {
      await deleteUser(userId)
      await loadData()
      showMessage('User deleted!', 'success')
    } catch (error) {
      showMessage('Failed to delete user: ' + error.message, 'error')
    }
  }

  const handleToggleBan = async (userId, username, currentStatus) => {
    const action = currentStatus ? 'unban' : 'ban'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${username}"?`)) return
    try {
      await toggleUserBan(userId)
      await loadData()
      showMessage(`User ${action}ned successfully!`, 'success')
    } catch (error) {
      showMessage(`Failed to ${action} user: ` + error.message, 'error')
    }
  }

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [teamsData, challengesData, adminsData, usersData] = await Promise.all([
        getAllTeams(),
        getChallenges(),
        getAllAdmins(),
        getAllUsers()
      ])
      setTeams(teamsData)
      setChallenges(challengesData)
      setAdmins(adminsData)
      setUsers(usersData)
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
    // Get flag from cache if available
    const cachedFlag = flagCache[challenge.id] || ''
    setFormData({ ...challenge, points: challenge.points.toString(), flag: cachedFlag })
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
        description: formData.description
      }

      // Only include flag if provided (for create or update)
      if (formData.flag) {
        challengeData.flag = formData.flag
        // Cache the flag locally
        const newCache = { ...flagCache, [formData.id]: formData.flag }
        setFlagCache(newCache)
        localStorage.setItem('admin_flag_cache', JSON.stringify(newCache))
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
      // Remove flag from cache
      const newCache = { ...flagCache }
      delete newCache[id]
      setFlagCache(newCache)
      localStorage.setItem('admin_flag_cache', JSON.stringify(newCache))
      await loadData()
      showMessage('Challenge deleted!', 'success')
    } catch (error) {
      showMessage('Failed to delete challenge: ' + error.message, 'error')
    }
  }

  const handleToggleVisibility = async (challengeId) => {
    try {
      await toggleChallengeVisibility(challengeId)
      await loadData()
      const challenge = Array.isArray(challenges) ? challenges.find(c => c.id === challengeId) : null
      showMessage(`Challenge ${challenge?.visible ? 'hidden' : 'shown'}!`, 'success')
    } catch (error) {
      showMessage('Failed to toggle visibility: ' + error.message, 'error')
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
  }

  const handleFileUpload = async (challengeId) => {
    if (selectedFiles.length === 0) {
      showMessage('Please select files to upload', 'warning')
      return
    }

    setUploadingFile(true)
    try {
      for (const file of selectedFiles) {
        await uploadChallengeFile(challengeId, file)
      }
      showMessage(`${selectedFiles.length} file(s) uploaded successfully!`, 'success')
      setSelectedFiles([])
      await loadData()
    } catch (error) {
      showMessage('Failed to upload file: ' + error.message, 'error')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFileDelete = async (challengeId, filename) => {
    if (!confirm(`Delete file "${filename}"?`)) return
    
    try {
      await deleteChallengeFile(challengeId, filename)
      showMessage('File deleted successfully!', 'success')
      await loadData()
    } catch (error) {
      showMessage('Failed to delete file: ' + error.message, 'error')
    }
  }

  const handleToggleDisabled = async (challengeId) => {
    try {
      await toggleChallengeDisabled(challengeId)
      await loadData()
      const challenge = Array.isArray(challenges) ? challenges.find(c => c.id === challengeId) : null
      showMessage(`Challenge ${challenge?.disabled ? 'enabled' : 'disabled'}!`, 'success')
    } catch (error) {
      showMessage('Failed to toggle disabled status: ' + error.message, 'error')
    }
  }

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <FaFileImage />
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return <FaFileVideo />
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return <FaFileAudio />
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FaFileArchive />
    if (['pdf'].includes(ext)) return <FaFilePdf />
    if (['js', 'py', 'html', 'css', 'json', 'java', 'c', 'cpp'].includes(ext)) return <FaFileCode />
    return <FaFileAlt />
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

  const currentUserRole = Array.isArray(admins) ? admins.find(a => a.username === localStorage.getItem('currentAdminUsername'))?.role : undefined

  const teamArray = Array.isArray(teams) ? teams : []
  const totalPlayers = teamArray.reduce((sum, team) => sum + (team.members?.length || 0), 0)
  const challengeArray = Array.isArray(challenges) ? challenges : []
  const totalChallenges = challengeArray.length
  const osintChallenges = challengeArray.filter(ch => ch.category === 'osint').length
  const cryptoChallenges = challengeArray.filter(ch => ch.category === 'crypto').length
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
  // 1. Top 10 Teams (Score)
  const sortedTeams = [...teamArray].sort((a, b) => b.score - a.score).slice(0, 10);
  const topTeamsData = {
    labels: sortedTeams.map(t => t.name),
    datasets: [{
      label: 'Score',
      data: sortedTeams.map(t => t.score),
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 1)',
      borderWidth: 1,
    }]
  };

  // 2. Challenge Solves (Top 10 Most Solved)
  const sortedChallenges = [...challenges].sort((a, b) => (b.solvedBy?.length || 0) - (a.solvedBy?.length || 0)).slice(0, 10);
  const challengeSolvesData = {
    labels: sortedChallenges.map(c => c.title),
    datasets: [{
      label: 'Solves',
      data: sortedChallenges.map(c => c.solvedBy?.length || 0),
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      borderColor: 'rgba(255, 255, 255, 1)',
      borderWidth: 1,
    }]
  };

  // 3. Score Distribution
  const scoreBuckets = { '0': 0, '1-500': 0, '501-1000': 0, '1000-2000': 0, '2000+': 0 };
  teamArray.forEach(team => {
      if (team.score === 0) scoreBuckets['0']++;
      else if (team.score <= 500) scoreBuckets['1-500']++;
      else if (team.score <= 1000) scoreBuckets['501-1000']++;
      else if (team.score <= 2000) scoreBuckets['1000-2000']++;
      else scoreBuckets['2000+']++;
  });
  
  const distributionData = {
      labels: Object.keys(scoreBuckets),
      datasets: [{
          label: 'Number of Teams',
          data: Object.values(scoreBuckets),
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 1
      }]
  };

  const categoryData = {
    labels: ['OSINT', 'Cryptography'],
    datasets: [{
      data: [osintChallenges, cryptoChallenges],
      backgroundColor: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)'],
      borderColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' }
      },
      title: { display: false }
    },
    scales: {
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const horizontalChartOptions = {
    ...chartOptions,
    indexAxis: 'y',
  };

  const navigationItems = [
    { name: 'Overview', icon: FaChartLine },
    { name: 'Real-Time', icon: FaBroadcastTower },
    { name: 'Competition', icon: FaClock },
    { name: 'Teams', icon: FaUsers },
    { name: 'Users', icon: FaUsers },
    { name: 'Challenges', icon: FaPuzzlePiece },
    { name: 'Announcements', icon: FaBullhorn },
    { name: 'Analytics', icon: FaChartLine },
    { name: 'Logs', icon: FaFileAlt },
    { name: 'Admins', icon: FaShieldAlt }
  ];

  return (
    <>
      <nav className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand">
            <img src={logo} alt="Logo" style={{ height: '40px', width: 'auto', marginRight: '10px' }} />
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
              className={`sidebar-tab ${activeTab === item.name.toLowerCase().replace('-', '') ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.name.toLowerCase().replace('-', ''))}
            >
              <item.icon />
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
              <h2>{activeTab === 'realtime' ? 'Real-Time Monitoring' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
              <p className="header-subtitle">
                {activeTab === 'overview' && 'System overview and key metrics'}
                {activeTab === 'realtime' && 'Live competition analytics and activity tracking'}
                {activeTab === 'competition' && 'Manage competition timer and control settings'}
                {activeTab === 'teams' && `${filteredTeams.length} teams registered`}
                {activeTab === 'users' && `${users.length} users registered`}
                {activeTab === 'challenges' && `${filteredChallenges.length} challenges available`}
                {activeTab === 'announcements' && 'Broadcast messages to all participants'}
                {activeTab === 'analytics' && 'Performance insights and statistics'}
                {activeTab === 'logs' && 'Security audit logs and activity tracking'}
                {activeTab === 'admins' && `${admins.length} admin accounts`}
              </p>
            </div>
            <button onClick={() => loadData()} className="refresh-btn" disabled={loading}>
              <FaSync className={loading ? 'spinning' : ''} />
            </button>
          </div>

          {activeTab === 'realtime' && <RealTimeMonitoring />}
          {activeTab === 'competition' && <CompetitionManager />}
          {activeTab === 'announcements' && <AnnouncementsManager />}
          {activeTab === 'logs' && <LoggingAndMonitoring />}

          {activeTab === 'overview' && (
          <div className="admin-section active">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>{teamArray.length}</h3>
                  <p>Total Teams</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>{totalPlayers}</h3>
                  <p>Total Players</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <FaPuzzlePiece />
                </div>
                <div className="stat-content">
                  <h3>{totalChallenges}</h3>
                  <p>Total Challenges</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
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
                  <FaTrophy />
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
                <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut 
                    data={categoryData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: '#e5e7eb' }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
              <div className="chart-card">
                <h3>Top Teams Overview</h3>
                <div style={{ height: '250px' }}>
                  <Bar 
                    data={topTeamsData} 
                    options={horizontalChartOptions} 
                  />
                </div>
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
                      <td className="admin-action-buttons">
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
                            background: 'transparent', 
                            border: '1px solid var(--text-dim)',
                            color: 'var(--text)'
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

        {activeTab === 'users' && (
          <div className="admin-section active">
            <div className="section-header">
              <div>
                <h2>User Management</h2>
                <p className="section-description">Manage individual users, monitor activity, and handle bans</p>
              </div>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id}>
                      <td><strong>{user.username}</strong></td>
                      <td>
                        {user.teamId ? (
                          <span className="team-code">
                            {Array.isArray(teams) ? teams.find(t => t.code === user.teamId)?.name || user.teamId : user.teamId}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>No Team</span>
                        )}
                      </td>
                      <td>
                        <span className={`difficulty-badge ${user.banned ? 'hard' : 'easy'}`}>
                          {user.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="admin-action-buttons">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleToggleBan(user._id, user.username, user.banned)}
                          title={user.banned ? "Unban User" : "Ban User"}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--text-dim)',
                            color: 'var(--text)'
                          }}
                        >
                          {user.banned ? <FaCheckCircle /> : <FaBan />}
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDeleteUser(user._id, user.username)}
                          title="Delete User"
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
                    <label>Flag {editingId && formData.flag && <span style={{ fontSize: '0.85em', color: '#10b981', fontWeight: 'normal' }}>✓ loaded from cache</span>}</label>
                    <input 
                      type="text" 
                      value={formData.flag} 
                      onChange={(e) => setFormData({ ...formData, flag: e.target.value })} 
                      placeholder={editingId ? "Enter new flag to update (or leave empty to keep current)" : "CTF{...}"}
                      required={!editingId}
                    />
                  </div>
                  
                  <div className="form-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <FaFileAlt />
                      Challenge Files
                    </label>
                    {editingId ? (
                      <div className="admin-file-upload-container">
                        <div className="file-drop-zone">
                          <input 
                            type="file" 
                            id="file-upload"
                            onChange={handleFileSelect}
                            multiple
                            className="file-input-hidden"
                          />
                          <div className="drop-zone-content">
                            <label htmlFor="file-upload" className="btn-choose-files">
                              <FaUpload />
                              Choose Files
                            </label>
                            {selectedFiles.length > 0 && (
                              <button 
                                type="button"
                                onClick={() => handleFileUpload(editingId)}
                                disabled={uploadingFile}
                                className={`btn-upload-files ${uploadingFile ? 'uploading' : ''}`}
                              >
                                <FaUpload />
                                {uploadingFile ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {selectedFiles.length > 0 && (
                          <div className="file-list-section">
                            <div className="file-list-header">
                              <FaFileAlt />
                              Selected Files ({selectedFiles.length})
                            </div>
                            <div className="file-list">
                              {selectedFiles.map((file, idx) => (
                                <div key={idx} className="file-list-item pending">
                                  <div className="file-type-icon">{getFileIcon(file.name)}</div>
                                  <span className="file-name">{file.name}</span>
                                  <span className="file-size">
                                    {(file.size / 1024).toFixed(2)} KB
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(challenges) && challenges.find(c => c.id === editingId)?.files?.length > 0 && (
                          <div className="file-list-section">
                            <div className="file-list-header">
                              <FaFileAlt />
                              Uploaded Files ({challenges.find(c => c.id === editingId).files.length})
                            </div>
                            <div className="file-list">
                              {challenges.find(c => c.id === editingId).files.map((file, idx) => (
                                <div key={idx} className="file-list-item uploaded">
                                  <div className="file-info-wrapper">
                                    <div className="file-icon-wrapper">
                                      {getFileIcon(file.originalName)}
                                    </div>
                                    <div className="file-text-info">
                                      <div className="file-name">{file.originalName}</div>
                                      <div className="file-size">
                                        {file.size >= 1024 * 1024 
                                          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                                          : `${(file.size / 1024).toFixed(2)} KB`
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <div className="file-actions">
                                    <a
                                      href={getChallengeFileUrl(editingId, file.filename)}
                                      download={file.originalName}
                                      className="btn-file-action download"
                                      title="Download"
                                    >
                                      <FaDownload />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleFileDelete(editingId, file.filename)}
                                      className="btn-file-action delete"
                                      title="Delete"
                                    >
                                      <FaTimes />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!Array.isArray(challenges) || !challenges.find(c => c.id === editingId)?.files?.length) && !selectedFiles.length && (
                          <div className="empty-files-state">
                            <FaFileAlt />
                            <p>No files uploaded yet. Choose files to get started.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="file-upload-placeholder">
                        <FaInfoCircle />
                        File uploads are available after creating the challenge. Create the challenge first, then click "Edit" to add files.
                      </div>
                    )}
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
                    <th>First Blood</th>
                    <th>Status</th>
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
                      <td>
                        {ch.firstBlood?.teamName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                            <FaTrophy />
                            <span>{ch.firstBlood.teamName}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button 
                            onClick={() => handleToggleVisibility(ch.id)}
                            className="btn-icon"
                            title={ch.visible ? 'Hide Challenge' : 'Show Challenge'}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--text-dim)',
                              color: 'var(--text)'
                            }}
                          >
                            {ch.visible ? <FaEye /> : <FaEyeSlash />}
                          </button>
                          <button 
                            onClick={() => handleToggleDisabled(ch.id)}
                            className="btn-icon"
                            title={ch.disabled ? 'Enable Challenge' : 'Disable Challenge'}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--text-dim)',
                              color: 'var(--text)'
                            }}
                          >
                            {ch.disabled ? <FaBan /> : <FaPlay />}
                          </button>
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="admin-action-buttons">
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
            <div className="analytics-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              <div className="chart-card" style={{ height: '400px' }}>
                <h3>Top 10 Teams (Score)</h3>
                <Bar data={topTeamsData} options={horizontalChartOptions} />
              </div>
              <div className="chart-card" style={{ height: '400px' }}>
                <h3>Score Distribution</h3>
                <Bar data={distributionData} options={chartOptions} />
              </div>
              <div className="chart-card" style={{ height: '400px' }}>
                <h3>Most Solved Challenges</h3>
                <Bar data={challengeSolvesData} options={chartOptions} />
              </div>
              <div className="chart-card" style={{ height: '400px' }}>
                <h3>Challenge Categories</h3>
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut 
                    data={categoryData} 
                    options={{
                      ...chartOptions,
                      scales: {}, // Remove scales for Doughnut
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: '#e5e7eb' }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                      <div style={{ position: 'relative' }}>
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
                        style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px' }}
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
                      <td className="admin-action-buttons">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {currentUserRole === 'super_admin' && (
                            <button 
                              className="btn-icon" 
                              onClick={() => openResetPasswordModal(admin)}
                              title="Reset Password"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--text-dim)',
                                color: 'var(--text)'
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
                    const challenge = Array.isArray(challenges) ? challenges.find(c => c.id === chId) : null
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
                    const team = Array.isArray(teams) ? teams.find(t => t.code === teamCode) : null
                    return team ? (
                      <div key={idx} className="solved-by-item">
                        <FaTrophy />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
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
                    style={{ whiteSpace: 'nowrap', padding: '10px 16px', height: '42px' }}
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
