// Personal Resolutions page
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { Resolution } from '../types';

const Resolutions: React.FC = () => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [newResolution, setNewResolution] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResolutions();
  }, []);

  const loadResolutions = async () => {
    try {
      const response = await apiClient.get('/resolutions');
      setResolutions(response.data.resolutions);
    } catch (error) {
      console.error('Failed to load resolutions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResolution.trim()) return;

    try {
      await apiClient.post('/resolutions', { text: newResolution });
      setNewResolution('');
      loadResolutions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create resolution');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim()) return;

    try {
      await apiClient.put(`/resolutions/${id}`, { text: editText });
      setEditingId(null);
      loadResolutions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update resolution');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resolution?')) return;

    try {
      await apiClient.delete(`/resolutions/${id}`);
      loadResolutions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete resolution');
    }
  };

  const startEdit = (resolution: Resolution) => {
    setEditingId(resolution.id);
    setEditText(resolution.text);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Resolutions</h1>
        <Link to="/dashboard">Back to Dashboard</Link>
      </header>

      <div className="page-content">
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            placeholder="New resolution..."
            value={newResolution}
            onChange={(e) => setNewResolution(e.target.value)}
            maxLength={500}
          />
          <button type="submit">Add Resolution</button>
        </form>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="resolutions-list">
            {resolutions.map((resolution) => (
              <div key={resolution.id} className="resolution-item">
                {editingId === resolution.id ? (
                  <>
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={500}
                    />
                    <button onClick={() => handleUpdate(resolution.id)}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <p>{resolution.text}</p>
                    <div className="resolution-actions">
                      <button onClick={() => startEdit(resolution)}>Edit</button>
                      <button onClick={() => handleDelete(resolution.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Resolutions;
