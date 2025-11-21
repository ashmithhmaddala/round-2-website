import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaShieldAlt, FaLock, FaUser } from 'react-icons/fa'
import { adminLogin, setAdminAuth } from '../utils/api'

function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

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
      // Store admin info
      localStorage.setItem('currentAdminUsername', result.admin.username)
      localStorage.setItem('currentAdminRole', result.admin.role)
      navigate('/admin')
    } catch (err) {
      setError('Invalid credentials. Access denied.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-container">
      <div className="admin-login-bg">
        <div className="admin-particles"></div>
        <div className="admin-particles"></div>
        <div className="admin-particles"></div>
      </div>

      <div className="admin-login-card">
        <div className="admin-logo">
          <div className="shield-icon">
            <FaShieldAlt />
          </div>
          <h1>Admin Portal</h1>
          <p>Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="admin-input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="admin-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="admin-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span> Authenticating...
              </>
            ) : (
              <>
                <FaLock /> Access Admin Panel
              </>
            )}
          </button>
        </form>

        <div className="admin-footer">
          <a href="/" className="back-link">← Back to Login</a>
        </div>
      </div>

      <style jsx="true">{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #2d1b3d 100%);
        }

        .admin-login-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        }

        .admin-particles {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.15;
          animation: float 20s ease-in-out infinite;
        }

        .admin-particles:nth-child(1) {
          background: linear-gradient(45deg, #ff4545, #ff0066);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .admin-particles:nth-child(2) {
          background: linear-gradient(45deg, #ff8a00, #ff4545);
          bottom: -100px;
          right: -100px;
          animation-delay: 7s;
        }

        .admin-particles:nth-child(3) {
          background: linear-gradient(45deg, #d63031, #ff6b6b);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 14s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(100px, -100px) scale(1.1); }
          66% { transform: translate(-50px, 100px) scale(0.9); }
        }

        .admin-login-card {
          background: rgba(20, 25, 45, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 50px 40px;
          width: 100%;
          max-width: 450px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 69, 69, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          position: relative;
          z-index: 1;
          border: 2px solid rgba(255, 69, 69, 0.3);
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .admin-logo {
          text-align: center;
          margin-bottom: 40px;
        }

        .shield-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg, #ff4545 0%, #ff0066 100%);
          border-radius: 20px;
          box-shadow: 
            0 10px 30px rgba(255, 69, 69, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
        }

        .shield-icon::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 20px;
          background: linear-gradient(135deg, #ff4545, #ff0066);
          opacity: 0.5;
          filter: blur(10px);
          z-index: -1;
        }

        .shield-icon svg {
          font-size: 40px;
          color: white;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .admin-logo h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, #ff4545, #ff8a00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 30px rgba(255, 69, 69, 0.3);
        }

        .admin-logo p {
          color: #ff6b6b;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin: 0;
        }

        .admin-form {
          margin-bottom: 25px;
        }

        .admin-input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .admin-input-group .input-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #ff6b6b;
          font-size: 18px;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .admin-input-group input {
          width: 100%;
          padding: 16px 18px 16px 52px;
          background: rgba(10, 15, 30, 0.6);
          border: 2px solid rgba(255, 69, 69, 0.2);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.3s ease;
          outline: none;
        }

        .admin-input-group input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .admin-input-group input:focus {
          background: rgba(10, 15, 30, 0.8);
          border-color: #ff4545;
          box-shadow: 
            0 0 0 4px rgba(255, 69, 69, 0.1),
            0 0 20px rgba(255, 69, 69, 0.2);
        }

        .admin-input-group input:focus + .input-icon {
          color: #ff4545;
          transform: translateY(-50%) scale(1.1);
        }

        .admin-input-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .admin-error {
          background: linear-gradient(135deg, rgba(255, 69, 69, 0.15), rgba(255, 0, 102, 0.15));
          border: 2px solid rgba(255, 69, 69, 0.4);
          border-radius: 12px;
          color: #ff6b6b;
          padding: 14px 18px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: shake 0.5s ease-in-out;
        }

        .admin-error span {
          font-size: 18px;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .admin-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #ff4545 0%, #ff0066 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 
            0 4px 15px rgba(255, 69, 69, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }

        .admin-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .admin-btn:hover::before {
          left: 100%;
        }

        .admin-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 25px rgba(255, 69, 69, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .admin-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .admin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 69, 69, 0.1);
        }

        .back-link {
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .back-link:hover {
          color: #ff6b6b;
          transform: translateX(-3px);
        }

        @media (max-width: 600px) {
          .admin-login-card {
            padding: 40px 30px;
          }

          .shield-icon {
            width: 70px;
            height: 70px;
          }

          .shield-icon svg {
            font-size: 35px;
          }

          .admin-logo h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminLogin
