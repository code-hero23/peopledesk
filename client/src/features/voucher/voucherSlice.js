import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const INITIAL_API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
const API_URL = INITIAL_API_URL + '/vouchers';
const FINANCE_URL = INITIAL_API_URL + '/finance';

const initialState = {
    vouchers: [],
    manageableVouchers: [],
    financeSummary: null,
    spentHistory: [],
    depositHistory: [],
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Create new voucher
export const createVoucher = createAsyncThunk(
    'voucher/create',
    async (voucherData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post(API_URL, voucherData, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get my vouchers
export const getMyVouchers = createAsyncThunk(
    'voucher/getMy',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/me`, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get manageable vouchers
export const getManageableVouchers = createAsyncThunk(
    'voucher/getManageable',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/manage`, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Approve AM
export const approveVoucherAM = createAsyncThunk(
    'voucher/approveAM',
    async ({ id, status, remarks }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.put(`${API_URL}/${id}/approve-am`, { status, remarks }, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Approve COO
export const approveVoucherCOO = createAsyncThunk(
    'voucher/approveCOO',
    async ({ id, status, remarks }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.put(`${API_URL}/${id}/approve-coo`, { status, remarks }, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Upload Proof
export const uploadVoucherProof = createAsyncThunk(
    'voucher/uploadProof',
    async ({ id, formData }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.put(`${API_URL}/${id}/proof`, formData, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Finance Summary
export const getFinanceSummary = createAsyncThunk(
    'voucher/getFinanceSummary',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${FINANCE_URL}/summary`, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Spent History
export const getSpentHistory = createAsyncThunk(
    'voucher/getSpentHistory',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${FINANCE_URL}/history`, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Deposit History
export const getDepositHistory = createAsyncThunk('voucher/getDepositHistory', async (_, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const response = await axios.get(`${FINANCE_URL}/deposits`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

// Add Cash / Budget
export const addCash = createAsyncThunk('voucher/addCash', async (data, thunkAPI) => {
    try {
        const token = thunkAPI.getState().auth.user.token;
        const response = await axios.post(`${FINANCE_URL}/add-cash`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

// Add Admin Note
export const addAdminNote = createAsyncThunk(
    'voucher/addAdminNote',
    async ({ id, remarks }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.put(`${API_URL}/${id}/admin-note`, { remarks }, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const voucherSlice = createSlice({
    name: 'voucher',
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
            .addCase(createVoucher.pending, (state) => { state.isLoading = true; })
            .addCase(createVoucher.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.vouchers.unshift(action.payload);
            })
            .addCase(createVoucher.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getMyVouchers.pending, (state) => { state.isLoading = true; })
            .addCase(getMyVouchers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.vouchers = action.payload;
            })
            .addCase(getManageableVouchers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.manageableVouchers = action.payload;
            })
            .addCase(approveVoucherAM.fulfilled, (state, action) => {
                state.isLoading = false;
                state.manageableVouchers = state.manageableVouchers.filter(v => v.id !== action.payload.id);
            })
            .addCase(approveVoucherCOO.fulfilled, (state, action) => {
                state.isLoading = false;
                state.manageableVouchers = state.manageableVouchers.filter(v => v.id !== action.payload.id);
            })
            .addCase(getFinanceSummary.fulfilled, (state, action) => {
                state.financeSummary = action.payload;
            })
            .addCase(getSpentHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.spentHistory = action.payload;
            })
            .addCase(getDepositHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.depositHistory = action.payload;
            })
            .addCase(addCash.fulfilled, (state, action) => {
                state.financeSummary.currentCash = action.payload.currentCash;
            })
            .addCase(uploadVoucherProof.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.vouchers.findIndex(v => v.id === action.payload.id);
                if (index !== -1) {
                    state.vouchers[index] = action.payload;
                }
            })
            .addCase(addAdminNote.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.manageableVouchers.findIndex(v => v.id === action.payload.id);
                if (index !== -1) {
                    state.manageableVouchers[index] = { 
                        ...state.manageableVouchers[index], 
                        ...action.payload 
                    };
                }
            });
    },
});

export const { reset } = voucherSlice.actions;
export default voucherSlice.reducer;
