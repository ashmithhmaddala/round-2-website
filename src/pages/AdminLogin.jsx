import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaLock, FaUser, FaCrown } from 'react-icons/fa'
import { adminLogin, setAdminAuth, isAdminAuthenticated } from '../utils/api'
import logo from '../assets/cseh_final_logo.png'

function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Redirect if already logged in as admin
  useEffect(() => {
    const checkAuth = () => {
      if (isAdminAuthenticated()) {
        navigate('/admin', { replace: true })
      }
    }
    
    checkAuth()
    
    // Check again when page becomes visible (handles back button)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuth()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkAuth)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkAuth)
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const result = await adminLogin(username, password)
      setAdminAuth(true)
      localStorage.setItem('currentAdminUsername', result.admin.username)
      localStorage.setItem('currentAdminRole', result.admin.role)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError('Invalid credentials. Access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-split">
      {/* Left Side - Branding/Event */}
      <div className="admin-login-visual">
        <div className="admin-visual-content">
          <h1>
            <img src={logo} alt="Logo" style={{ height: '60px', marginRight: '15px', display: 'inline-block', verticalAlign: 'middle' }} />
            Admin Portal
          </h1>
          <p className="admin-visual-subtitle">
            <span style={{ color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '10px', fontSize: '1.1rem' }}>Cache Me If You Can - Round 2</span>
            Cybersecurity and Ethical Hacking Club, NHCE
          </p>
          <div className="admin-visual-features">
            <div className="admin-feature-item">
              <div className="admin-feature-icon"><FaShieldAlt /></div>
              <span>Admin-Only Access</span>
            </div>
            <div className="admin-feature-item">
              <div className="admin-feature-icon"><FaLock /></div>
              <span>Manage Challenges & Teams</span>
            </div>
            <div className="admin-feature-item">
              <div className="admin-feature-icon"><FaUser /></div>
              <span>Monitor Event Progress</span>
            </div>
          </div>
        </div>
      </div>
      {/* Right Side - Form */}
      <div className="admin-login-form-section">
        <div className="admin-auth-box-modern">
          <div className="admin-auth-header">
            <h2>Admin Login</h2>
            <p>Enter your admin credentials to access the dashboard.</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="admin-modern-input-group">
              <input
                type="text"
                id="admin-username"
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                required
              />
              <label htmlFor="admin-username">Username or Email</label>
            </div>
            <div className="admin-modern-input-group">
              <input
                type="password"
                id="admin-password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
              <label htmlFor="admin-password">Admin Password</label>
            </div>
            {error && (
              <div className="admin-message error" style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ marginRight: 8 }}>⚠</span> {error}
              </div>
            )}
            <button type="submit" className="admin-btn-modern" disabled={loading}>
              {loading ? 'Authenticating...' : 'Access Admin Panel'}
            </button>
          </form>
          <div className="admin-auth-footer">
            <a href="/" className="admin-back-link">← Back to User Login</a>
          </div>
          <div className="forgot-password-link">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigate('/forgot-admin-password'); }}
            >
              Forgot Admin Password?
            </a>
          </div>
        </div>
      </div>
      <style jsx="true">{`
        .admin-login-split {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: stretch;
          background: #0f172a;
        }
        .admin-login-visual {
          flex: 1;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.97) 0%, rgba(30, 41, 59, 0.97) 100%),
            url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80');
          background-size: cover;
          background-position: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px;
        }
        .admin-visual-content {
          max-width: 520px;
          z-index: 2;
        }
        .admin-visual-content h1 {
          font-size: 2.7rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          color: #fff;
          letter-spacing: -1px;
        }
        .admin-visual-subtitle {
          font-size: 1.1rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 36px;
        }
        .admin-visual-features {
          display: grid;
          gap: 18px;
        }
        .admin-feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          color: #e2e8f0;
          font-weight: 500;
        }
        .admin-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(59, 130, 246, 0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.18);
        }
        .admin-login-form-section {
          flex: 0 0 480px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          border-left: 1px solid rgba(255,255,255,0.04);
        }
        .admin-auth-box-modern {
          width: 100%;
          max-width: 370px;
        }
        .admin-auth-header {
          margin-bottom: 36px;
        }
        .admin-auth-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        .admin-auth-header p {
          color: #64748b;
        }
        .admin-modern-input-group {
          margin-bottom: 22px;
          position: relative;
        }
        .admin-modern-input-group label {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
          transition: all 0.2s ease;
          background: #0f172a;
          padding: 0 4px;
        }
        .admin-modern-input-group input:focus ~ label,
        .admin-modern-input-group input:not(:placeholder-shown) ~ label {
          top: 0;
          font-size: 0.8rem;
          color: #3b82f6;
        }
        .admin-modern-input-group input {
          width: 100%;
          padding: 16px;
          background: transparent;
          border: 1.5px solid #334155;
          border-radius: 12px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s;
        }
        .admin-modern-input-group input:focus {
          border-color: #3b82f6;
          outline: none;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.09);
        }
        .admin-btn-modern {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.18);
        }
        .admin-btn-modern:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
        }
        .admin-btn-modern:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .admin-auth-footer {
          margin-top: 28px;
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
        }
        .admin-back-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        }
        .admin-back-link:hover {
          text-decoration: underline;
        }
        .admin-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-top: 10px;
          display: none;
          animation: slideIn 0.3s;
        }
        .admin-message.error {
          background: rgba(255, 51, 102, 0.1);
          border: 1px solid #ef4444;
          color: #ef4444;
        }
        .forgot-password-link {
          margin-top: 16px;
          text-align: center;
        }
        .forgot-password-link a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }
        .forgot-password-link a:hover {
          text-decoration: underline;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          .admin-login-visual {
            display: none;
          }
          .admin-login-form-section {
            flex: 1;
            border-left: none;
          }
          .admin-auth-box-modern {
            max-width: 420px;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminLogin
