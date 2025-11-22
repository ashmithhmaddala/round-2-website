
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_URL } from '../utils/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const isAdmin = searchParams.get('admin') === 'true';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isAdmin
        ? `${API_URL}/auth/reset-admin-password`
        : `${API_URL}/auth/reset-password`;
      const body = isAdmin
        ? { token, password }
        : { token, newPassword: password };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h1>Reset Password</h1>
        <form onSubmit={handleSubmit} className="reset-password-form">
          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
          />
          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        {message && <div className="reset-password-message">{message}</div>}
      </div>
      <style>{`
        .reset-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 20% 20%, #1e293b 60%, #0f172a 100%);
        }
        .reset-password-box {
          background: rgba(30, 41, 59, 0.95);
          padding: 2.5rem 2rem 2rem 2rem;
          border-radius: 16px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          max-width: 400px;
          width: 100%;
          color: #fff;
        }
        .reset-password-box h1 {
          margin-bottom: 0.5rem;
          font-size: 2rem;
          font-weight: bold;
          text-align: center;
        }
        .reset-password-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .reset-password-form label {
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        .reset-password-form input {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          background: #334155;
          color: #fff;
        }
        .reset-password-form input:focus {
          outline: 2px solid #60a5fa;
        }
        .reset-password-form button {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: none;
          background: #3b82f6;
          color: #fff;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .reset-password-form button:hover {
          background: #2563eb;
        }
        .reset-password-message {
          margin-top: 1rem;
          text-align: center;
          color: #38bdf8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;