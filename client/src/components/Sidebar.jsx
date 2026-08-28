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
    BookOpen,
    LifeBuoy,
    X,
    ChevronDown,
    Settings,
    ShieldCheck,
    Armchair,
    Boxes,
    Award,
    Sparkle,
    Activity
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
    const NavItem = ({ to, icon: Icon, label, exact = false, indent = false, badge = null }) => {
        const active = exact
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/');

        return (
            <Link
                to={to}
                onClick={onMobileClose}
                title={isCollapsed ? label : ''}
                className={`group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-xs tracking-wide transition-all duration-300 mb-1 select-none ${
                    active
                        ? 'bg-primary text-white font-bold shadow-lg border border-white/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                } ${isCollapsed ? 'justify-center px-2' : ''} ${indent && !isCollapsed ? 'ml-3' : ''}`}
            >
                {/* Glow bar indicator for active state */}
                {active && (
                    <motion.div
                        layoutId="activeGlowBar"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                )}

                <Icon
                    size={isCollapsed ? 20 : 17}
                    className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                        active ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'text-slate-400 group-hover:text-primary'
                    }`}
                />

                {!isCollapsed && (
                    <span className="truncate flex-1">
                        {label}
                    </span>
                )}

                {!isCollapsed && badge && (
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md bg-primary/20 text-primary border border-primary/30">
                        {badge}
                    </span>
                )}

                {/* Tooltip for collapsed view */}
                {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-xl text-white text-xs font-semibold rounded-lg shadow-2xl border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </Link>
        );
    };

    // ─── Nav Group ───────────────────────────────────────────────────────────
    const NavGroup = ({ id, label, icon: Icon, children }) => {
        const isOpen = openGroups[id];
        
        if (isCollapsed) return <div className="space-y-1 py-2 border-t border-white/5">{children}</div>;

        return (
            <div className="mb-3">
                <button
                    onClick={() => toggleGroup(id)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-slate-400 hover:text-slate-200 transition-colors uppercase text-[10px] font-black tracking-[0.18em] group rounded-lg hover:bg-white/[0.03]"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="p-1 rounded-md bg-white/5 group-hover:bg-primary/10 transition-colors">
                            <Icon size={13} className="text-slate-400 group-hover:text-primary" />
                        </div>
                        <span>{label}</span>
                    </div>
                    <ChevronDown size={13} className={`text-slate-400 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="pt-1.5 pl-1.5 border-l border-white/5 ml-4 space-y-0.5">{children}</div>
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
            className={`bg-[#0a0a0c] text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
                fixed md:relative z-[70] h-full border-r border-white/5 backdrop-blur-3xl font-sans
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'w-20' : 'w-64'}
            `}
        >
            {/* Desktop collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden md:flex absolute -right-3.5 top-8 bg-slate-900 border border-white/20 text-slate-300 hover:text-white hover:bg-primary p-1.5 rounded-full shadow-2xl transition-all duration-300 z-30 group"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />}
            </button>

            {/* Mobile close button */}
            <button
                onClick={onMobileClose}
                className="md:hidden absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
            >
                <X size={20} />
            </button>

            {/* Header Logo */}
            <div className={`p-4 border-b border-white/5 flex items-center justify-center transition-all duration-300 relative ${isCollapsed ? 'h-20' : 'h-24'} overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <img
                    src="/orbix-logo.png"
                    alt="PeopleDesk"
                    className={`object-contain transition-all duration-300 filter brightness-110 drop-shadow-[0_0_12px_rgba(239,68,68,0.15)] ${isCollapsed ? 'h-10 w-10' : 'h-auto w-4/5 max-h-14'}`}
                />
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                {user?.role !== 'FRONT_DESK_MANAGER' && (
                    <div className="mb-4">
                        {!isCollapsed && <p className="px-3 py-2 text-[9px] text-slate-400 font-black uppercase tracking-[0.22em]">Main Workspace</p>}
                        <NavItem to={isAdmin ? "/admin-dashboard" : "/dashboard"} icon={LayoutDashboard} label="Dashboard" exact />
                        {isAdmin && (
                            <NavItem to="/admin/overview" icon={Activity} label="Real-time Overview" badge="New" />
                        )}
                        {isAdmin && ['ADMIN', 'HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && (
                            <NavItem to="/admin/approvals" icon={FileCheck} label="Pending Approvals" badge="Live" />
                        )}
                    </div>
                )}

                {isAdmin ? (
                    <>
                        <NavGroup id="operations" label="Operations" icon={Boxes}>
                            <NavItem to="/admin/worklogs" icon={ClipboardList} label="Work Reports" indent />
                            <NavItem to="/admin/attendance" icon={CalendarClock} label="Daily Attendance" indent />
                            <NavItem to="/admin/attendance-verification" icon={Camera} label="Photo Verification" indent />
                            {(['ADMIN', 'HR', 'ACCOUNTS_MANAGER'].includes(user?.role) || (user?.role === 'BUSINESS_HEAD' && ['COO', 'Chief Operational Officer'].includes(user?.designation))) && (
                                <NavItem to="/admin/vouchers" icon={DollarSign} label="Expense Hub" indent />
                            )}
                            <NavItem to="/admin/visit-requests" icon={MapPin} label="Visit Requests" indent />
                            <NavItem to="/admin/visitors-record" icon={BookOpen} label="Visitors Book" indent />
                            {/* {['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(user?.role) && (
                                <NavItem to="/admin/wfh" icon={Home} label="WFH Approvals" indent />
                            )} */}
                            <NavItem to="/admin/analytics" icon={BarChart3} label="Performance Analytics" indent />
                            {(['ADMIN', 'BUSINESS_HEAD', 'HR', 'ANALYZER'].includes(user?.role) || user?.callAnalyticsViewEnabled) && (
                                <NavItem to="/admin/call-reports" icon={Phone} label="Call Analytics" indent />
                            )}
                            {['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(user?.role) && (
                                <NavItem to="/admin/helpdesk" icon={LifeBuoy} label="Support Hub" indent />
                            )}
                            <NavItem to="/admin/seating" icon={Armchair} label="Seating Plan" indent />
                        </NavGroup>

                        <NavGroup id="admin" label="Administration" icon={ShieldCheck}>
                            {['ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role) && (
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
                            {['ADMIN', 'HR'].includes(user?.role) && (
                                <NavItem to="/admin/performance" icon={Award} label="Performance Scoring" indent />
                            )}
                        </NavGroup>

                        <NavGroup id="utilities" label="Utilities" icon={Settings}>
                            <NavItem to="/osc-directory" icon={LifeBuoy} label="OSC Directory" indent />
                            <NavItem to="/decora-ai" icon={Sparkles} label="Decora AI" indent />
                        </NavGroup>
                    </>
                ) : user?.role === 'FRONT_DESK_MANAGER' ? (
                    <>
                        <div className="mb-4">
                            {!isCollapsed && <p className="px-3 py-2 text-[9px] text-slate-400 font-black uppercase tracking-[0.22em]">Front Desk</p>}
                            <NavItem to="/dashboard/visitors-record" icon={BookOpen} label="Visitors Book" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4">
                            {!isCollapsed && <p className="px-3 py-2 text-[9px] text-slate-400 font-black uppercase tracking-[0.22em]">My Workspace</p>}
                            <NavItem to="/dashboard/worklogs" icon={ClipboardList} label="My Reports" />
                            <NavItem to="/dashboard/requests" icon={CalendarClock} label="My Requests" />
                            <NavItem to="/dashboard/attendance" icon={FileCheck} label="My Attendance" />
                            <NavItem to="/seating" icon={Armchair} label="Seating Layout" />
                            {isSalaryEnabled && (
                                <NavItem to="/dashboard/salary" icon={DollarSign} label="My Salary" />
                            )}
                            <NavItem to="/dashboard/expenses" icon={Receipt} label="Expense Hub" />
                            {user?.wfhViewEnabled && (
                                <NavItem to="/dashboard/wfh" icon={Home} label="Apply WFH" />
                            )}
                            {user?.callAnalyticsViewEnabled && (
                                <NavItem to="/dashboard/call-reports" icon={Phone} label="Call Analytics" />
                            )}
                            <NavItem to="/dashboard/visitors-record" icon={BookOpen} label="Visitors Book" />
                            <NavItem to="/dashboard/kpi-scoreboard" icon={BarChart3} label="My KPI Scoreboard" />
                            <NavItem to="/dashboard/helpdesk" icon={LifeBuoy} label="Helpdesk" />
                            {user?.designation === 'ACCOUNT' && (
                                <NavItem to="/admin/attendance" icon={CalendarClock} label="Company Attendance" />
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
            <div className="px-3 py-2 border-t border-white/5 bg-black/40">
                <ThemeSelector isCollapsed={isCollapsed} />
            </div>

            {/* User Profile Footer Card */}
            <div className="p-3 border-t border-white/5 bg-[#0e0e12] flex flex-col gap-2.5">
                <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-1.5 py-1'}`}>
                    <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black text-white text-sm shadow-md ring-2 ring-white/10">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0a0a0c]" />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden flex-1">
                            <p className="text-[12.5px] font-extrabold truncate text-white tracking-tight">{user?.name}</p>
                            <p className="text-[9.5px] font-bold text-primary uppercase tracking-widest truncate">
                                {isAdmin
                                    ? (user?.role === 'BUSINESS_HEAD' ? user?.designation : user?.role?.replace(/_/g, ' '))
                                    : user?.designation}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 pt-1 border-t border-white/5">
                    <button
                        onClick={handleRefresh}
                        title="Refresh Application"
                        className="flex-1 flex items-center gap-2 bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white py-2 rounded-xl transition-all duration-200 group justify-center border border-white/5"
                    >
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700 text-slate-400 group-hover:text-primary" />
                    </button>
                    <button
                        onClick={onLogout}
                        title="Sign Out"
                        className="flex-1 flex items-center gap-2 bg-white/[0.04] hover:bg-red-600/20 hover:border-red-500/30 text-slate-400 hover:text-red-400 py-2 rounded-xl transition-all duration-200 group justify-center border border-white/5"
                    >
                        <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform text-slate-400 group-hover:text-red-400" />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
