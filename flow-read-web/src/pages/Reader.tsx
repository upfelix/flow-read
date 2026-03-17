import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Highlighter, Copy, Share, ChevronRight, ChevronLeft, PenTool } from 'lucide-react';
import { api } from '../api';
import type { Article } from '../api';
import type { Highlight, NoteData } from '../types';
import { generateMarkdown } from '../types';

export const Reader = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const articleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!url) {
      setError('No URL provided');
      setLoading(false);
      return;
    }

    const fetchArticle = async () => {
      try {
        setLoading(true);
        const data = await api.parseArticle(url);
        setArticle(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load article. Please check the URL and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [url]);

  // Selection -> highlight text (Improved stability)
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      // Ensure selection is within the article content
      if (!el.contains(range.commonAncestorContainer)) return;

      const text = sel.toString().trim();
      if (!text) return;

      // Create highlight span
      const span = document.createElement('span');
      span.className = 'fr-highlight-yellow';
      
      try {
        // Attempt to surround contents
        range.surroundContents(span);
      } catch (e) {
        // Fallback for complex selections (e.g. crossing block boundaries)
        // This is a simplified fallback; for production robust highlighting, 
        // a library like 'mark.js' or recursive wrapping is better.
        // Here we just extract and re-insert to ensure valid DOM.
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }

      // Add to state
      const pos = (span.getBoundingClientRect().top || 0) + window.scrollY;
      const item: Highlight = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'text',
        text,
        color: 'yellow',
        createdAt: Date.now(),
        pos,
      };

      setHighlights((prev) => [...prev, item]);
      sel.removeAllRanges(); // Clear selection
      console.debug('[FlowRead] text highlighted:', item);
    };

    // Use pointerup for better mobile/desktop compatibility
    const onPointerUp = () => {
      // Small delay to let the selection finalize
      setTimeout(handleSelection, 10);
    };

    el.addEventListener('pointerup', onPointerUp);
    return () => el.removeEventListener('pointerup', onPointerUp);
  }, [article]); // Re-bind when article loads

  // Click image -> add to notes
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const onClick = (e: MouseEvent) => {
      // Find clicked image
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG') return;
      
      const img = target as HTMLImageElement;
      // Prevent default behavior (e.g. if wrapped in a link)
      e.preventDefault();
      e.stopPropagation();

      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src) return;

      // Visual feedback
      if (img.classList.contains('fr-image-captured')) {
        // Optional: Toggle off? For now just keep it or maybe alert 'already added'
        return;
      }
      img.classList.add('fr-image-captured');

      const item: Highlight = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'image',
        text: img.alt || 'Image',
        imageUrl: src,
        color: 'yellow',
        createdAt: Date.now(),
        pos: img.getBoundingClientRect().top + window.scrollY,
      };

      setHighlights((prev) => [...prev, item]);
      // Open panel to show feedback
      setPanelOpen(true);
      console.debug('[FlowRead] image captured:', item);
    };

    el.addEventListener('click', onClick, { capture: true });
    return () => el.removeEventListener('click', onClick, { capture: true });
  }, [article]);

  const noteData: NoteData | null = useMemo(() => {
    if (!article) return null;
    return {
      url: article.url,
      title: article.title,
      author: article.byline || '',
      sourceName: article.siteName || '',
      highlights,
      createdAt: Date.now(),
    };
  }, [article, highlights]);

  const handleCopyAll = async () => {
    if (!noteData) return;
    const md = generateMarkdown(noteData);
    await navigator.clipboard.writeText(md);
    alert('已复制 Markdown 笔记到剪贴板');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-10 w-10 text-blue-600 mb-4" />
        <p className="text-slate-500 animate-pulse font-serif">Loading your reading space...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#FDFBF7]">
        <div className="text-red-500 mb-6 text-lg font-medium bg-red-50 px-6 py-4 rounded-xl border border-red-100 max-w-lg text-center">
          {error || 'Article not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center px-6 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-serif selection:bg-yellow-200 selection:text-slate-900">
      
      {/* Floating Toolbar (Left) */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
        <button
          onClick={() => navigate('/')}
          className="p-3 bg-white rounded-full shadow-md border border-slate-100 text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all tooltip-trigger"
          title="Back Home"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="w-full h-px bg-slate-200 my-1"></div>
        <button
          className={`p-3 rounded-full shadow-md border transition-all ${panelOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-500 hover:text-blue-600'}`}
          title="Toggle Notes Panel"
          onClick={() => setPanelOpen((v) => !v)}
        >
          <PenTool className="h-5 w-5" />
        </button>
        <button
          className="p-3 bg-white rounded-full shadow-md border border-slate-100 text-slate-500 hover:text-green-600 hover:border-green-100 transition-all"
          title="Copy Markdown"
          onClick={handleCopyAll}
        >
          <Copy className="h-5 w-5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ease-in-out ${panelOpen ? 'mr-96' : 'mr-0'}`}>
        <main className="max-w-3xl mx-auto px-6 py-12 sm:px-8 lg:px-12">
          <article className="prose prose-lg prose-slate mx-auto prose-headings:font-sans prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-sm">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight font-sans">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-sm text-slate-500 mb-10 gap-4 border-b border-slate-100 pb-6 font-sans">
              {article.byline && (
                <span className="font-medium text-slate-700 flex items-center bg-slate-100 px-2 py-1 rounded">
                  {article.byline}
                </span>
              )}
              <span className="text-slate-400">|</span>
              <span>{article.siteName}</span>
              <span className="text-slate-400">|</span>
              <a 
                href={article.url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors"
              >
                Original Source ↗
              </a>
            </div>

            {/* Render HTML content safely */}
            <div 
              id="flowread-content"
              dangerouslySetInnerHTML={{ __html: article.content }} 
              ref={articleRef}
              className="article-body leading-relaxed text-lg text-slate-800"
            />
          </article>
        </main>
      </div>

      {/* Right Notes Panel */}
      <aside 
        className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
            <Highlighter className="h-4 w-4 text-yellow-500" />
            Reading Notes
          </h2>
          <button 
            onClick={() => setPanelOpen(false)}
            className="p-1.5 hover:bg-slate-200 rounded-md text-slate-500 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {highlights.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="mb-2">No highlights yet.</p>
              <p className="text-sm">Select text or click images to add notes.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {highlights.map((h, i) => (
                <li key={h.id} className="group relative">
                  <div className="absolute -left-3 top-2 w-1 h-full bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors"></div>
                  {h.type === 'image' ? (
                    <div className="pl-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Image</div>
                      <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                        {h.imageUrl && (
                          <img src={h.imageUrl} alt={h.text || 'Image'} className="w-full h-32 object-cover" />
                        )}
                      </div>
                      {h.text && h.text !== 'Image' && <div className="mt-1 text-xs text-slate-500 truncate">{h.text}</div>}
                    </div>
                  ) : (
                    <div className="pl-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">Quote</div>
                      <div className="p-3 rounded-lg bg-yellow-50/50 border border-yellow-100 text-slate-700 text-sm leading-relaxed italic font-serif group-hover:bg-yellow-50 transition-colors">
                        "{h.text}"
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleCopyAll}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy All to Markdown
          </button>
        </div>
      </aside>
    </div>
  );
};
