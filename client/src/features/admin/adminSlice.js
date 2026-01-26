import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/admin/';

const initialState = {
    employees: [],
    workLogs: [],
    dailyWorkLogs: [],
    dailyAttendance: [],
    pendingRequests: { leaves: [], permissions: [] },
    requestHistory: { leaves: [], permissions: [] },
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
};

// Create Employee
export const createEmployee = createAsyncThunk(
    'admin/createEmployee',
    async (userData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.post(API_URL + 'employees', userData, config);
            return response.data;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get All Work Logs
export const getAllWorkLogs = createAsyncThunk(
    'admin/getAllWorkLogs',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.get(API_URL + 'worklogs', config);
            return response.data;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get all employees
export const getAllEmployees = createAsyncThunk(
    'admin/getAllEmployees',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'employees', config);
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

// Get Daily Attendance
export const getDailyAttendance = createAsyncThunk(
    'admin/getDailyAttendance',
    async (date, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            // Pass date as query param if it exists
            const query = date ? `?date=${date}` : '';
            const response = await axios.get(API_URL + `attendance/daily${query}`, config);
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

// Get Daily Work Logs
export const getDailyWorkLogs = createAsyncThunk(
    'admin/getDailyWorkLogs',
    async (date, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            // Pass date as query param if it exists
            const query = date ? `?date=${date}` : '';
            const response = await axios.get(API_URL + `worklogs/daily${query}`, config);
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

// Get Pending Requests
export const getPendingRequests = createAsyncThunk(
    'admin/getPendingRequests',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'requests/pending', config);
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

// Get Request History
export const getRequestHistory = createAsyncThunk(
    'admin/getRequestHistory',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.get(API_URL + 'requests/history', config);
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



// Update request status
export const updateRequestStatus = createAsyncThunk(
    'admin/updateRequestStatus',
    async ({ type, id, status }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.put(
                API_URL + `requests/${type}/${id}`,
                { status },
                config
            );
            return { type, id, status }; // Return specific data to update local state efficiently
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Update user status
export const updateUserStatus = createAsyncThunk(
    'admin/updateUserStatus',
    async ({ id, status }, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.put(
                API_URL + `users/${id}/status`,
                { status },
                config
            );
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

// Update user details
export const updateEmployee = createAsyncThunk(
    'admin/updateEmployee',
    async (userData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.put(
                API_URL + `users/${userData.id}`,
                userData,
                config
            );
            return response.data;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Delete Employee
export const deleteEmployee = createAsyncThunk(
    'admin/deleteEmployee',
    async (id, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            await axios.delete(API_URL + `users/${id}`, config);
            return id;
        } catch (error) {
            const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

export const adminSlice = createSlice({
    name: 'admin',
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
            // Get Employees
            .addCase(getAllEmployees.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAllEmployees.fulfilled, (state, action) => {
                state.isLoading = false;
                state.employees = action.payload;
            })
            .addCase(getAllEmployees.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Employee
            .addCase(createEmployee.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createEmployee.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.employees.push(action.payload);
            })
            .addCase(createEmployee.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get All Work Logs
            .addCase(getAllWorkLogs.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAllWorkLogs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.workLogs = action.payload;
            })
            .addCase(getAllWorkLogs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Pending Requests
            .addCase(getPendingRequests.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getPendingRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingRequests = action.payload;
            })
            .addCase(getPendingRequests.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Request History
            .addCase(getRequestHistory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getRequestHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.requestHistory = action.payload;
            })
            .addCase(getRequestHistory.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Daily Attendance
            .addCase(getDailyAttendance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDailyAttendance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.dailyAttendance = action.payload;
            })
            .addCase(getDailyAttendance.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Daily Work Logs
            .addCase(getDailyWorkLogs.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDailyWorkLogs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.dailyWorkLogs = action.payload;
            })
            .addCase(getDailyWorkLogs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Update Status
            .addCase(updateRequestStatus.fulfilled, (state, action) => {
                const { type, id } = action.payload;
                if (type === 'leave') {
                    state.pendingRequests.leaves = state.pendingRequests.leaves.filter(
                        (req) => req.id !== id
                    );
                } else {
                    state.pendingRequests.permissions = state.pendingRequests.permissions.filter(
                        (req) => req.id !== id
                    );
                }
            })
            // Update User Status
            .addCase(updateUserStatus.fulfilled, (state, action) => {
                state.employees = state.employees.map((emp) =>
                    emp.id === action.payload.id ? action.payload : emp
                );
            })
            // Update User Details
            .addCase(updateEmployee.fulfilled, (state, action) => {
                state.employees = state.employees.map((emp) =>
                    emp.id === action.payload.id ? action.payload : emp
                );
                state.isSuccess = true;
            })
            // Delete Employee
            .addCase(deleteEmployee.fulfilled, (state, action) => {
                state.employees = state.employees.filter((emp) => emp.id !== action.payload);
                state.isSuccess = true;
                state.message = 'Employee removed successfully';
            });
    },
});

export const { reset } = adminSlice.actions;
export default adminSlice.reducer;
