import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Highlighter, Copy, Share } from 'lucide-react';
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

  // Selection -> highlight text
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const onPointerUp = () => {
      // Use timeout to ensure selection range is ready
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;
        if (sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (!el.contains(range.commonAncestorContainer)) return;
        const text = sel.toString().trim();
        if (!text) return;
        const span = document.createElement('span');
        span.className = 'fr-highlight-yellow';
        try {
          range.surroundContents(span);
        } catch {
          const frag = range.extractContents();
          span.appendChild(frag);
          range.insertNode(span);
        }
        const pos = (range.getBoundingClientRect().top || 0) + window.scrollY;
        const item: Highlight = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'text',
          text,
          color: 'yellow',
          createdAt: Date.now(),
          pos,
        };
        setHighlights((prev) => [...prev, item]);
        sel.removeAllRanges();
        console.debug('[FlowRead] text highlighted:', item);
      }, 0);
    };
    el.addEventListener('pointerup', onPointerUp, { capture: true });
    return () => el.removeEventListener('pointerup', onPointerUp, { capture: true } as any);
  }, [articleRef]);

  // Click image -> add to notes
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const path = (e.composedPath && e.composedPath()) || [];
      const node = (path.find((n) => (n as HTMLElement)?.nodeName === 'IMG') ||
        (e.target as HTMLElement)) as HTMLElement | undefined;
      if (!node) return;
      const img = node.closest?.('img') as HTMLImageElement | null;
      if (!img) return;
      // Prevent anchor navigation when clicking image
      e.preventDefault();
      e.stopPropagation();
      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src) return;
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
      console.debug('[FlowRead] image captured:', item);
    };
    el.addEventListener('click', onClick, { capture: true });
    return () => el.removeEventListener('click', onClick, { capture: true } as any);
  }, [articleRef]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-4" />
        <p className="text-gray-500 animate-pulse">Parsing content...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4 text-lg font-medium">{error || 'Article not found'}</div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-900 font-sans selection:bg-yellow-200 selection:text-gray-900">
      {/* Header / Toolbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex items-center space-x-2">
           <button
             className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
             title="打开/收起笔记面板"
             onClick={() => setPanelOpen((v) => !v)}
           >
             <Highlighter className="h-5 w-5 text-yellow-500" />
           </button>
           <button
             className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
             title="复制 Markdown 笔记"
             onClick={handleCopyAll}
           >
             <Copy className="h-5 w-5" />
           </button>
           <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="保存到 Notion（即将上线）">
             <Share className="h-5 w-5" />
           </button>
        </div>
      </header>

      {/* Article Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex">
        {/* Content area */}
        <div className="flex-1 min-w-0" id="flowread-article">
        <article className="prose prose-lg prose-slate mx-auto prose-headings:font-bold prose-a:text-blue-600">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>
          
          <div className="flex items-center text-sm text-gray-500 mb-8 space-x-4 border-b pb-4 border-gray-100">
            {article.byline && (
               <span className="font-medium text-gray-700">{article.byline}</span>
            )}
            <span>{article.siteName}</span>
            <a href={article.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate max-w-[200px]">
              Original Source
            </a>
          </div>

          {/* Render HTML content safely */}
          <div 
            dangerouslySetInnerHTML={{ __html: article.content }} 
            ref={articleRef}
            className="article-body leading-relaxed"
          />
        </article>
        </div>

        {/* Notes panel */}
        {panelOpen && noteData && (
          <aside className="w-80 ml-6 sticky top-16 h-[calc(100vh-4rem)] overflow-auto bg-white/70 border border-gray-200 rounded-lg p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3">笔记</h2>
            <ul className="space-y-3">
              {highlights.map((h) => (
                <li key={h.id} className="text-sm">
                  {h.type === 'image' ? (
                    <div>
                      <div className="text-gray-500 mb-1">图片</div>
                      {h.imageUrl && (
                        <img src={h.imageUrl} alt={h.text || 'Image'} className="max-w-full rounded border" />
                      )}
                      {h.text && <div className="mt-1 text-gray-600">{h.text}</div>}
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-yellow-50 border border-yellow-100">{h.text}</div>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
    </div>
  );
};
