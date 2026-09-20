import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';

// An error thrown while rendering unmounts the React tree and leaves an empty page (pitch black in dark mode).
// Show what happened and a retry button instead.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <h1>🍲 Something went wrong</h1>
        <p>Bir şeyler ters gitti · Etwas ist schiefgelaufen</p>
        <pre>{error.message}{'\n\n'}{error.stack}{'\n\n'}{navigator.userAgent}</pre>
        <button className="primary" onClick={() => location.reload()}>↻ Reload</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);
