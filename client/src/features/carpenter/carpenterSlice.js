import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const initialState = {
    records: [],
    loading: false,
    error: null,
};

const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/carpenter`;

// Get all records
export const getCarpenterRecords = createAsyncThunk('carpenter/getAll', async (_, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(API_URL, config);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Create record
export const createCarpenterRecord = createAsyncThunk('carpenter/create', async (recordData, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.post(API_URL, recordData, config);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Update record
export const updateCarpenterRecord = createAsyncThunk('carpenter/update', async ({ id, data }, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.put(`${API_URL}/${id}`, data, config);
        return response.data;
    } catch (error) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Delete record
export const deleteCarpenterRecord = createAsyncThunk('carpenter/delete', async (id, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`${API_URL}/${id}`, config);
        return id;
    } catch (error) {
        const message = error.response?.data?.message || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

const carpenterSlice = createSlice({
    name: 'carpenter',
    initialState,
    reducers: {
        reset: (state) => {
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(getCarpenterRecords.pending, (state) => { state.loading = true; })
            .addCase(getCarpenterRecords.fulfilled, (state, action) => {
                state.loading = false;
                state.records = action.payload;
            })
            .addCase(getCarpenterRecords.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createCarpenterRecord.fulfilled, (state, action) => {
                state.records.unshift(action.payload);
            })
            .addCase(updateCarpenterRecord.fulfilled, (state, action) => {
                const index = state.records.findIndex(r => r.id === action.payload.id);
                if (index !== -1) state.records[index] = action.payload;
            })
            .addCase(deleteCarpenterRecord.fulfilled, (state, action) => {
                state.records = state.records.filter(r => r.id !== action.payload);
            });
    }
});

export const { reset } = carpenterSlice.actions;
export default carpenterSlice.reducer;
