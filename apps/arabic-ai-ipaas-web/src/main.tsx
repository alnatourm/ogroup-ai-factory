import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nProvider } from './i18n/I18nContext.js';
import { App } from './App.js';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </React.StrictMode>
  );
}
