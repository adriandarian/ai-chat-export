import React from 'react'
import ReactDOM from 'react-dom/client'
import '../style.css'
import { ContentApp } from './ContentApp'

const rootId = 'ai-chat-export-root';
let root = document.getElementById(rootId);

if (!root) {
  root = document.createElement('div')
  root.id = rootId
  document.body.appendChild(root)
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ContentApp />
  </React.StrictMode>
)
