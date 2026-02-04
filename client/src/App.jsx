import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';

import Overview from './pages/employee/Overview';
import MyWorkLogs from './pages/employee/MyWorkLogs';
import MyRequests from './pages/employee/MyRequests';
import AdminDashboard from './pages/AdminDashboard';
import Approvals from './pages/admin/Approvals';
import ManageEmployees from './pages/admin/ManageEmployees';
import WorkLogs from './pages/admin/WorkLogs';
import Attendance from './pages/admin/Attendance';
import AttendanceVerification from './pages/admin/AttendanceVerification';
import VisitRequests from './pages/admin/VisitRequests';
import PopupManagement from './pages/admin/PopupManagement';
import PerformanceAnalytics from './pages/admin/PerformanceAnalytics';
import Layout from './components/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import PWAFresher from './components/PWAFresher';

import { EmployeeGuard, RootRedirect } from './components/RoleGuards';

function App() {
  return (
    <>
      <PWAFresher />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="" element={<PrivateRoute />}>
            <Route element={<Layout />}>

              {/* Employee Routes - Protected from Admins */}
              <Route element={<EmployeeGuard />}>
                <Route path="/dashboard" element={<Overview />} />
                <Route path="/dashboard/worklogs" element={<MyWorkLogs />} />
                <Route path="/dashboard/requests" element={<MyRequests />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin/approvals" element={<Approvals />} />
              <Route path="/admin/visit-requests" element={<VisitRequests />} />
              <Route path="/admin/employees" element={<ManageEmployees />} />
              <Route path="/admin/worklogs" element={<WorkLogs />} />
              <Route path="/admin/attendance" element={<Attendance />} />
              <Route path="/admin/attendance-verification" element={<AttendanceVerification />} />
              <Route path="/admin/popup-management" element={<PopupManagement />} />
              <Route path="/admin/analytics" element={<PerformanceAnalytics />} />
            </Route>

            {/* Smart Root Redirect */}
            <Route path="/" element={<RootRedirect />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;