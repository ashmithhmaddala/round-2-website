import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL, setCurrentUser } from '../utils/api';
import logo from '../assets/cseh_final_logo.png';

const CompleteProfile = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Success - store token if needed, but usually we rely on the one in URL or response
      // The backend returns a new token with the updated username
      if (data.token) {
        // If you are storing token in localStorage for auth, do it here
        // But based on Login.jsx, it seems we just set current user
      }
      
      setCurrentUser(data.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-box-modern" style={{ maxWidth: '400px', margin: '100px auto', padding: '40px' }}>
        <div className="auth-header" style={{ textAlign: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '50px', marginBottom: '20px' }} />
          <h2>Complete Profile</h2>
          <p>Please choose a unique username to continue.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modern-input-group">
            <input
              type="text"
              id="username"
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoComplete="off"
            />
            <label htmlFor="username">Username</label>
          </div>

          {error && <div className="message error" style={{ display: 'block', marginBottom: '15px', color: '#ef4444', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.9rem' }}>{error}</div>}

          <button type="submit" className="btn-modern" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Saving...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
