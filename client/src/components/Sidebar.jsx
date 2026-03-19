import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '../features/auth/authSlice';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    FileCheck,
    ClipboardList,
    CalendarClock,
    Camera,
    MapPin,
    BarChart3,
    Megaphone,
    LogOut,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    DollarSign,
    Receipt,
    Home,
    Phone,
    Sparkles,
    LifeBuoy,
    X,
    ChevronDown,
    Settings,
    ShieldCheck,
    Boxes
} from 'lucide-react';
import ThemeSelector from './common/ThemeSelector';

const Sidebar = ({ isMobileOpen, onMobileClose }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Collapsible sections state
    const [openGroups, setOpenGroups] = useState({
        admin: true,
        utilities: true,
        operations: true
    });

    const toggleGroup = (group) => {
        setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const onLogout = () => {
        dispatch(logout());
        dispatch(reset());
        navigate('/login');
    };

    const [globalSettings, setGlobalSettings] = useState({});

    useEffect(() => {
        const fetchGlobalSettings = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const response = await axios.get(`${baseUrl}/settings`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setGlobalSettings(response.data);
            } catch (err) {
                console.error("Failed to fetch global settings", err);
            }
        };
        if (user?.token) {
            fetchGlobalSettings();
        }
    }, [user?.token]);

    const isSalaryEnabled = globalSettings.isSalaryDashboardEnabled !== 'false';
    const handleRefresh = () => window.location.reload();

    // ─── Nav Item ────────────────────────────────────────────────────────────
    const NavItem = ({ to, icon: Icon, label, exact = false, indent = false }) => {
        const active = exact
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/');

        return (
            <Link
                to={to}
                onClick={onMobileClose}
                title={isCollapsed ? label : ''}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative mb-0.5
                    ${active ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    ${isCollapsed ? 'justify-center' : ''}
                    ${indent && !isCollapsed ? 'ml-4' : ''}
                `}
            >
                <Icon
                    size={isCollapsed ? 22 : 18}
                    className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}
                />

                {!isCollapsed && (
                    <span className="font-medium text-[13.5px] whitespace-nowrap overflow-hidden opacity-100 transition-all duration-300">
                        {label}
                    </span>
                )}

                {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    // ─── Nav Group ───────────────────────────────────────────────────────────
    const NavGroup = ({ id, label, icon: Icon, children }) => {
        const isOpen = openGroups[id];
        
        if (isCollapsed) return <div className="space-y-1 py-2 border-t border-slate-800/50">{children}</div>;

        return (
            <div className="mb-2">
                <button
                    onClick={() => toggleGroup(id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-slate-500 hover:text-slate-300 transition-colors uppercase text-[10px] font-bold tracking-widest group"
                >
                    <div className="flex items-center gap-2">
                        <Icon size={14} className="text-slate-600 group-hover:text-slate-400" />
                        <span>{label}</span>
                    </div>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="pt-1">{children}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    const isAdmin = ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ACCOUNTS_MANAGER', 'ANALYZER'].includes(user?.role);
    const isFullAdmin = user?.role === 'ADMIN';

    return (
        <aside
            className={`bg-slate-950 text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
                fixed md:relative z-[70] h-full border-r border-slate-900
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}
        >
            {/* Desktop collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3 top-10 bg-primary text-white p-1 rounded-full shadow-lg hover:opacity-90 transition-opacity z-30 border-2 border-slate-950"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Mobile close button */}
            <button
                onClick={onMobileClose}
                className="md:hidden absolute top-4 right-4 text-slate-400 hover:text-white"
            >
                <X size={24} />
            </button>

            {/* Logo */}
            <div className={`p-4 border-b border-slate-900 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'h-20' : 'h-24'} overflow-hidden`}>
                <img
                    src="/orbix-logo.png"
                    alt="PeopleDesk"
                    className={`object-contain transition-all duration-300 ${isCollapsed ? 'h-10 w-10' : 'h-auto w-3/4 max-h-16 filter brightness-110'}`}
                />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto scrollbar-hide">
                <div className="mb-4">
                    {!isCollapsed && <p className="px-3 py-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Core</p>}
                    <NavItem to={isAdmin ? "/admin-dashboard" : "/dashboard"} icon={LayoutDashboard} label="Dashboard" exact />
                    {isAdmin && ['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && (
                        <NavItem to="/admin/approvals" icon={FileCheck} label="Pending Approvals" />
                    )}
                </div>

                {isAdmin ? (
                    <>
                        <NavGroup id="operations" label="Operations" icon={Boxes}>
                            <NavItem to="/admin/worklogs" icon={ClipboardList} label="Work Reports" indent />
                            <NavItem to="/admin/attendance" icon={CalendarClock} label="Daily Attendance" indent />
                            <NavItem to="/admin/attendance-verification" icon={Camera} label="Photo Verification" indent />
                            {['ADMIN', 'HR', 'ACCOUNTS_MANAGER'].includes(user?.role) && (
                                <NavItem to="/admin/vouchers" icon={DollarSign} label="Expense Hub" indent />
                            )}
                            <NavItem to="/admin/visit-requests" icon={MapPin} label="Visit Requests" indent />
                            {['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(user?.role) && (
                                <NavItem to="/admin/wfh" icon={Home} label="WFH Approvals" indent />
                            )}
                            <NavItem to="/admin/analytics" icon={BarChart3} label="Performance Analytics" indent />
                            <NavItem to="/admin/call-reports" icon={Phone} label="Call Analytics" indent />
                        </NavGroup>

                        <NavGroup id="admin" label="Administration" icon={ShieldCheck}>
                            {['ADMIN', 'AE_MANAGER'].includes(user?.role) && (
                                <NavItem to="/admin/employees" icon={Users} label="Manage Employees" indent />
                            )}
                            {isFullAdmin && (
                                <NavItem to="/admin/salary-settings" icon={DollarSign} label="Salary Settings" indent />
                            )}
                            {isFullAdmin && (
                                <NavItem to="/admin/popup-management" icon={Camera} label="Popup Configuration" indent />
                            )}
                            {['ADMIN', 'HR'].includes(user?.role) && (
                                <NavItem to="/admin/announcements" icon={Megaphone} label="Announcements" indent />
                            )}
                        </NavGroup>

                        <NavGroup id="utilities" label="Utilities" icon={Settings}>
                            <NavItem to="/osc-directory" icon={LifeBuoy} label="OSC Directory" indent />
                            <NavItem to="/decora-ai" icon={Sparkles} label="Decora AI" indent />
                        </NavGroup>
                    </>
                ) : (
                    <>
                        <div className="mb-4">
                            {!isCollapsed && <p className="px-3 py-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">My Workspace</p>}
                            <NavItem to="/dashboard/worklogs" icon={ClipboardList} label="My Reports" />
                            <NavItem to="/dashboard/requests" icon={CalendarClock} label="My Requests" />
                            <NavItem to="/dashboard/attendance" icon={FileCheck} label="My Attendance" />
                            {isSalaryEnabled && (
                                <NavItem to="/dashboard/salary" icon={DollarSign} label="My Salary" />
                            )}
                            <NavItem to="/dashboard/expenses" icon={Receipt} label="Expense Hub" />
                            {user?.wfhViewEnabled && (
                                <NavItem to="/dashboard/wfh" icon={Home} label="Apply WFH" />
                            )}
                        </div>

                        <NavGroup id="utilities" label="Utilities" icon={Settings}>
                            <NavItem to="/osc-directory" icon={LifeBuoy} label="OSC Directory" indent />
                            <NavItem to="/decora-ai" icon={Sparkles} label="Decora AI" indent />
                        </NavGroup>
                    </>
                )}
            </nav>

            {/* Theme Selector Integration */}
            <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/50">
                <ThemeSelector isCollapsed={isCollapsed} />
            </div>

            {/* User Profile + Actions */}
            <div className={`p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-2`}>
                <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0 animate-pulse-slow">
                        {user?.name?.charAt(0) || '?'}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-[13px] font-semibold truncate text-white">{user?.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tight truncate">
                                {isAdmin
                                    ? (user?.role === 'BUSINESS_HEAD' ? user?.designation : user?.role.replace(/_/g, ' '))
                                    : user?.designation}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        title="Refresh App"
                        className={`flex-1 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white py-2 rounded-lg transition-all duration-200 group justify-center border border-slate-800/50`}
                    >
                        <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                    <button
                        onClick={onLogout}
                        title="Sign Out"
                        className={`flex-1 flex items-center gap-2 bg-slate-900 hover:bg-red-600/20 hover:text-red-500 text-slate-400 py-2 rounded-lg transition-all duration-200 group justify-center border border-slate-800/50`}
                    >
                        <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
