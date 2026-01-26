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
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="" element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/worklogs" element={<MyWorkLogs />} />
            <Route path="/dashboard/requests" element={<MyRequests />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/admin/employees" element={<ManageEmployees />} />
            <Route path="/admin/worklogs" element={<WorkLogs />} />
            <Route path="/admin/attendance" element={<Attendance />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
