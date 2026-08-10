import React from 'react';
import { Armchair, CheckCircle2, User, Briefcase, DoorOpen, LogIn } from 'lucide-react';

const SeatNode = ({ seatId, status, user, clientNote, selectedSeat, selectedSeats, highlightSearch, onSelect }) => {
    const isSelected = Array.isArray(selectedSeats) 
        ? selectedSeats.includes(seatId) 
        : (selectedSeat === seatId || (Array.isArray(selectedSeat) && selectedSeat.includes(seatId)));
    const isOccupied = status === 'OCCUPIED';
    const isClientReserved = status === 'CLIENT_RESERVED';
    const isReserved = status === 'RESERVED';
    const isBlocked = status === 'BLOCKED';

    const isSearchMatch = highlightSearch && highlightSearch.trim() !== '' && (
        seatId.toLowerCase().includes(highlightSearch.toLowerCase()) ||
        (user && user.name && user.name.toLowerCase().includes(highlightSearch.toLowerCase())) ||
        (user && user.designation && user.designation.toLowerCase().includes(highlightSearch.toLowerCase())) ||
        (clientNote && clientNote.toLowerCase().includes(highlightSearch.toLowerCase()))
    );

    let bgClass = 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:scale-110';

    if (isSelected) {
        bgClass = 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/40 ring-4 ring-blue-300 dark:ring-blue-900 scale-110 z-20';
    } else if (isClientReserved) {
        bgClass = 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20';
    } else if (isOccupied) {
        bgClass = 'bg-rose-500 border-rose-500 text-white shadow-sm';
    } else if (isReserved) {
        bgClass = 'bg-amber-500 border-amber-500 text-white';
    } else if (isBlocked) {
        bgClass = 'bg-slate-400 border-slate-400 text-slate-200 cursor-not-allowed opacity-50';
    } else {
        bgClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white';
    }

    if (isSearchMatch) {
        bgClass += ' ring-4 ring-amber-400 dark:ring-amber-300 scale-125 z-40 font-black shadow-2xl animate-bounce';
    }

    return (
        <button
            type="button"
            disabled={isBlocked || (isOccupied && !isSelected)}
            onClick={() => onSelect(seatId)}
            className={`group relative flex flex-col items-center justify-center p-1.5 rounded-xl border-2 transition-all duration-300 shadow-sm touch-manipulation min-w-[38px] active:scale-95 ${bgClass}`}
            title={
                isOccupied && user ? `Seat ${seatId} - ${user.name} (${user.designation})` :
                isClientReserved ? `Seat ${seatId} - ${clientNote || 'Client Guest'}` :
                `Seat ${seatId} - ${status}`
            }
        >
            <div className="flex items-center gap-0.5">
                <Armchair size={12} strokeWidth={2.5} />
                <span className="font-black text-[10px] tracking-tighter">{seatId}</span>
            </div>

            {/* Micro details overlay on hover */}
            {(isOccupied || isClientReserved || isSearchMatch) && (
                <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-md transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl ${isSearchMatch ? 'opacity-100 bg-amber-600' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isOccupied && user ? user.name : clientNote || (isSearchMatch ? `Match: ${seatId}` : 'Client Seat')}
                </div>
            )}
        </button>
    );
};

