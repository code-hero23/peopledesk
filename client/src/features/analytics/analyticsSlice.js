import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/analytics/';

const initialState = {
    teamOverview: [],
    employeeStats: null,
    isLoading: false,
    isError: false,
    message: '',
};

// Get Team Overview
export const getTeamOverview = createAsyncThunk(
    'analytics/getTeamOverview',
    async ({ startDate, endDate }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            };
            const response = await axios.get(API_URL + 'overview', config);
            return response.data;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Individual Employee Stats
export const getEmployeeStats = createAsyncThunk(
    'analytics/getEmployeeStats',
    async ({ id, startDate, endDate }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                params: { startDate, endDate }
            };
            const response = await axios.get(API_URL + `employee/${id}`, config);
            return response.data;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const analyticsSlice = createSlice({
    name: 'analytics',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isError = false;
            state.message = '';
            state.employeeStats = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getTeamOverview.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getTeamOverview.fulfilled, (state, action) => {
                state.isLoading = false;
                state.teamOverview = action.payload;
            })
            .addCase(getTeamOverview.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getEmployeeStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getEmployeeStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.employeeStats = action.payload;
            })
            .addCase(getEmployeeStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset } = analyticsSlice.actions;
export default analyticsSlice.reducer;
