// Team Details page - comprehensive team management
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Team, TeamMember } from '../types';

const TeamDetails: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [myRole, setMyRole] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamResolution, setTeamResolution] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'resolutions' | 'bingo'>('info');

  useEffect(() => {
    if (teamId) {
      loadTeamDetails();
      loadCards();
    }
  }, [teamId]);

  const loadTeamDetails = async () => {
    try {
      const response = await apiClient.get(`/teams/${teamId}`);
      setTeam(response.data.team);
      setMembers(response.data.members);
      setMyRole(response.data.myRole);
      setTeamResolution(response.data.team.team_resolution_text || '');
    } catch (error) {
      console.error('Failed to load team details:', error);
    }
  };

  const loadCards = async () => {
    try {
      const response = await apiClient.get(`/teams/${teamId}/cards`);
      setCards(response.data.cards);
    } catch (error) {
      // Cards may not exist yet
      console.log('No cards yet');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const response = await apiClient.post(`/teams/${teamId}/invitations`, { email: inviteEmail });
      alert(`Invitation sent! Code: ${response.data.inviteCode}`);
      setInviteEmail('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const handleSetResolution = async () => {
    if (!teamResolution.trim()) return;

    try {
      await apiClient.put(`/teams/${teamId}/resolution`, { resolutionText: teamResolution });
      alert('Team resolution set!');
      loadTeamDetails();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to set resolution');
    }
  };

  const handleStartBingo = async () => {
    if (!confirm('Start bingo game? This cannot be undone.')) return;

    try {
      await apiClient.post(`/teams/${teamId}/start-bingo`);
      alert('Bingo game started!');
      loadTeamDetails();
      loadCards();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start bingo');
    }
  };

  if (!team) {
    return <div>Loading...</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{team.name}</h1>
        <div>
          <span>Status: {team.status}</span>
          <Link to="/dashboard">Back to Dashboard</Link>
        </div>
      </header>

      <div className="tabs">
        <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>
          Team Info
        </button>
        <button className={activeTab === 'resolutions' ? 'active' : ''} onClick={() => setActiveTab('resolutions')}>
          Resolutions
        </button>
        {team.status === 'started' && (
          <button className={activeTab === 'bingo' ? 'active' : ''} onClick={() => setActiveTab('bingo')}>
            Bingo Cards
          </button>
        )}
      </div>

      <div className="page-content">
        {activeTab === 'info' && (
          <div className="team-info">
            <h2>Members ({members.length})</h2>
            <ul>
              {members.map((member) => (
                <li key={member.id}>
                  {member.username} - {member.role}
                </li>
              ))}
            </ul>

            {myRole === 'leader' && team.status === 'forming' && (
              <>
                <h3>Invite Members</h3>
                <form onSubmit={handleInvite}>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <button type="submit">Send Invitation</button>
                </form>

                <h3>Team Resolution</h3>
                <textarea
                  value={teamResolution}
                  onChange={(e) => setTeamResolution(e.target.value)}
                  placeholder="Enter team resolution..."
                  rows={3}
                />
                <button onClick={handleSetResolution}>Set Team Resolution</button>

                <h3>Start Game</h3>
                <p>All members must create resolutions for all other members before starting.</p>
                <button onClick={handleStartBingo}>Start Bingo Game</button>
              </>
            )}
          </div>
        )}

        {activeTab === 'resolutions' && (
          <div className="team-resolutions">
            <Link to={`/teams/${teamId}/provide-resolutions`}>
              Provide Resolutions for Team Members
            </Link>
          </div>
        )}

        {activeTab === 'bingo' && team.status === 'started' && (
          <div className="bingo-cards">
            <Link to={`/teams/${teamId}/my-card`}>View My Bingo Card</Link>
            <h3>Team Cards</h3>
            <ul>
              {cards.map((card) => (
                <li key={card.id}>
                  <Link to={`/teams/${teamId}/cards/${card.user_id}`}>
                    {card.username}'s Card
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetails;
