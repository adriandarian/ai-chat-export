import React from 'react'
import ReactDOM from 'react-dom/client'
import styles from '../style.css?inline'
import { ContentApp } from './ContentApp'

const rootId = 'ai-chat-export-root';

// Ensure DOM is ready before initializing
const initContentScript = () => {
  // Wait for body if not ready
  if (!document.body) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initContentScript);
      return;
    }
    // If still no body, wait a bit more
    setTimeout(initContentScript, 100);
    return;
  }

  let host = document.getElementById(rootId);

  if (!host) {
    host = document.createElement('div');
    host.id = rootId;
    host.style.position = 'absolute';
    host.style.top = '0';
    host.style.left = '0';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none'; // Host lets events pass through
    document.body.appendChild(host);
  }

  // Create Shadow DOM
  const shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });

  // Avoid re-injecting if already initialized or HMR triggers
  if (shadowRoot.querySelector('#app-root')) {
    return; // Already initialized
  }

  if (!shadowRoot.querySelector('style')) {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    shadowRoot.appendChild(styleElement);
  }

  // Create a root for React if it doesn't exist
  const appRoot = document.createElement('div');
  appRoot.id = 'app-root';
  // appRoot inherits pointer-events: none from host, which is what we want.
  // Interactive children will override this.
  shadowRoot.appendChild(appRoot);

  ReactDOM.createRoot(appRoot).render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>
  );
};

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
