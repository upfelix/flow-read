import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { NoteData, generateMarkdown } from '../../utils/storage';
import { Trash2, Copy, Search, Image as ImageIcon } from 'lucide-react';
import '../../index.css';

const Library: React.FC = () => {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 加载所有笔记
    chrome.storage.local.get(null, (items) => {
      const loadedNotes: NoteData[] = [];
      Object.keys(items).forEach(key => {
        if (key.startsWith('note_')) {
          loadedNotes.push(items[key]);
        }
      });
      // 按时间倒序排列
      loadedNotes.sort((a, b) => b.createdAt - a.createdAt);
      setNotes(loadedNotes);
    });
  }, []);

  const deleteNote = (url: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      chrome.storage.local.remove(`note_${url}`, () => {
        setNotes(prev => prev.filter(n => n.url !== url));
      });
    }
  };

  const copyNote = (note: NoteData) => {
    const md = generateMarkdown(note);
    navigator.clipboard.writeText(md);
    alert('Note copied to clipboard!');
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.highlights.some(h => h.text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 text-ink p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Notebook</h1>
            <p className="text-gray-500 mt-1">{notes.length} articles saved</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search notes..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No notes found.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredNotes.map(note => (
              <div key={note.url} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
                      <a href={note.url} target="_blank" rel="noopener noreferrer">
                        {note.title}
                      </a>
                    </h2>
                    <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      {note.sourceName && (
                        <>
                          <span>•</span>
                          <span>{note.sourceName}</span>
                        </>
                      )}
                      {note.author && (
                        <>
                          <span>•</span>
                          <span>{note.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => copyNote(note)}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy Markdown"
                    >
                      <Copy size={18} />
                    </button>
                    <button 
                      onClick={() => deleteNote(note.url)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {note.highlights.slice(0, 3).map(h => (
                    <div key={h.id} className={`pl-3 border-l-4 text-gray-700 text-sm py-1 bg-opacity-30 rounded-r flex items-center`}
                         style={{ borderColor: getHighlightColor(h.color), backgroundColor: getHighlightColor(h.color) + '20' }}>
                      {h.type === 'image' ? (
                        <div className="flex items-center w-full">
                          <ImageIcon size={14} className="mr-2 opacity-50 flex-shrink-0"/>
                          <span className="italic truncate flex-1">{h.text || 'Image'}</span>
                          {h.imageUrl && <img src={h.imageUrl} className="h-8 w-8 ml-2 object-cover rounded border border-gray-200" alt="" />}
                        </div>
                      ) : (
                        h.text
                      )}
                    </div>
                  ))}
                  {note.highlights.length > 3 && (
                    <div className="text-sm text-gray-400 pl-3">
                      + {note.highlights.length - 3} more highlights...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const getHighlightColor = (color: string) => {
  switch (color) {
    case 'red': return '#ffcdd2'; // Using lighter/bg colors for display
    case 'green': return '#c8e6c9';
    case 'blue': return '#bbdefb';
    case 'yellow': default: return '#ffeb3b';
  }
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Library />
  </React.StrictMode>
);
