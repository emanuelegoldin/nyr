// Dashboard page - main entry point after login
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import type { Team } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await apiClient.get('/teams');
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>NYR Bingo Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}!</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <Link to="/resolutions">My Resolutions</Link>
          <Link to="/profile">My Profile</Link>
          <Link to="/teams/create">Create Team</Link>
        </nav>

        <section className="teams-section">
          <h2>My Teams</h2>
          {isLoading ? (
            <p>Loading teams...</p>
          ) : teams.length === 0 ? (
            <div className="empty-state">
              <p>You're not part of any teams yet.</p>
              <Link to="/teams/create">Create your first team</Link>
            </div>
          ) : (
            <div className="teams-grid">
              {teams.map((team) => (
                <div key={team.id} className="team-card">
                  <h3>{team.name}</h3>
                  <p>Status: {team.status}</p>
                  <p>Role: {team.role}</p>
                  <Link to={`/teams/${team.id}`}>View Team</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
