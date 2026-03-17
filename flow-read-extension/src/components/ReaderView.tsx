import React, { useRef, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { X, Copy, Trash2, Highlighter, Image as ImageIcon, Send, Settings } from 'lucide-react';
import { Highlight, NoteData, saveNote, getNote, generateMarkdown, HighlightColor } from '../utils/storage';
import { syncToNotion, getNotionConfig } from '../services/notion';

interface Article {
  title: string;
  byline: string;
  content: string;
  length: number;
  excerpt: string;
  siteName: string;
}

interface ReaderViewProps {
  article: Article | null;
  onClose: () => void;
  isVisible: boolean;
}

const COLORS: { value: HighlightColor; label: string; bg: string }[] = [
  { value: 'yellow', label: 'Yellow', bg: '#ffeb3b' },
  { value: 'red', label: 'Red', bg: '#ffcdd2' },
  { value: 'green', label: 'Green', bg: '#c8e6c9' },
  { value: 'blue', label: 'Blue', bg: '#bbdefb' },
];

const getRangeGlobalOffset = (
  root: Node,
  targetNode: Node,
  targetOffset: number,
): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;

  while (walker.nextNode()) {
    const current = walker.currentNode;
    const textLength = current.textContent?.length ?? 0;
    if (current === targetNode) {
      return total + targetOffset;
    }
    total += textLength;
  }

  return -1;
};

const createRangeFromGlobalOffsets = (
  root: Node,
  start: number,
  end: number,
): Range | null => {
  if (start < 0 || end <= start) return null;

  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startNodeOffset = 0;
  let endNodeOffset = 0;

  while (walker.nextNode()) {
    const current = walker.currentNode;
    const textLength = current.textContent?.length ?? 0;
    const nextTotal = total + textLength;

    if (!startNode && start >= total && start <= nextTotal) {
      startNode = current;
      startNodeOffset = start - total;
    }

    if (!endNode && end >= total && end <= nextTotal) {
      endNode = current;
      endNodeOffset = end - total;
      break;
    }

    total = nextTotal;
  }

  if (!startNode || !endNode) return null;
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);
  return range;
};

const createRangeFromText = (root: Node, targetText: string): Range | null => {
  const normalized = targetText.trim();
  if (!normalized) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let fullText = '';
  while (walker.nextNode()) {
    fullText += walker.currentNode.textContent ?? '';
  }

  const start = fullText.indexOf(normalized);
  if (start < 0) return null;
  const end = start + normalized.length;
  return createRangeFromGlobalOffsets(root, start, end);
};

const unwrapHighlightSpans = (root: HTMLElement) => {
  const spans = root.querySelectorAll('span.flow-read-highlight');
  spans.forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });
};

