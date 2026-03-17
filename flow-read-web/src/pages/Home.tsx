import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { api } from '../api';

export const Home = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // quick backend connectivity check
    api.ping().then((ok) => {
      if (!ok) {
        setError('后端未启动或不可访问：请确保 http://localhost:5000 正在运行');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');

    try {
      // For now, we fetch here to validate, but ideally we just pass URL to reader
      // and reader fetches it. Let's do the latter to keep Home fast.
      // But wait, passing large content via state is okay, but URL param is better for sharing.
      // Let's just navigate to /read?url=...
      navigate(`/read?url=${encodeURIComponent(url)}`);
    } catch (err) {
      setError('Invalid URL or failed to process.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            FlowRead Web
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Paste a link, enjoy distraction-free reading.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="url" className="sr-only">Article URL</label>
              <input
                id="url"
                name="url"
                type="url"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span className="flex items-center">
                  Start Reading
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              )}
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
};
