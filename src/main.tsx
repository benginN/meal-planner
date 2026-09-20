import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';

// Çizim sırasında fırlayan hata React ağacını söker ve geriye boş (koyu temada simsiyah) sayfa kalır.
// Onun yerine ne olduğunu ve yeniden dene düğmesini göster.
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
        <h1>🍲 Bir şeyler ters gitti</h1>
        <p>Something went wrong · Etwas ist schiefgelaufen</p>
        <pre>{error.message}{'\n\n'}{error.stack}{'\n\n'}{navigator.userAgent}</pre>
        <button className="primary" onClick={() => location.reload()}>↻ Yeniden dene</button>
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