const ReaderView: React.FC<ReaderViewProps> = ({ article, onClose, isVisible }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Copied to clipboard!');
  const [currentColor, setCurrentColor] = useState<HighlightColor>('yellow');
  const [isSyncing, setIsSyncing] = useState(false);
  const [notionConfigured, setNotionConfigured] = useState(false);

  // 初始化加载笔记
  useEffect(() => {
    if (isVisible && article) {
      // ... existing code ...
      const url = window.location.href;
      getNote(url).then(note => {
        if (note) {
          setHighlights(note.highlights);
        }
      });
      document.body.style.overflow = 'hidden';

      // Check Notion Config
      getNotionConfig().then(config => {
         setNotionConfigured(!!config);
      });
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible, article]);

  // 保存笔记
  useEffect(() => {
    if (article && highlights.length > 0) {
      const note: NoteData = {
        url: window.location.href,
        title: article.title,
        author: article.byline,
        sourceName: article.siteName,
        highlights,
        createdAt: Date.now(),
      };
      saveNote(note).catch((error) => {
        console.error('Save failed:', error);
        // 如果是因为超出配额，提示用户
        if (error.message?.includes('quota') || error.message?.includes('MAX_WRITE_OPERATIONS_PER_HOUR')) {
           alert('FlowRead: Storage quota exceeded! Please delete some old notes.');
        } else {
           // 其他错误也简单提示一下
           // alert('FlowRead: Failed to save note.');
        }
      });
    }
  }, [highlights, article]);

  // 根据 highlights 状态重绘 DOM，保证高亮可持久恢复
  useEffect(() => {
    if (!isVisible || !article || !contentRef.current) return;
    const articleEl = contentRef.current.querySelector('.flow-read-content') as HTMLElement | null;
    if (!articleEl) return;

    // 先清理旧高亮，再按状态重建，避免重复包裹
    unwrapHighlightSpans(articleEl);
    articleEl.querySelectorAll('img').forEach((img) => {
      img.style.outline = '';
      delete (img as HTMLImageElement).dataset.flowReadHighlightId;
    });

    const orderedTextHighlights = highlights
      .filter((h) => h.type === 'text')
      .sort((a, b) => {
        const aStart = typeof a.startOffset === 'number' ? a.startOffset : Number.MAX_SAFE_INTEGER;
        const bStart = typeof b.startOffset === 'number' ? b.startOffset : Number.MAX_SAFE_INTEGER;
        return bStart - aStart;
      });

    orderedTextHighlights.forEach((h) => {
      const range =
        typeof h.startOffset === 'number' && typeof h.endOffset === 'number'
          ? createRangeFromGlobalOffsets(articleEl, h.startOffset, h.endOffset)
          : createRangeFromText(articleEl, h.text);
      if (!range || range.collapsed) return;

      const span = document.createElement('span');
      span.className = `flow-read-highlight highlight-${h.color}`;
      span.id = h.id;

      try {
        range.surroundContents(span);
      } catch {
        const extracted = range.extractContents();
        span.appendChild(extracted);
        range.insertNode(span);
      }
    });

    const imageHighlights = highlights.filter((h) => h.type === 'image' && h.imageUrl);
    imageHighlights.forEach((h) => {
      const image = Array.from(articleEl.querySelectorAll('img')).find((img) => img.src === h.imageUrl);
      if (!image) return;
      image.style.outline = `4px solid ${COLORS.find((c) => c.value === h.color)?.bg || '#ffeb3b'}`;
      image.style.transition = 'outline 0.2s';
      (image as HTMLImageElement).dataset.flowReadHighlightId = h.id;
    });
  }, [highlights, isVisible, article]);

  // 处理图片点击
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      const src = img.src;
      const alt = img.alt || 'Image';
      
      // 检查是否已经添加过
      if (highlights.some(h => h.type === 'image' && h.imageUrl === src)) {
        const existing = highlights.find(h => h.type === 'image' && h.imageUrl === src);
        if (existing) {
           deleteHighlight(existing.id);
        }
        return;
      }

      const highlightId = `image-${Date.now()}`;

      const newHighlight: Highlight = {
        id: highlightId,
        type: 'image',
        text: alt,
        imageUrl: src,
        color: currentColor,
        createdAt: Date.now(),
        pos: Math.round(window.scrollY + img.getBoundingClientRect().top),
      };

      setHighlights(prev => [...prev, newHighlight]);
    }
  };

  // 处理划线逻辑
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.length < 2) {
      selection.removeAllRanges();
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const articleEl = contentRef.current?.querySelector('.flow-read-content');
      if (!articleEl) return;

      // 检查选区是否在文章内容区域内
      if (articleEl.contains(range.commonAncestorContainer)) {
        const startOffset = getRangeGlobalOffset(articleEl, range.startContainer, range.startOffset);
        const endOffset = getRangeGlobalOffset(articleEl, range.endContainer, range.endOffset);
        if (startOffset < 0 || endOffset <= startOffset) {
          selection.removeAllRanges();
          return;
        }

        const highlightId = `highlight-${Date.now()}`;
        const newHighlight: Highlight = {
          id: highlightId,
          type: 'text',
          text,
          color: currentColor,
          createdAt: Date.now(),
          pos: Math.round(window.scrollY + range.getBoundingClientRect().top),
          startOffset,
          endOffset,
        };

        setHighlights(prev => [...prev, newHighlight]);
        selection.removeAllRanges();
      }
    } catch (e) {
      console.error('Highlight failed', e);
    }
  };

  const scrollToHighlight = (id: string) => {
    let element = document.getElementById(id);

    if (!element) {
      element = contentRef.current?.querySelector(`[data-flow-read-highlight-id="${id}"]`) ?? null;
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 添加一个临时的闪烁效果
      const originalTransition = element.style.transition;
      element.style.transition = 'all 0.5s';
      
      if (element.tagName === 'IMG') {
          const originalOutline = element.style.outline;
          element.style.outline = '8px solid #ff9800';
          setTimeout(() => {
            element!.style.outline = originalOutline;
            element!.style.transition = originalTransition;
          }, 500);
      } else {
          const originalColor = element.style.backgroundColor;
          element.style.backgroundColor = '#ff9800'; 
          setTimeout(() => {
            element!.style.backgroundColor = originalColor;
            element!.style.transition = originalTransition;
          }, 500);
      }
    }
  };

  const deleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(item => item.id !== id));
  };

  const copyNotes = () => {
    if (!article) return;
    const note: NoteData = {
      url: window.location.href,
      title: article.title,
      author: article.byline,
      sourceName: article.siteName,
      highlights,
      createdAt: Date.now(),
    };
    const md = generateMarkdown(note);
    navigator.clipboard.writeText(md).then(() => {
      setToastMessage('Copied to clipboard!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    });
  };

  const handleSyncToNotion = async () => {
    if (!article) return;
    
    if (!notionConfigured) {
      if (confirm('Notion is not configured. Go to Settings?')) {
        window.open(chrome.runtime.getURL('src/pages/options/index.html'), '_blank');
      }
      return;
    }

    setIsSyncing(true);
    try {
      const config = await getNotionConfig();
      if (!config) throw new Error('No configuration found');

      const orderedHighlights = [...highlights].sort((a, b) => {
        const ap = a.pos ?? a.createdAt;
        const bp = b.pos ?? b.createdAt;
        return ap - bp;
      });

      const note: NoteData = {
        url: window.location.href,
        title: article.title,
        author: article.byline,
        sourceName: article.siteName,
        highlights: orderedHighlights,
        createdAt: Date.now(),
      };

      await syncToNotion(note, config);
      
      setToastMessage('Successfully synced to Notion!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Failed to sync to Notion. Check your token and database ID.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isVisible || !article) return null;

  const sanitizedContent = DOMPurify.sanitize(article.content);

  return (
    <div className="fixed inset-0 z-[2147483647] bg-paper flex font-sans">
      {/* Main Reading Area */}
      <div className="flex-1 overflow-y-auto h-full relative">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center justify-between px-8 py-3 z-10">
          <div className="flex items-center space-x-2 text-gray-600">
            <span className="font-bold text-lg tracking-tight">FlowRead</span>
            <button
              onClick={() => window.open(chrome.runtime.getURL('src/pages/library/index.html'), '_blank')}
              className="ml-4 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full transition-colors"
            >
              My Notebook
            </button>
            <button
              onClick={() => window.open(chrome.runtime.getURL('src/pages/options/index.html'), '_blank')}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
            title="Close Reader Mode (ESC)"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="max-w-3xl mx-auto px-8 pt-12 pb-24" 
          onMouseUp={handleMouseUp} 
          onClick={handleContentClick}
          ref={contentRef}
        >
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-ink mb-6 leading-tight">
              {article.title}
            </h1>
            <div className="flex items-center justify-center space-x-4 text-gray-500 text-sm">
              {article.byline && <span className="font-medium text-ink">{article.byline}</span>}
              {article.siteName && <span>{article.siteName}</span>}
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </header>

          <article
            className="flow-read-content text-ink"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
      </div>

      {/* Sidebar - Highlights */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center">
              <Highlighter size={16} className="mr-2" />
              Highlights ({highlights.length})
            </div>
            
            {/* Color Selector */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-full p-1">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCurrentColor(c.value)}
                  className={`w-4 h-4 rounded-full transition-transform ${currentColor === c.value ? 'scale-125 ring-2 ring-gray-300' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.bg }}
                  title={`Use ${c.label} highlighter`}
                />
              ))}
            </div>
          </h2>
        </div>

        {(() => {
          const orderedHighlights = [...highlights].sort((a, b) => {
            const ap = a.pos ?? a.createdAt;
            const bp = b.pos ?? b.createdAt;
            return ap - bp;
          });
          return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orderedHighlights.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 text-sm">
              <p>Select text to highlight</p>
              <p className="mt-2 text-xs">Click image to collect</p>
            </div>
          ) : (
            orderedHighlights.map(h => {
              const colorObj = COLORS.find(c => c.value === h.color) || COLORS[0];
              
              return (
                <div 
                  key={h.id} 
                  className="group relative p-3 rounded border transition-all cursor-pointer hover:shadow-sm"
                  style={{ 
                    backgroundColor: colorObj.bg, 
                    borderColor: 'rgba(0,0,0,0.05)' 
                  }}
                  onClick={() => scrollToHighlight(h.id)}
                >
                  {h.type === 'image' ? (
                    <div className="flex flex-col space-y-2">
                       <div className="flex items-center text-xs text-gray-500 mb-1">
                          <ImageIcon size={12} className="mr-1"/> Image
                       </div>
                       {h.imageUrl && (
                         <img src={h.imageUrl} alt={h.text} className="w-full h-32 object-cover rounded border border-black/10" />
                       )}
                       <p className="text-xs text-gray-600 italic truncate">{h.text}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800 leading-relaxed line-clamp-4">"{h.text}"</p>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 防止触发卡片点击跳转
                      deleteHighlight(h.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 text-red-500 rounded transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>); })()}

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <button
            onClick={copyNotes}
            disabled={highlights.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <Copy size={16} />
            <span>Copy Markdown</span>
          </button>
          
          <button
            onClick={handleSyncToNotion}
            disabled={highlights.length === 0 || isSyncing}
            className="w-full flex items-center justify-center space-x-2 bg-ink text-white py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {isSyncing ? (
               <span className="animate-pulse">Syncing...</span>
            ) : (
               <>
                 <Send size={16} />
                 <span>Sync to Notion</span>
               </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-[2147483648] animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ReaderView;
