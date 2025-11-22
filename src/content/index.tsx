import React from 'react'
import ReactDOM from 'react-dom/client'
import styles from '../style.css?inline'
import { ContentApp } from './ContentApp'

const rootId = 'ai-chat-export-root';
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

// Avoid re-injecting if HMR triggers
if (!shadowRoot.querySelector('style')) {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);
}

// Create a root for React if it doesn't exist
let appRoot = shadowRoot.querySelector('#app-root') as HTMLElement;
if (!appRoot) {
  appRoot = document.createElement('div');
  appRoot.id = 'app-root';
  // appRoot inherits pointer-events: none from host, which is what we want.
  // Interactive children will override this.
  shadowRoot.appendChild(appRoot);
}

ReactDOM.createRoot(appRoot).render(
  <React.StrictMode>
    <ContentApp />
  </React.StrictMode>
)
