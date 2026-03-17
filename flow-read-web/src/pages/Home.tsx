import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { api, API_BASE_URL } from '../api';

export const Home = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // quick backend connectivity check
    api.ping().then((ok) => {
      if (!ok) {
        setError(`后端未启动或不可访问 (${API_BASE_URL})`);
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
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-10">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl transform -rotate-3 mb-8">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight font-serif">
            FlowRead
          </h2>
          <p className="mt-4 text-lg text-slate-600 font-sans">
            粘贴链接，享受极致纯净的阅读体验。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-xl shadow-lg bg-white p-2 border border-slate-100">
            <div>
              <label htmlFor="url" className="sr-only">Article URL</label>
              <input
                id="url"
                name="url"
                type="url"
                required
                className="appearance-none block w-full px-4 py-4 text-lg text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
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
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <span className="flex items-center">
                  开始阅读
                  <ArrowRight className="ml-2 h-5 w-5" />
                </span>
              )}
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg border border-red-100">{error}</div>
          )}
        </form>
      </div>
    </div>
  );
};
