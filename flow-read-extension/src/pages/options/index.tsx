import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { saveNotionConfig, getNotionConfig } from '../../services/notion';
import '../../index.css';

const OptionsPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    // Load existing config
    getNotionConfig().then((config) => {
      if (config) {
        setToken(config.token);
        setDatabaseId(config.databaseId);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!token || !databaseId) {
      alert('Please fill in both fields.');
      return;
    }

    setStatus('saving');
    try {
      await saveNotionConfig({ token, databaseId });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Save config failed:', error);
      alert('Failed to save configuration.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <img src="/icons/icon48.png" className="w-8 h-8 mr-3" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          FlowRead Settings
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notion Integration Token
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="secret_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" className="text-blue-600 hover:underline">Notion Developers</a>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database ID
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="32-character ID from database URL"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Open your database as a full page, and copy the ID from the URL.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
              status === 'saved' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-400">
           FlowRead v1.2
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>
);
