import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/';

const initialState = {
    attendance: null,
    attendanceHistory: [],
    workLogs: [],
    requests: { leaves: [], permissions: [], siteVisits: [], showroomVisits: [], wfh: [] },
    businessHeads: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
    todayLog: null, // Track today's log status
    isPaused: false,
    activeBreak: null,
    isRequestsFetched: false,
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

// Get attendance history
export const getAttendanceHistory = createAsyncThunk(
    'employee/getAttendanceHistory',
    async (params, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            let query = '';
            if (params) {
                const { startDate, endDate } = params;
                if (startDate && endDate) {
                    query = `?startDate=${startDate}&endDate=${endDate}`;
                }
            }
            const response = await axios.get(API_URL + `attendance/history${query}`, config);
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

// Pause Attendance
export const pauseAttendance = createAsyncThunk(
    'employee/pauseAttendance',
    async (breakData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.post(API_URL + 'attendance/pause', breakData, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Resume Attendance
export const resumeAttendance = createAsyncThunk(
    'employee/resumeAttendance',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.post(API_URL + 'attendance/resume', {}, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get Today's Work Log Status
export const getTodayLogStatus = createAsyncThunk(
    'employee/getTodayLogStatus',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            // Re-using getMyWorkLogs but checking specifically for today, or new endpoint?
            // Actually, getMyWorkLogs returns a list. We can process it or fetch just today's.
            // Let's rely on getMyWorkLogs to fetch latest, but a specific endpoint is cleaner.
            // However, to keep it simple, we can filter `workLogs` locally or fetch.
            // But wait, the controller logic we added 'closeWorkLog' finds today's log.
            // Let's just fetch recent logs and filter for today in the component or Slice.
            // BETTER: Add a specific check so we know if it's OPEN or CLOSED.
            const response = await axios.get(API_URL + 'worklogs', config);
            const logs = response.data;
            const today = new Date().toISOString().split('T')[0];
            const todaysLog = logs.find(log => log.date.startsWith(today));
            return todaysLog || null;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get my work logs
export const getMyWorkLogs = createAsyncThunk(
    'employee/getMyWorkLogs',
    async (params, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params || {}
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

// Close work log
export const closeWorkLog = createAsyncThunk(
    'employee/closeWorkLog',
    async (logData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.put(API_URL + 'worklogs/close', logData, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Add Project Report (LA)
export const addProjectReport = createAsyncThunk(
    'employee/addProjectReport',
    async (reportData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.put(API_URL + 'worklogs/project-report', reportData, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
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

// Create Site Visit Request
export const createSiteVisitRequest = createAsyncThunk(
    'employee/createSiteVisitRequest',
    async (requestData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.post(API_URL + 'requests/site-visit', requestData, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create WFH Request
export const createWfhRequest = createAsyncThunk(
    'employee/createWfhRequest',
    async (requestData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.post(API_URL + 'wfh', requestData, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get My WFH Requests
export const getMyWfhRequests = createAsyncThunk(
    'employee/getMyWfhRequests',
    async (_, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.get(API_URL + 'wfh/me', config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Create Showroom Visit Request
export const createShowroomVisitRequest = createAsyncThunk(
    'employee/createShowroomVisitRequest',
    async (requestData, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            };
            const response = await axios.post(API_URL + 'requests/showroom-visit', requestData, config);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Get My Requests
export const getMyRequests = createAsyncThunk(
    'employee/getMyRequests',
    async (params, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                params: params || {}
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
                state.isPaused = action.payload.isPaused;
                state.activeBreak = action.payload.activeBreak;
            })
            .addCase(getAttendanceStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Attendance History
            .addCase(getAttendanceHistory.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAttendanceHistory.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.attendanceHistory = action.payload;
            })
            .addCase(getAttendanceHistory.rejected, (state, action) => {
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
            // Pause Attendance
            .addCase(pauseAttendance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(pauseAttendance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isPaused = true;
                state.activeBreak = action.payload.break;
                // Update specific break in attendance if needed (optional since we might refetch)
            })
            .addCase(pauseAttendance.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Resume Attendance
            .addCase(resumeAttendance.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(resumeAttendance.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isPaused = false;
                state.activeBreak = null;
            })
            .addCase(resumeAttendance.rejected, (state, action) => {
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
            // Close Log
            .addCase(closeWorkLog.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(closeWorkLog.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update specific log in list or refresh
                const index = state.workLogs.findIndex(log => log.id === action.payload.id);
                if (index !== -1) {
                    state.workLogs[index] = action.payload;
                }
                state.todayLog = action.payload;
            })
            .addCase(closeWorkLog.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Add Project Report
            .addCase(addProjectReport.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(addProjectReport.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update specific log in list or refresh
                const index = state.workLogs.findIndex(log => log.id === action.payload.id);
                if (index !== -1) {
                    state.workLogs[index] = action.payload;
                }
                state.todayLog = action.payload;
            })
            .addCase(addProjectReport.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Today Status
            // Get Today Status
            .addCase(getTodayLogStatus.fulfilled, (state, action) => {
                state.todayLog = action.payload;
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
                state.isRequestsFetched = false;
            })
            .addCase(getMyRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.requests = action.payload;
                state.isRequestsFetched = true;
            })
            .addCase(getMyRequests.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.isRequestsFetched = true;
            })

            // Create Site Visit
            .addCase(createSiteVisitRequest.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createSiteVisitRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.requests.siteVisits.unshift(action.payload);
            })
            .addCase(createSiteVisitRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create Showroom Visit
            .addCase(createShowroomVisitRequest.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createShowroomVisitRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.requests.showroomVisits.unshift(action.payload);
            })
            .addCase(createShowroomVisitRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Create WFH
            .addCase(createWfhRequest.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createWfhRequest.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                if (!state.requests.wfh) {
                    state.requests.wfh = [];
                }
                state.requests.wfh.unshift(action.payload);
            })
            .addCase(createWfhRequest.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get WFH
            .addCase(getMyWfhRequests.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMyWfhRequests.fulfilled, (state, action) => {
                state.isLoading = false;
                state.requests.wfh = action.payload;
            })
            .addCase(getMyWfhRequests.rejected, (state, action) => {
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
