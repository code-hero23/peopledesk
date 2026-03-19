import { useDispatch, useSelector } from 'react-redux';
import { toggleMode, setPrimaryColor } from '../../features/theme/themeSlice';
import { Sun, Moon, Palette, Check } from 'lucide-react';

const colors = [
  { name: 'Red', value: '#e00000' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

const ThemeSelector = ({ isCollapsed }) => {
  const dispatch = useDispatch();
  const { mode, primaryColor } = useSelector((state) => state.theme);

  return (
    <div className={`space-y-4 ${isCollapsed ? 'flex flex-col items-center' : 'px-2'}`}>
      {/* Mode Toggle */}
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
        <button
          onClick={() => dispatch(toggleMode())}
          title={mode === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg transition-all duration-300 border border-slate-700/50 hover:border-slate-500
            ${mode === 'dark' ? 'bg-slate-800 text-yellow-500' : 'bg-white/10 text-slate-300'}
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          {!isCollapsed && <span className="text-sm font-medium">{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
      </div>

      {/* Color Selection */}
      <div className={`space-y-2 ${isCollapsed ? 'hidden' : 'block'}`}>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
          <Palette size={14} />
          <span>Primary Color</span>
        </div>
        <div className="flex flex-wrap gap-2 px-1">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => dispatch(setPrimaryColor(color.value))}
              title={color.name}
              className="relative w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border border-black/10"
              style={{ backgroundColor: color.value }}
            >
              {primaryColor === color.value && (
                <Check size={12} className="text-white drop-shadow-md" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Small selector for collapsed mode */}
      {isCollapsed && (
          <div className="group relative">
              <button className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <Palette size={18} />
              </button>
              <div className="absolute left-full ml-2 top-0 p-3 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all scale-95 group-hover:scale-100 z-[100] w-48">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2 px-1">Primary Color</p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                        <button
                        key={color.value}
                        onClick={() => dispatch(setPrimaryColor(color.value))}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-white/10"
                        style={{ backgroundColor: color.value }}
                        >
                        {primaryColor === color.value && <Check size={14} className="text-white" />}
                        </button>
                    ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ThemeSelector;
