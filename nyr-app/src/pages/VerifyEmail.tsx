// Email verification page
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        await apiClient.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Email Verification</h1>
        {status === 'verifying' && <p>Verifying your email...</p>}
        {status === 'success' && (
          <>
            <p className="success-message">{message}</p>
            <p>Redirecting to login...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="error-message">{message}</p>
            <Link to="/login">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
