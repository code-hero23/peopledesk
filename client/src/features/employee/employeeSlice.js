import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/';

const initialState = {
    attendance: null,
    workLogs: [],
    requests: { leaves: [], permissions: [] },
    businessHeads: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
};

// Check attendance status for today
export const getAttendanceStatus = createAsyncThunk(
    'employee/getAttendanceStatus',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'attendance/today', config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Mark Attendance
export const markAttendance = createAsyncThunk(
    'employee/markAttendance',
    async (attendanceData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Axios automatically sets Content-Type to multipart/form-data when data is FormData
                },
            };
            // attendanceData can be empty object or FormData
            const response = await axios.post(API_URL + 'attendance', attendanceData || {}, config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Checkout Attendance
export const checkoutAttendance = createAsyncThunk(
    'employee/checkoutAttendance',
    async (attendanceData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.put(API_URL + 'attendance/checkout', attendanceData || {}, config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get my work logs
export const getMyWorkLogs = createAsyncThunk(
    'employee/getMyWorkLogs',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'worklogs', config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create work log
export const createWorkLog = createAsyncThunk(
    'employee/createWorkLog',
    async (logData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.post(API_URL + 'worklogs', logData, config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create Leave Request
export const createLeaveRequest = createAsyncThunk(
    'employee/createLeaveRequest',
    async (requestData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.post(API_URL + 'requests/leave', requestData, config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create Permission Request
export const createPermissionRequest = createAsyncThunk(
    'employee/createPermissionRequest',
    async (requestData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.post(API_URL + 'requests/permission', requestData, config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get My Requests
export const getMyRequests = createAsyncThunk(
    'employee/getMyRequests',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'requests', config);
            return response.data;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Business Heads
export const getBusinessHeads = createAsyncThunk(
    'employee/getBusinessHeads',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'requests/business-heads', config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const employeeSlice = createSlice({
    name: 'employee',
    initialState,
    reducers: {
        reset: (state) => {
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = false;
            state.message = '';
        },
    },
    extraReducers: (builder) => {
        builder
            // Get Attendance Status
            .addCase(getAttendanceStatus.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAttendanceStatus.fulfilled, (state, action) => {
                state.isLoading = false;
                state.attendance = action.payload.data;
            })
            .addCase(getAttendanceStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Mark Attendance
            .addCase(markAttendance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(markAttendance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.attendance = action.payload;
            })
            .addCase(markAttendance.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Checkout Attendance
            .addCase(checkoutAttendance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(checkoutAttendance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.attendance = action.payload;
            })
            .addCase(checkoutAttendance.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Get Logs
            .addCase(getMyWorkLogs.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMyWorkLogs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.workLogs = action.payload;
            })
            .addCase(getMyWorkLogs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Log
            .addCase(createWorkLog.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createWorkLog.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.workLogs.unshift(action.payload); // Add new log to top
            })
            .addCase(createWorkLog.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Leave
            .addCase(createLeaveRequest.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createLeaveRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.requests.leaves.unshift(action.payload);
            })
            .addCase(createLeaveRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Permission
            .addCase(createPermissionRequest.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createPermissionRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.requests.permissions.unshift(action.payload);
            })
            .addCase(createPermissionRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Requests
            .addCase(getMyRequests.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMyRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.requests = action.payload;
            })
            .addCase(getMyRequests.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Business Heads
            .addCase(getBusinessHeads.fulfilled, (state, action) => {
                state.businessHeads = action.payload;
            });
    },
});

export const { reset } = employeeSlice.actions;
export default employeeSlice.reducer;
