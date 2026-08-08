import { useState, useEffect } from 'react';
import axios from 'axios';
import { Armchair, Users, CheckCircle, ShieldAlert, Ban, Search, RefreshCw, Layers, User, Sparkles, Briefcase, X, Map, LayoutGrid } from 'lucide-react';
import { toast } from 'react-toastify';
import SeatSelectionModal from '../../components/seating/SeatSelectionModal';
import ArchitecturalFloorplan from '../../components/seating/ArchitecturalFloorplan';

const SeatingLayout = () => {
    const [seats, setSeats] = useState([]);
    const [stats, setStats] = useState({ total: 91, available: 0, occupied: 0, reserved: 0, clientReserved: 0, blocked: 0 });
    const [activeLevel, setActiveLevel] = useState('1'); // Default to Level 1 floorplan
    const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint' or 'grid'
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
    const [userSeat, setUserSeat] = useState(null);

    // Client modal state
    const [showClientModal, setShowClientModal] = useState(false);
    const [targetSeatForClient, setTargetSeatForClient] = useState(null);
    const [clientNoteInput, setClientNoteInput] = useState('');

    useEffect(() => {
        fetchSeatingData();

        // Live 5-second polling synchronization across all devices
        const interval = setInterval(() => {
            fetchSeatingData(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchSeatingData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const userId = userStr ? JSON.parse(userStr).id : null;
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const response = await axios.get(`${baseUrl}/seating/layout`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSeats(response.data.seats);
            setStats(response.data.stats);

            // Find current user seat if any
            const foundUserSeat = response.data.seats.find(s => s.userId === userId);
            if (foundUserSeat) {
                setUserSeat(foundUserSeat.seatId);
            }
        } catch (error) {
            console.error('Failed to fetch seating layout', error);
            if (!silent) toast.error('Failed to load seating layout');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleAdminStatusChange = async (seatId, newStatus, clientNote = null) => {
        try {
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            await axios.put(`${baseUrl}/seating/update-status`, { seatId, status: newStatus, clientNote }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Seat ${seatId} updated to ${newStatus}`);
            setShowClientModal(false);
            setClientNoteInput('');
            fetchSeatingData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update seat status');
        }
    };

    const filteredSeats = seats.filter(seat => {
        const matchesLevel = activeLevel === 'ALL' || seat.level === Number(activeLevel);
        const matchesSearch = seat.seatId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (seat.user && seat.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (seat.user && seat.user.designation.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (seat.clientNote && seat.clientNote.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesLevel && matchesSearch;
    });

    const levelCounts = {
        1: seats.filter(s => s.level === 1).length,
        2: seats.filter(s => s.level === 2).length,
        3: seats.filter(s => s.level === 3).length,
        4: seats.filter(s => s.level === 4).length,
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[28px] shadow-lg border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none">
                        <Armchair size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                            Interactive Seating Plan
                            <span className="text-blue-600 text-sm font-black bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-xl border border-blue-100 dark:border-blue-900">91 Total Seats</span>
                            <span className="flex items-center gap-1.5 text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Sync Active
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-0.5">
                            Real-time 4-level office floorplan & client seat reservation.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsChangeModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-600/30 transition-all"
                    >
                        <Sparkles size={16} />
                        <span>{userSeat ? `Your Seat: ${userSeat} (Change)` : 'Select / Change Seat'}</span>
                    </button>
                    <button
                        onClick={() => fetchSeatingData()}
                        className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-2xl transition-all"
                        title="Refresh Seating"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Capacity</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">91 <span className="text-xs text-slate-400 font-bold">Seats</span></h3>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                        <Layers size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Available Seats</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.available} <span className="text-xs text-emerald-500/70 font-bold">Free</span></h3>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <CheckCircle size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Occupied Seats</p>
                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.occupied} <span className="text-xs text-rose-500/70 font-bold">Seated</span></h3>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                        <Users size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Client Seats</p>
                        <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.clientReserved || 0} <span className="text-xs text-purple-500/70 font-bold">Guests</span></h3>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                        <Briefcase size={20} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Reserved / Blocked</p>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{(stats.reserved || 0) + (stats.blocked || 0)} <span className="text-xs text-amber-500/70 font-bold">Held</span></h3>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Ban size={20} />
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setActiveLevel('ALL')}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${
                            activeLevel === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        All Levels (91)
                    </button>
                    {[1, 2, 3, 4].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setActiveLevel(String(lvl))}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${
                                activeLevel === String(lvl)
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <span>Level {lvl}</span>
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md font-bold">
                                {levelCounts[lvl]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setViewMode('blueprint')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                viewMode === 'blueprint' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            <Map size={14} /> Blueprint Map
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                            }`}
                        >
                            <LayoutGrid size={14} /> Tile Grid
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-56">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search seat, user, client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-white placeholder:text-slate-400 w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Display Area */}
            {viewMode === 'blueprint' ? (
                <div className="space-y-6">
                    {activeLevel === 'ALL' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ArchitecturalFloorplan level={1} seats={seats} selectedSeat={userSeat} onSelectSeat={(s) => { setUserSeat(s); setIsChangeModalOpen(true); }} />
                            <ArchitecturalFloorplan level={3} seats={seats} selectedSeat={userSeat} onSelectSeat={(s) => { setUserSeat(s); setIsChangeModalOpen(true); }} />
                            <ArchitecturalFloorplan level={2} seats={seats} selectedSeat={userSeat} onSelectSeat={(s) => { setUserSeat(s); setIsChangeModalOpen(true); }} />
                            <ArchitecturalFloorplan level={4} seats={seats} selectedSeat={userSeat} onSelectSeat={(s) => { setUserSeat(s); setIsChangeModalOpen(true); }} />
                        </div>
                    ) : (
                        <ArchitecturalFloorplan
                            level={Number(activeLevel)}
                            seats={seats}
                            selectedSeat={userSeat}
                            onSelectSeat={(s) => { setUserSeat(s); setIsChangeModalOpen(true); }}
                        />
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {filteredSeats.map(seat => {
                        const isOccupied = seat.status === 'OCCUPIED';
                        const isClientReserved = seat.status === 'CLIENT_RESERVED';
                        const isReserved = seat.status === 'RESERVED';
                        const isBlocked = seat.status === 'BLOCKED';
                        const isMySeat = seat.seatId === userSeat;

                        let borderBg = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50';

                        if (isMySeat) {
                            borderBg = 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500';
                        } else if (isClientReserved) {
                            borderBg = 'border-purple-300 dark:border-purple-900 bg-purple-50/80 dark:bg-purple-950/40';
                        } else if (isOccupied) {
                            borderBg = 'border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30';
                        } else if (isReserved) {
                            borderBg = 'border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30';
                        } else if (isBlocked) {
                            borderBg = 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-60';
                        }

                        return (
                            <div
                                key={seat.seatId}
                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative group ${borderBg}`}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Armchair size={16} className={isMySeat ? 'text-blue-600' : isClientReserved ? 'text-purple-600' : isOccupied ? 'text-rose-600' : 'text-emerald-600'} />
                                        <span className="font-black text-sm text-slate-800 dark:text-white">{seat.seatId}</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                        L{seat.level}
                                    </span>
                                </div>

                                {isOccupied && seat.user ? (
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-slate-800 dark:text-white truncate">{seat.user.name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight truncate">{seat.user.designation}</p>
                                        {seat.checkInTime && (
                                            <p className="text-[8px] text-slate-400 font-medium">In: {new Date(seat.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        )}
                                    </div>
                                ) : isClientReserved ? (
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1 truncate">
                                            <Briefcase size={12} /> Client Seat
                                        </p>
                                        <p className="text-[9px] text-purple-600 dark:text-purple-400 font-bold truncate">
                                            {seat.clientNote || 'Client Guest'}
                                        </p>
                                    </div>
                                ) : isReserved ? (
                                    <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Reserved</p>
                                ) : isBlocked ? (
                                    <p className="text-[10px] font-bold uppercase text-slate-400">Maintenance</p>
                                ) : (
                                    <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Available</p>
                                )}

                                {/* Context Quick Actions */}
                                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[9px] font-bold gap-1">
                                    {isOccupied ? (
                                        <button
                                            onClick={() => handleAdminStatusChange(seat.seatId, 'AVAILABLE')}
                                            className="text-slate-400 hover:text-rose-600 transition-colors"
                                        >
                                            Release
                                        </button>
                                    ) : isClientReserved ? (
                                        <button
                                            onClick={() => handleAdminStatusChange(seat.seatId, 'AVAILABLE')}
                                            className="text-purple-600 dark:text-purple-400 hover:underline"
                                        >
                                            Free Client Seat
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setTargetSeatForClient(seat.seatId);
                                                    setShowClientModal(true);
                                                }}
                                                className="text-purple-600 dark:text-purple-400 hover:underline"
                                            >
                                                + Client
                                            </button>
                                            {isReserved ? (
                                                <button onClick={() => handleAdminStatusChange(seat.seatId, 'AVAILABLE')} className="text-emerald-600">Free</button>
                                            ) : (
                                                <button onClick={() => handleAdminStatusChange(seat.seatId, 'RESERVED')} className="text-amber-600">Reserve</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Seat Selection Modal */}
            <SeatSelectionModal
                isOpen={isChangeModalOpen}
                onClose={() => setIsChangeModalOpen(false)}
                currentSeatId={userSeat}
                onSeatConfirmed={(newSeat) => {
                    setUserSeat(newSeat);
                    fetchSeatingData();
                }}
            />

            {/* Client Reserve Modal */}
            {showClientModal && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                                <Briefcase className="text-purple-600" size={18} /> Reserve Seat {targetSeatForClient} for Client
                            </h4>
                            <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500">Enter client name or meeting notes for this reserved seat.</p>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Name / Meeting Note</label>
                            <input
                                type="text"
                                placeholder="e.g. Mr. Rajesh (Acme Corp)"
                                value={clientNoteInput}
                                onChange={(e) => setClientNoteInput(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowClientModal(false)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAdminStatusChange(targetSeatForClient, 'CLIENT_RESERVED', clientNoteInput || 'Client Guest Seat')}
                                className="flex-1 py-2.5 rounded-xl font-black text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30"
                            >
                                Reserve Client Seat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeatingLayout;
