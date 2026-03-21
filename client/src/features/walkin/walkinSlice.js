import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/walkin';

export const fetchWalkins = createAsyncThunk('walkin/fetchAll', async (_, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(API_URL, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

export const fetchBHs = createAsyncThunk('walkin/fetchBHs', async (_, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get(`${API_URL}/bhs`, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

export const createWalkin = createAsyncThunk('walkin/create', async (walkinData, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.post(API_URL, walkinData, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

export const updateWalkin = createAsyncThunk('walkin/update', async ({ id, data }, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.put(`${API_URL}/${id}`, data, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

export const deleteWalkin = createAsyncThunk('walkin/delete', async (id, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.delete(`${API_URL}/${id}`, config);
        return id;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

const initialState = {
    entries: [],
    bhs: [],
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
};

const walkinSlice = createSlice({
    name: 'walkin',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWalkins.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchWalkins.fulfilled, (state, action) => {
                state.isLoading = false;
                state.entries = action.payload;
            })
            .addCase(fetchWalkins.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(fetchBHs.fulfilled, (state, action) => {
                state.bhs = action.payload;
            })
            .addCase(createWalkin.fulfilled, (state, action) => {
                state.isSuccess = true;
                state.entries.unshift(action.payload);
            })
            .addCase(updateWalkin.fulfilled, (state, action) => {
                state.isSuccess = true;
                const index = state.entries.findIndex((e) => e.id === action.payload.id);
                if (index !== -1) state.entries[index] = action.payload;
            })
            .addCase(deleteWalkin.fulfilled, (state, action) => {
                state.entries = state.entries.filter((e) => e.id !== action.payload);
            });
    },
});

export const { reset } = walkinSlice.actions;
export default walkinSlice.reducer;
