import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Readability } from '@mozilla/readability';
import ReaderView from '../components/ReaderView';
import { adaptWeChat } from '../utils/adapter';
import '../index.css';

console.log('FlowRead Content Script Loaded');

const App: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    const handleMessage = (request: any, _sender: any, _sendResponse: any) => {
      if (request.type === 'TOGGLE_READER') {
        if (isVisible) {
          setIsVisible(false);
        } else {
          try {
            const documentClone = document.cloneNode(true) as Document;
            
            // 应用适配器 (目前主要是微信公众号)
            adaptWeChat(documentClone);

            const reader = new Readability(documentClone);
            const parsed = reader.parse();
            
            if (parsed) {
              setArticle(parsed);
              setIsVisible(true);
            } else {
              alert('FlowRead: 无法解析当前页面正文。');
            }
          } catch (error) {
            console.error('FlowRead Parse Error:', error);
            alert('FlowRead: 解析页面时出错。');
          }
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <ReaderView 
      article={article} 
      isVisible={isVisible} 
      onClose={() => setIsVisible(false)} 
    />
  );
};

// Create a root element for our React app
const rootElement = document.createElement('div');
rootElement.id = 'flow-read-root';
document.body.appendChild(rootElement);

// Render the app
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
