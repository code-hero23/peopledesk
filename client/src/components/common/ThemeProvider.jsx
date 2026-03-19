import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const ThemeProvider = ({ children }) => {
  const { mode, primaryColor } = useSelector((state) => state.theme);

  useEffect(() => {
    // 1. Handle Dark/Light Mode
    const root = window.document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Handle Primary Color
    // Helper to darken a color (for :dark variants if needed)
    const darkenColor = (hex, percent) => {
      let num = parseInt(hex.replace('#', ''), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) - amt,
        G = ((num >> 8) & 0x00ff) - amt,
        B = (num & 0x0000ff) - amt;
      return (
        '#' +
        (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255))
          .toString(16)
          .slice(1)
      );
    };

    const primaryDark = darkenColor(primaryColor, 20);
    
    // Apply variables to root
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--primary-dark', primaryDark);

    // 3. Global Style Override for legacy hardcoded colors
    let styleTag = document.getElementById('theme-overrides');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'theme-overrides';
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      /* Primary Color Overrides */
      .bg-blue-600, .bg-red-600, .bg-rose-600, .bg-emerald-600, .bg-amber-600,
      .hover\\:bg-blue-700:hover, .hover\\:bg-red-700:hover, .hover\\:bg-rose-700:hover, .hover\\:bg-emerald-700:hover { 
        background-color: var(--primary-color) !important; 
      }
      .text-blue-600, .text-red-600, .text-rose-600, .text-emerald-600, .text-amber-600,
      .hover\\:text-blue-700:hover, .hover\\:text-red-700:hover { 
        color: var(--primary-color) !important; 
      }
      .border-blue-600, .border-red-600, .border-rose-600, .border-emerald-600 { 
        border-color: var(--primary-color) !important; 
      }

      /* Dark Mode Global Surface Overrides */
      .dark .bg-white { background-color: var(--bg-card) !important; }
      .dark .bg-slate-50, .dark .bg-gray-50, .dark .bg-zinc-50, .dark .bg-slate-100, .dark .bg-gray-100 { 
        background-color: var(--bg-surface) !important; 
      }
      .dark .bg-slate-50\\/50, .dark .bg-gray-50\\/50 { background-color: rgba(15, 23, 42, 0.5) !important; }
      
      .dark .text-slate-800, .dark .text-slate-900, .dark .text-gray-900, .dark .text-gray-800 { color: var(--text-main) !important; }
      .dark .text-slate-600, .dark .text-slate-500, .dark .text-gray-600, .dark .text-gray-500 { color: var(--text-muted) !important; }
      
      .dark .border-slate-100, .dark .border-slate-200, .dark .border-gray-100, .dark .border-gray-200 { border-color: var(--border-color) !important; }
      .dark .border-slate-50, .dark .border-gray-50 { border-color: var(--border-light) !important; }
      .dark .divide-slate-100 > * + *, .dark .divide-slate-200 > * + *, .dark .divide-gray-100 > * + * { border-color: var(--border-color) !important; }

      /* Page Wrappers with min-h-screen */
      .dark .min-h-screen { background-color: var(--bg-main) !important; }
      
      /* Table Specifics */
      .dark table tr:hover { background-color: var(--bg-surface) !important; }
      .dark thead tr { background-color: var(--bg-surface) !important; }
      
      /* Inputs */
      .dark input:not([type="checkbox"]), .dark select, .dark textarea {
        background-color: var(--bg-main) !important;
        color: var(--text-main) !important;
        border-color: var(--border-color) !important;
      }

      /* Calendar/Card Specifics from screenshot */
      .dark .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.5) !important; }
      .dark .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2) !important; }
      .dark .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4) !important; }
      .dark .shadow-slate-200\\/50 { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.6) !important; }

      /* Recharts Tooltip Fix */
      .dark .recharts-default-tooltip {
        background-color: var(--bg-card) !important;
        border-color: var(--border-color) !important;
      }
    `;
    
  }, [mode, primaryColor]);

  return children;
};

export default ThemeProvider;
