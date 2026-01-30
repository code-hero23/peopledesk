import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

import { Search, Calendar, X, ExternalLink } from 'lucide-react';

const AttendanceVerification = () => {
    const { user } = useSelector((state) => state.auth);
    const [report, setReport] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const { data } = await axios.get(`${baseUrl}/admin/attendance/daily?date=${date}`, config);
            setReport(data);
        } catch (error) {
            console.error(error);
            alert('Failed to fetch attendance report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [date]);

    // Construct full URL for photos
    const getPhotoUrl = (path) => {
        if (!path) return null;
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        // If path starts with /uploads, append to server root (remove /api)
        const serverRoot = apiBase.replace('/api', '');
        return `${serverRoot}${path}`;
    };

    const filteredReport = report.filter(item =>
        item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Attendance Verification</h1>
                <div className="flex space-x-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <div className="flex items-center space-x-2 bg-white border rounded-lg px-4 py-2">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent focus:outline-none text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Employee</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Sessions</th>
                                <th className="px-6 py-4 font-semibold text-slate-600 text-sm">Designation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500">Loading...</td>
                                </tr>
                            ) : filteredReport.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500">No records found</td>
                                </tr>
                            ) : (
                                filteredReport.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-slate-900">{item.user.name}</div>
                                                <div className="text-sm text-slate-500">{item.user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.sessions.length > 0 ? (
                                                <div className="space-y-4">
                                                    {item.sessions.map((session, sIdx) => {
                                                        const inUrl = getPhotoUrl(session.checkInPhoto);
                                                        const outUrl = getPhotoUrl(session.checkoutPhoto);

                                                        return (
                                                            <div key={sIdx} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                                <div className="text-xs font-semibold text-gray-500 mb-2">
                                                                    Session {sIdx + 1}:
                                                                    <span className="ml-2 text-slate-700">
                                                                        {new Date(session.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                                        {session.timeOut ? new Date(session.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' Active'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex space-x-4">
                                                                    {inUrl ? (
                                                                        <div
                                                                            className="cursor-pointer group relative"
                                                                            onClick={() => setSelectedPhoto({ url: inUrl, title: `${item.user.name} - Check In` })}
                                                                        >
                                                                            <img src={inUrl} alt="In" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                                                                                <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                                                                            </div>
                                                                            <p className="text-[10px] text-center mt-1 text-gray-500">Check In</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-16 h-16 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-xs text-gray-400">No Photo</div>
                                                                    )}

                                                                    {outUrl ? (
                                                                        <div
                                                                            className="cursor-pointer group relative"
                                                                            onClick={() => setSelectedPhoto({ url: outUrl, title: `${item.user.name} - Check Out` })}
                                                                        >
                                                                            <img src={outUrl} alt="Out" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                                                                                <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                                                                            </div>
                                                                            <p className="text-[10px] text-center mt-1 text-gray-500">Check Out</p>
                                                                        </div>
                                                                    ) : (
                                                                        session.timeOut ?
                                                                            <div className="w-16 h-16 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center text-xs text-gray-400">No Photo</div> :
                                                                            null
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {item.user.designation}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Photo Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            className="absolute top-0 right-0 m-4 text-white hover:text-gray-300 z-50 p-2 bg-black bg-opacity-50 rounded-full"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={selectedPhoto.url}
                            alt="Evidence"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <p className="text-white mt-4 font-medium text-lg">{selectedPhoto.title}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceVerification;