const ArchitecturalFloorplan = ({ level, seats = [], selectedSeat, selectedSeats, highlightSearch, onSelectSeat }) => {
    const seatMap = new Map();
    seats.forEach(s => seatMap.set(s.seatId, s));

    const getSeatProps = (seatId) => {
        const data = seatMap.get(seatId) || {};

        if (seatId === 'CR1' || seatId === 'CR2') {
            data.status = 'OCCUPIED';
            data.user = { name: 'Conference', designation: 'Booked' };
        } else if (seatId === 'L4/5') {
            if (!data.userId && (data.status === 'AVAILABLE' || !data.status)) {
                data.status = 'OCCUPIED';
                data.user = { name: 'Sangathamizh Mam', designation: 'Management' };
            }
        } else if (seatId === 'L4/39') {
            if (!data.userId && (data.status === 'AVAILABLE' || !data.status)) {
                data.status = 'OCCUPIED';
                data.user = { name: 'RN Sir', designation: 'Management' };
            }
        } else if (seatId === 'L4/40') {
            if (!data.userId && (data.status === 'AVAILABLE' || !data.status)) {
                data.status = 'OCCUPIED';
                data.user = { name: 'Leo Sir', designation: 'Management' };
            }
        }

        return {
            seatId,
            status: data.status || 'AVAILABLE',
            user: data.user || null,
            clientNote: data.clientNote || null,
            selectedSeat,
            selectedSeats,
            highlightSearch,
            onSelect: onSelectSeat
        };
    };

    // LEVEL 1 BLUEPRINT FLOORPLAN (16 Seats)
    if (level === 1) {
        return (
            <div className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 relative overflow-hidden min-h-[500px] flex flex-col justify-between select-none">
                {/* Outer Room Border Label */}
                <div className="absolute top-2 left-4 font-black text-xs text-slate-800 dark:text-slate-200 tracking-wider uppercase bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                    LEVEL-1 (NO OF SEATS - 16)
                </div>

                {/* Room Start / Entrance Marking */}
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-lg border border-emerald-400 shadow-md tracking-wider uppercase z-20">
                    <DoorOpen size={14} /> ROOM START / ENTRANCE ➔
                </div>

                {/* Left Door Handle Graphic */}
                <div className="absolute left-0 top-1/3 w-3 h-16 bg-emerald-500 rounded-r-md border-r-2 border-emerald-300 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white rotate-90 uppercase">START</span>
                </div>

                <div className="grid grid-cols-12 gap-4 mt-8 h-full flex-1">
                    {/* Left & Middle Zone */}
                    <div className="col-span-7 border-r-2 border-dashed border-slate-400 p-4 flex flex-col justify-between relative">
                        {/* Top Sofa Furniture Graphic */}
                        <div className="flex justify-center mb-6">
                            <div className="w-40 h-12 border-2 border-slate-700 rounded-2xl bg-amber-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px] text-slate-500 uppercase tracking-widest">
                                Lounge Sofa
                            </div>
                        </div>

                        {/* Middle Partition Desk: L1/1 & L1/2 */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="w-10 h-28 border-2 border-slate-700 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-[9px] text-slate-500 rotate-90">
                                Desk
                            </div>
                            <div className="flex flex-col gap-3">
                                <SeatNode {...getSeatProps('CR1')} />
                                <SeatNode {...getSeatProps('CR2')} />
                            </div>
                        </div>

                        {/* Bottom Round Tables Zone */}
                        <div className="flex justify-around items-end mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            {/* Round Table 1 (L1/3, L1/4, L1/5) */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-3">
                                    <SeatNode {...getSeatProps('L1/3')} />
                                    <SeatNode {...getSeatProps('L1/4')} />
                                </div>
                                <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-blue-100 dark:bg-slate-800 flex items-center justify-center font-black text-[9px] text-slate-600">
                                    Table 1
                                </div>
                                <SeatNode {...getSeatProps('L1/5')} />
                            </div>

                            {/* Round Table 2 (L1/6, L1/7, L1/8) */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-3">
                                    <SeatNode {...getSeatProps('L1/6')} />
                                    <SeatNode {...getSeatProps('L1/7')} />
                                </div>
                                <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-blue-100 dark:bg-slate-800 flex items-center justify-center font-black text-[9px] text-slate-600">
                                    Table 2
                                </div>
                                <SeatNode {...getSeatProps('L1/8')} />
                            </div>
                        </div>
                    </div>

                    {/* Right Partitioned Zone */}
                    <div className="col-span-5 p-4 flex flex-col justify-between">
                        {/* Upper Section: L1/9, L1/10, L1/11 | L1/12, L1/13 */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex justify-between items-center shadow-inner">
                            <div className="flex flex-col gap-2">
                                <SeatNode {...getSeatProps('L1/9')} />
                                <SeatNode {...getSeatProps('L1/10')} />
                                <SeatNode {...getSeatProps('L1/11')} />
                            </div>
                            <div className="w-6 h-24 bg-slate-300 dark:bg-slate-700 rounded-md border border-slate-500"></div>
                            <div className="flex flex-col gap-3">
                                <SeatNode {...getSeatProps('L1/12')} />
                                <SeatNode {...getSeatProps('L1/13')} />
                            </div>
                        </div>

                        {/* Lower Section: L1/14, L1/15, L1/16 */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex flex-col items-center gap-3 mt-4 shadow-inner">
                            <div className="flex gap-4">
                                <SeatNode {...getSeatProps('L1/14')} />
                                <SeatNode {...getSeatProps('L1/15')} />
                            </div>
                            <div className="w-32 h-8 border-2 border-slate-700 bg-slate-200 dark:bg-slate-800 rounded-md flex items-center justify-center font-bold text-[9px] text-slate-500">
                                Rectangular Desk
                            </div>
                            <SeatNode {...getSeatProps('L1/16')} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LEVEL 2 BLUEPRINT FLOORPLAN (13 Seats)
    if (level === 2) {
        return (
            <div className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 relative overflow-hidden min-h-[500px] flex flex-col justify-between select-none">
                <div className="absolute top-2 left-4 font-black text-xs text-slate-800 dark:text-slate-200 tracking-wider uppercase bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                    LEVEL-2 (NO OF SEATS - 13)
                </div>

                {/* Room Start / Entrance Marking */}
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-lg border border-emerald-400 shadow-md tracking-wider uppercase z-20">
                    <DoorOpen size={14} /> ROOM START / ENTRANCE ➔
                </div>

                <div className="absolute left-0 top-1/4 w-3 h-16 bg-emerald-500 rounded-r-md border-r-2 border-emerald-300 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white rotate-90 uppercase">START</span>
                </div>

                <div className="grid grid-cols-12 gap-6 mt-8 flex-1 items-center">
                    {/* Left Table: L2/1, L2/2 on top, L2/3 on bottom */}
                    <div className="col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex flex-col items-center gap-3 shadow-inner">
                        <div className="flex gap-4">
                            <SeatNode {...getSeatProps('L2/1')} />
                            <SeatNode {...getSeatProps('L2/2')} />
                        </div>
                        <div className="w-36 h-16 border-2 border-slate-700 bg-emerald-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-600">
                            Table A
                        </div>
                        <SeatNode {...getSeatProps('L2/3')} />
                    </div>

                    {/* Middle Table: L2/4, L2/5 on top, L2/6, L2/7 on bottom */}
                    <div className="col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex flex-col items-center gap-3 shadow-inner">
                        <div className="flex gap-4">
                            <SeatNode {...getSeatProps('L2/4')} />
                            <SeatNode {...getSeatProps('L2/5')} />
                        </div>
                        <div className="w-36 h-16 border-2 border-slate-700 bg-emerald-100 dark:bg-slate-800 rounded-lg flex items-center justify-center font-black text-xs text-slate-600">
                            Table B
                        </div>
                        <div className="flex gap-4">
                            <SeatNode {...getSeatProps('L2/6')} />
                            <SeatNode {...getSeatProps('L2/7')} />
                        </div>
                    </div>

                    {/* Right Partition: L2/8..L2/10 (Left) | L2/11..L2/13 (Right) */}
                    <div className="col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex justify-between items-center shadow-inner">
                        <div className="flex flex-col gap-3">
                            <SeatNode {...getSeatProps('L2/8')} />
                            <SeatNode {...getSeatProps('L2/9')} />
                            <SeatNode {...getSeatProps('L2/10')} />
                        </div>
                        <div className="w-8 h-40 bg-slate-300 dark:bg-slate-700 border-2 border-slate-600 rounded-md flex items-center justify-center font-black text-[8px] rotate-90 text-slate-600">
                            Partition
                        </div>
                        <div className="flex flex-col gap-3">
                            <SeatNode {...getSeatProps('L2/11')} />
                            <SeatNode {...getSeatProps('L2/12')} />
                            <SeatNode {...getSeatProps('L2/13')} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LEVEL 3 BLUEPRINT FLOORPLAN (16 Seats)
    if (level === 3) {
        return (
            <div className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 relative overflow-hidden min-h-[500px] flex flex-col justify-between select-none">
                <div className="absolute top-2 left-4 font-black text-xs text-slate-800 dark:text-slate-200 tracking-wider uppercase bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                    LEVEL-3 (NO OF SEATS - 16)
                </div>

                {/* Room Start / Entrance Marking */}
                <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-lg border border-emerald-400 shadow-md tracking-wider uppercase z-20">
                    <DoorOpen size={14} /> ROOM START / ENTRANCE ➔
                </div>

                <div className="absolute left-0 top-1/4 w-3 h-16 bg-emerald-500 rounded-r-md border-r-2 border-emerald-300 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white rotate-90 uppercase">START</span>
                </div>

                <div className="grid grid-cols-12 gap-6 mt-8 flex-1">
                    {/* Left Partition: L3/1, L3/2, L3/3 (Left) | L3/4, L3/5, L3/6 (Right) */}
                    <div className="col-span-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex justify-between items-center shadow-inner">
                        <div className="flex flex-col gap-3">
                            <SeatNode {...getSeatProps('L3/1')} />
                            <SeatNode {...getSeatProps('L3/2')} />
                            <SeatNode {...getSeatProps('L3/3')} />
                        </div>
                        <div className="w-10 h-44 bg-slate-300 dark:bg-slate-700 border-2 border-slate-600 rounded-md flex items-center justify-center font-black text-[9px] rotate-90 text-slate-600">
                            Partition
                        </div>
                        <div className="flex flex-col gap-3">
                            <SeatNode {...getSeatProps('L3/4')} />
                            <SeatNode {...getSeatProps('L3/5')} />
                            <SeatNode {...getSeatProps('L3/6')} />
                        </div>
                    </div>

                    {/* Right Zone */}
                    <div className="col-span-8 flex flex-col justify-between gap-6">
                        {/* Upper Section: 2 Circular Tables */}
                        <div className="flex justify-around items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 shadow-inner">
                            {/* Circular Table 1 (L3/7, L3/8) */}
                            <div className="flex flex-col items-center gap-2">
                                <SeatNode {...getSeatProps('L3/7')} />
                                <div className="w-14 h-14 rounded-full border-2 border-slate-700 bg-purple-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px]">
                                    Round 1
                                </div>
                                <SeatNode {...getSeatProps('L3/8')} />
                            </div>

                            {/* Circular Table 2 (L3/9, L3/10) */}
                            <div className="flex flex-col items-center gap-2">
                                <SeatNode {...getSeatProps('L3/9')} />
                                <div className="w-14 h-14 rounded-full border-2 border-slate-700 bg-purple-100 dark:bg-slate-800 flex items-center justify-center font-bold text-[9px]">
                                    Round 2
                                </div>
                                <SeatNode {...getSeatProps('L3/10')} />
                            </div>
                        </div>

                        {/* Lower Section: 2 Rectangular Tables */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Table 1: L3/11, L3/12 (Top) | L3/13 (Bottom) */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-slate-700 flex flex-col items-center gap-2 shadow-inner">
                                <div className="flex gap-3">
                                    <SeatNode {...getSeatProps('L3/11')} />
                                    <SeatNode {...getSeatProps('L3/12')} />
                                </div>
                                <div className="w-28 h-8 border-2 border-slate-700 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-[9px]">
                                    Desk 1
                                </div>
                                <SeatNode {...getSeatProps('L3/13')} />
                            </div>

                            {/* Table 2: L3/14 (Top) | L3/15, L3/16 (Bottom) */}
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-slate-700 flex flex-col items-center gap-2 shadow-inner">
                                <SeatNode {...getSeatProps('L3/14')} />
                                <div className="w-28 h-8 border-2 border-slate-700 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-[9px]">
                                    Desk 2
                                </div>
                                <div className="flex gap-3">
                                    <SeatNode {...getSeatProps('L3/15')} />
                                    <SeatNode {...getSeatProps('L3/16')} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LEVEL 4 BLUEPRINT FLOORPLAN (46 Seats)
    return (
        <div className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border-4 border-slate-800 relative overflow-hidden min-h-[600px] flex flex-col justify-between select-none">
            <div className="absolute top-2 left-4 font-black text-xs text-slate-800 dark:text-slate-200 tracking-wider uppercase bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-300">
                LEVEL-4 (NO OF SEATS - 46)
            </div>

            {/* Room Start / Entrance Marking */}
            <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-lg border border-emerald-400 shadow-md tracking-wider uppercase z-20">
                <DoorOpen size={14} /> ROOM START / ENTRANCE ➔
            </div>

            <div className="absolute left-0 bottom-1/4 w-3 h-16 bg-emerald-500 rounded-r-md border-r-2 border-emerald-300 flex items-center justify-center">
                <span className="text-[7px] font-black text-white rotate-90 uppercase">START</span>
            </div>

            <div className="grid grid-cols-12 gap-4 mt-8 flex-1">
                {/* Left Side (L4/1..L4/5) */}
                <div className="col-span-2 border-r-2 border-dashed border-slate-400 p-2 flex flex-col justify-between items-center">
                    <div className="flex flex-col gap-2 my-1 items-center">
                        <div className="flex gap-2">
                            <SeatNode {...getSeatProps('L4/1')} />
                            <SeatNode {...getSeatProps('L4/2')} />
                        </div>
                        <div className="flex gap-2">
                            <SeatNode {...getSeatProps('L4/3')} />
                            <SeatNode {...getSeatProps('L4/4')} />
                        </div>
                    </div>
                    {/* Sangathamizh Mam's Cabin (1 Chair: L4/5) */}
                    <div className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-700 flex flex-col items-center gap-1.5 my-1 shadow-inner">
                        <SeatNode {...getSeatProps('L4/5')} />
                        <div className="w-full py-0.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-500 rounded text-[7.5px] font-black text-amber-900 dark:text-amber-300 text-center tracking-tight">Sangathamizh Mam's Cabin</div>
                    </div>
                </div>

                {/* Main Central Seating Hall (L4/7..L4/38) */}
                <div className="col-span-8 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-700 flex flex-col justify-between shadow-inner">
                    {/* Top Row: L4/7 .. L4/16 (10 seats) */}
                    <div className="flex justify-between items-center gap-1">
                        {['L4/7', 'L4/8', 'L4/9', 'L4/10', 'L4/11', 'L4/12', 'L4/13', 'L4/14', 'L4/15', 'L4/16'].map(id => (
                            <SeatNode key={id} {...getSeatProps(id)} />
                        ))}
                    </div>

                    {/* Middle Upper Row: L4/17 .. L4/22 (6 seats) */}
                    <div className="flex justify-center items-center gap-3 my-2">
                        {['L4/17', 'L4/18', 'L4/19', 'L4/20', 'L4/21', 'L4/22'].map(id => (
                            <SeatNode key={id} {...getSeatProps(id)} />
                        ))}
                    </div>

                    {/* Center Partition Desk */}
                    <div className="w-full h-8 bg-slate-300 dark:bg-slate-700 border-2 border-slate-600 rounded-md flex items-center justify-center font-black text-xs text-slate-600 tracking-widest my-1">
                        MAIN HALL CENTRAL PARTITION DESK
                    </div>

                    {/* Middle Lower Row: L4/23 .. L4/28 (6 seats) */}
                    <div className="flex justify-center items-center gap-3 my-2">
                        {['L4/23', 'L4/24', 'L4/25', 'L4/26', 'L4/27', 'L4/28'].map(id => (
                            <SeatNode key={id} {...getSeatProps(id)} />
                        ))}
                    </div>

                    {/* Bottom Row: L4/29 .. L4/38 (10 seats) */}
                    <div className="flex justify-between items-center gap-1">
                        {['L4/29', 'L4/30', 'L4/31', 'L4/32', 'L4/33', 'L4/34', 'L4/35', 'L4/36', 'L4/37', 'L4/38'].map(id => (
                            <SeatNode key={id} {...getSeatProps(id)} />
                        ))}
                    </div>
                </div>

                {/* Right Side Booths (RN Sir's & Leo Sir's Cabins) */}
                <div className="col-span-2 border-l-2 border-dashed border-slate-400 p-2 flex flex-col justify-around">
                    {/* Top Booth: RN Sir's Cabin (2 Chairs: L4/41 & L4/39) */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center gap-1.5 shadow-inner">
                        <div className="w-full py-0.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-500 rounded text-[8px] font-black text-amber-900 dark:text-amber-300 text-center tracking-tight">RN Sir's Cabin</div>
                        <SeatNode {...getSeatProps('L4/39')} />
                    </div>

                    {/* Bottom Booth: Leo Sir's Cabin (2 Chairs: L4/45 & L4/40) */}
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center gap-1.5 shadow-inner">
                        <div className="w-full py-0.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-500 rounded text-[8px] font-black text-amber-900 dark:text-amber-300 text-center tracking-tight">Leo Sir's Cabin</div>
                        <SeatNode {...getSeatProps('L4/40')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArchitecturalFloorplan;
