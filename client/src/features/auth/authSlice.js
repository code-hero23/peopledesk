import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/auth/';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));

const initialState = {
    user: user ? user : null,
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
    blockedUser: null,
};

// Login user
export const login = createAsyncThunk('auth/login', async (user, thunkAPI) => {
    try {
        const response = await axios.post(API_URL + 'login', user);
        if (response.data) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    } catch (error) {
        const message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();

        if (error.response && error.response.status === 403) {
            return thunkAPI.rejectWithValue({
                message,
                name: error.response.data.name,
                isBlocked: true
            });
        }
        return thunkAPI.rejectWithValue(message);
    }
});

// Google Login
export const googleLogin = createAsyncThunk('auth/googleLogin', async (token, thunkAPI) => {
    try {
        const response = await axios.post(API_URL + 'google', { token });
        if (response.data) {
            localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
    } catch (error) {
        const message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Get latest user profile
export const getMe = createAsyncThunk('auth/getMe', async (_, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
        const response = await axios.get(API_URL + 'me', config);
        // We need to keep the token, so merge response with existing token
        return { ...response.data, token };
    } catch (error) {
        const message =
            (error.response && error.response.data && error.response.data.message) ||
            error.message ||
            error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Logout user
export const logout = createAsyncThunk('auth/logout', async () => {
    localStorage.removeItem('user');
});

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
            state.blockedUser = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
                state.blockedUser = null;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.user = null;
                if (typeof action.payload === 'object' && action.payload.isBlocked) {
                    state.message = action.payload.message;
                    state.blockedUser = action.payload.name;
                } else {
                    state.message = action.payload;
                    state.blockedUser = null;
                }
            })
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.blockedUser = null;
            })
            .addCase(googleLogin.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(googleLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
                state.blockedUser = null;
            })
            .addCase(googleLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.user = null;
                state.blockedUser = null;
            })
            .addCase(getMe.fulfilled, (state, action) => {
                state.user = action.payload;
                localStorage.setItem('user', JSON.stringify(action.payload));
            })
            .addCase(getMe.rejected, (state, action) => {
                if (action.payload === 'Not authorized, token failed') {
                    state.user = null;
                    localStorage.removeItem('user');
                }
            });
    },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
