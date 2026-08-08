import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Armchair, CheckCircle2, User, RefreshCw, AlertCircle, Sparkles, Briefcase, UserCheck, LayoutGrid, Map } from 'lucide-react';
import { toast } from 'react-toastify';
import ArchitecturalFloorplan from './ArchitecturalFloorplan';

const SeatSelectionModal = ({ isOpen, onClose, onSeatConfirmed, currentSeatId = null, isCheckInMode = false }) => {
    const [selectedLevel, setSelectedLevel] = useState(1);
    const [seats, setSeats] = useState([]);
    const [selectedSeat, setSelectedSeat] = useState(currentSeatId);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [viewMode, setViewMode] = useState('blueprint'); // 'blueprint' or 'grid'
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 91, available: 0, occupied: 0 });
    const [showClientModal, setShowClientModal] = useState(false);
    const [clientNoteInput, setClientNoteInput] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchSeats();
            setSelectedSeat(currentSeatId);
            if (currentSeatId) setSelectedSeats([currentSeatId]);

            // Real-time 5-second polling interval for live update across all users
            const interval = setInterval(() => {
                fetchSeats(true);
            }, 5000);

            return () => clearInterval(interval);
        }
    }, [isOpen, currentSeatId]);

    const handleSeatClick = (seatId) => {
        setSelectedSeat(seatId);
        setSelectedSeats(prev => {
            if (prev.includes(seatId)) {
                return prev.filter(s => s !== seatId);
            } else {
                return [...prev, seatId];
            }
        });
    };

    const fetchSeats = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const response = await axios.get(`${baseUrl}/seating/layout`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSeats(response.data.seats);
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch seating layout', error);
            if (!silent) toast.error('Failed to load seating layout');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleConfirm = async () => {
        const targetSeat = selectedSeat || (selectedSeats.length > 0 ? selectedSeats[0] : null);
        if (!targetSeat) {
            toast.warning('Please select an available seat first');
            return;
        }

        try {
            setIsSubmitting(true);
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            await axios.post(`${baseUrl}/seating/assign`, { seatId: targetSeat }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Seat ${targetSeat} assigned successfully!`);
            if (onSeatConfirmed) {
                onSeatConfirmed(targetSeat);
            }
            onClose();
        } catch (error) {
            console.error('Seat assignment error', error);
            toast.error(error.response?.data?.message || 'Failed to assign seat');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReserveClientSeat = async () => {
        const targets = selectedSeats.length > 0 ? selectedSeats : (selectedSeat ? [selectedSeat] : []);
        if (targets.length === 0) {
            toast.warning('Please select at least one chair to reserve for client');
            return;
        }

        try {
            setIsSubmitting(true);
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            await axios.put(`${baseUrl}/seating/update-status`, {
                seatIds: targets,
                status: 'CLIENT_RESERVED',
                clientNote: clientNoteInput || 'Client Guest Team'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`${targets.length} chair(s) reserved for client! (${targets.join(', ')})`);
            setShowClientModal(false);
            setClientNoteInput('');
            setSelectedSeats([]);
            fetchSeats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reserve client seat');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUnreserveSeats = async () => {
        const targets = selectedSeats.length > 0 ? selectedSeats : (selectedSeat ? [selectedSeat] : []);
        if (targets.length === 0) return;

        try {
            setIsSubmitting(true);
            const userStr = localStorage.getItem('user');
            const token = userStr ? JSON.parse(userStr).token : '';
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            await axios.put(`${baseUrl}/seating/update-status`, {
                seatIds: targets,
                status: 'AVAILABLE'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`${targets.length} seat(s) unreserved / freed!`);
            setSelectedSeats([]);
            fetchSeats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to unreserve seats');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const levelSeats = seats.filter(s => s.level === selectedLevel);
    const filteredSeats = levelSeats.filter(s =>
        s.seatId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.user && s.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.clientNote && s.clientNote.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const levelMeta = {
        1: { title: 'Level 1', count: 16, desc: 'L1/1 – L1/16 • Round Tables & Lounge Area' },
        2: { title: 'Level 2', count: 13, desc: 'L2/1 – L2/13 • Rectangular Tables & Side Seating' },
        3: { title: 'Level 3', count: 16, desc: 'L3/1 – L3/16 • Circular Tables & Booth Seating' },
        4: { title: 'Level 4', count: 46, desc: 'L4/1 – L4/46 • Main Seating Hall' },
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
                >
                    {/* Modal Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="relative z-10 flex items-center gap-3">
                            <div className="p-3 bg-blue-600/30 border border-blue-400/30 rounded-2xl text-blue-400">
                                <Armchair size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    {isCheckInMode ? 'Select Seat for Check-in' : 'Change Your Active Seat'}
                                    <span className="flex items-center gap-1 text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Sync
                                    </span>
                                </h3>
                                <p className="text-slate-400 text-xs font-medium">Real-time updated seat status for all employees & clients.</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="relative z-10 p-2.5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Level Selector Tabs */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 overflow-x-auto">
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                            {[1, 2, 3, 4].map((lvl) => (
                                <button
                                    key={lvl}
                                    onClick={() => setSelectedLevel(lvl)}
                                    className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all duration-300 flex items-center gap-2 ${
                                        selectedLevel === lvl
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>Level {lvl}</span>
                                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                                        selectedLevel === lvl ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        {levelMeta[lvl].count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('blueprint')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                        viewMode === 'blueprint' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    <Map size={14} /> Blueprint
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                        viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500'
                                    }`}
                                >
                                    <LayoutGrid size={14} /> Grid
                                </button>
                            </div>

                            {/* Search Input */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-48">
                                <Search size={14} className="text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-white placeholder:text-slate-400 w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Level Description & Legend */}
                    <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
                        <span className="font-bold text-slate-500 dark:text-slate-400">
                            {levelMeta[selectedLevel].desc}
                        </span>

                        <div className="flex items-center gap-4 text-[10px] font-bold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600 dark:text-slate-400">Available</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <span className="text-slate-600 dark:text-slate-400">Selected</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                <span className="text-slate-600 dark:text-slate-400">Occupied</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                                <span className="text-slate-600 dark:text-slate-400">Client Reserved</span>
                            </div>
                        </div>
                    </div>

                    {/* Content View */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                                <RefreshCw className="animate-spin text-blue-600" size={32} />
                                <p className="font-bold text-xs">Loading seating floorplan...</p>
                            </div>
                        ) : viewMode === 'blueprint' ? (
                            <ArchitecturalFloorplan
                                level={selectedLevel}
                                seats={seats}
                                selectedSeat={selectedSeat}
                                selectedSeats={selectedSeats}
                                onSelectSeat={handleSeatClick}
                            />
                        ) : filteredSeats.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="font-bold text-sm">No seats found matching filter.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {filteredSeats.map((seat) => {
                                    const isSelected = selectedSeats.includes(seat.seatId) || selectedSeat === seat.seatId;
                                    const isOccupied = seat.status === 'OCCUPIED';
                                    const isReserved = seat.status === 'RESERVED';
                                    const isClientReserved = seat.status === 'CLIENT_RESERVED';
                                    const isBlocked = seat.status === 'BLOCKED';

                                    let cardBg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-blue-500 hover:shadow-lg';

                                    if (isSelected) {
                                        cardBg = 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20 ring-4 ring-blue-100 dark:ring-blue-900/40';
                                    } else if (isClientReserved) {
                                        cardBg = 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 shadow-sm';
                                    } else if (isOccupied) {
                                        cardBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-300 opacity-90 cursor-not-allowed';
                                    } else if (isReserved) {
                                        cardBg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 cursor-not-allowed';
                                    } else if (isBlocked) {
                                        cardBg = 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 cursor-not-allowed';
                                    }

                                    return (
                                        <button
                                            key={seat.seatId}
                                            disabled={(isOccupied || isClientReserved || isBlocked) && !isSelected}
                                            onClick={() => handleSeatClick(seat.seatId)}
                                            className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center relative group ${cardBg}`}
                                        >
                                            <div className="flex items-center gap-1 mb-1">
                                                <Armchair size={16} strokeWidth={2.5} />
                                                <span className="font-black text-sm tracking-tight">{seat.seatId}</span>
                                            </div>

                                            {isOccupied && seat.user ? (
                                                <div className="mt-1 w-full flex flex-col items-center">
                                                    <span className="text-[9px] font-black truncate max-w-full leading-tight">
                                                        {seat.user.name}
                                                    </span>
                                                    <span className="text-[8px] opacity-75 font-bold uppercase truncate max-w-full">
                                                        {seat.user.designation}
                                                    </span>
                                                </div>
                                            ) : isClientReserved ? (
                                                <div className="mt-1 w-full flex flex-col items-center">
                                                    <span className="text-[9px] font-black text-purple-700 dark:text-purple-300 truncate max-w-full leading-tight flex items-center gap-1">
                                                        <Briefcase size={10} /> Client
                                                    </span>
                                                    <span className="text-[8px] text-purple-600 dark:text-purple-400 font-bold truncate max-w-full">
                                                        {seat.clientNote || 'Reserved'}
                                                    </span>
                                                </div>
                                            ) : isReserved ? (
                                                <span className="text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400">Reserved</span>
                                            ) : isBlocked ? (
                                                <span className="text-[9px] font-bold uppercase text-slate-400">Blocked</span>
                                            ) : (
                                                <span className={`text-[9px] font-bold uppercase mt-1 ${isSelected ? 'text-blue-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {isSelected ? 'Selected' : 'Available'}
                                                </span>
                                            )}

                                            {isSelected && (
                                                <CheckCircle2 size={16} className="absolute top-2 right-2 text-white" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer / Confirmation Bar */}
                    <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
                                {selectedSeats.length > 0 ? selectedSeats.length : (selectedSeat || '?')}
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-800 dark:text-white">
                                    {selectedSeats.length > 0 
                                        ? `${selectedSeats.length} Chair(s) Selected (${selectedSeats.join(', ')})`
                                        : (selectedSeat ? `Selected Seat: ${selectedSeat}` : 'No seat selected')}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    {selectedSeats.length > 0 ? 'Click "Reserve for Client" to reserve all selected chairs for a team' : (selectedSeat ? `Level ${selectedLevel} • Ready to assign` : 'Click an available seat above')}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {(selectedSeats.length > 0 || selectedSeat) && (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleUnreserveSeats}
                                        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <X size={14} />
                                        <span>Unreserve / Free {selectedSeats.length > 1 ? `${selectedSeats.length} Chairs` : 'Seat'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowClientModal(true)}
                                        className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 transition-colors flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Briefcase size={14} />
                                        <span>Reserve {selectedSeats.length > 1 ? `${selectedSeats.length} Chairs` : 'Seat'} for Client</span>
                                    </button>
                                </>
                            )}
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={(!selectedSeat && selectedSeats.length === 0) || isSubmitting}
                                className="px-6 py-2.5 rounded-xl font-black text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        <span>Confirm My Seat</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Client Reservation Popup Modal */}
                {showClientModal && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-w-md w-full space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                                    <Briefcase className="text-purple-600" size={18} /> Reserve {selectedSeats.length || 1} Chair(s) for Client
                                </h4>
                                <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 font-medium">
                                Selected chairs: <span className="font-black text-purple-600">{selectedSeats.length > 0 ? selectedSeats.join(', ') : selectedSeat}</span>. Enter client/guest team details below.
                            </p>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Name / Meeting Note</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mr. Sharma (Acme Corp Team)"
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
                                    onClick={handleReserveClientSeat}
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 rounded-xl font-black text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/30"
                                >
                                    Save Client Reservation ({selectedSeats.length || 1} Chairs)
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </AnimatePresence>
    );
};

export default SeatSelectionModal;
