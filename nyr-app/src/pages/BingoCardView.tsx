// Bingo Card view page
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { BingoCard, BingoCell } from '../types';

const BingoCardView: React.FC = () => {
  const { teamId, userId } = useParams<{ teamId: string; userId?: string }>();
  const [card, setCard] = useState<BingoCard | null>(null);
  const [isOwnCard, setIsOwnCard] = useState(false);

  useEffect(() => {
    loadCard();
  }, [teamId, userId]);

  const loadCard = async () => {
    try {
      let response;
      if (userId) {
        // View another user's card
        response = await apiClient.get(`/teams/${teamId}/cards/${userId}`);
        setIsOwnCard(false);
      } else {
        // View own card
        response = await apiClient.get(`/teams/${teamId}/my-card`);
        setIsOwnCard(true);
      }
      setCard(response.data.card);
    } catch (error) {
      console.error('Failed to load card:', error);
    }
  };

  const handleCellToggle = async (cellId: number, currentState: string) => {
    if (!isOwnCard) return;

    const newState = currentState === 'to_complete' ? 'completed' : 'to_complete';
    try {
      await apiClient.put(`/teams/cells/${cellId}/state`, { state: newState });
      loadCard();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update cell');
    }
  };

  if (!card) {
    return <div>Loading card...</div>;
  }

  const gridSize = card.gridSize;
  const grid: BingoCell[][] = [];
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      const cell = card.cells.find(c => c.row_num === row && c.col_num === col);
      if (cell) grid[row][col] = cell;
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Bingo Card</h1>
        <Link to={`/teams/${teamId}`}>Back to Team</Link>
      </header>

      <div className="page-content">
        <div className="bingo-grid" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '10px',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {grid.map((row, _rowIdx) => (
            row.map((cell, _colIdx) => (
              <div
                key={cell.id}
                className={`bingo-cell ${cell.state} ${cell.is_joker ? 'joker' : ''} ${cell.is_empty ? 'empty' : ''}`}
                onClick={() => isOwnCard && !cell.is_empty && !cell.is_joker && handleCellToggle(cell.id, cell.state)}
                style={{
                  border: '1px solid #ccc',
                  padding: '15px',
                  minHeight: '120px',
                  cursor: isOwnCard && !cell.is_empty && !cell.is_joker ? 'pointer' : 'default',
                  backgroundColor: cell.state === 'completed' ? '#90EE90' : 
                                   cell.is_joker ? '#FFD700' : 
                                   cell.is_empty ? '#f0f0f0' : 'white'
                }}
              >
                {cell.is_joker && <div style={{ fontWeight: 'bold', color: '#ff6b00' }}>⭐ JOKER</div>}
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  {cell.resolution_text}
                </div>
                {cell.state === 'completed' && <div style={{ marginTop: '5px' }}>✓</div>}
              </div>
            ))
          ))}
        </div>

        {isOwnCard && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p>Click cells to mark them as completed or to revert</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BingoCardView;
