import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mode: localStorage.getItem('themeMode') || 'dark',
  primaryColor: localStorage.getItem('themePrimaryColor') || '#e00000', // Default red
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', state.mode);
    },
    setMode: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('themeMode', state.mode);
    },
    setPrimaryColor: (state, action) => {
      state.primaryColor = action.payload;
      localStorage.setItem('themePrimaryColor', state.primaryColor);
    },
  },
});

export const { toggleMode, setMode, setPrimaryColor } = themeSlice.actions;
export default themeSlice.reducer;
