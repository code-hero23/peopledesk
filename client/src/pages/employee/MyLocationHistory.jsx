import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  Navigation, 
  Calendar, 
  MapPin, 
  Clock, 
  Battery, 
  Route, 
  RefreshCw, 
  Smartphone,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Haversine formula to compute distance between two lat/lng points in km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MyLocationHistory = () => {
  const { user } = useSelector((state) => state.auth);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // APK Activation Modal state
  const [activationCode, setActivationCode] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (mapRef.current && !leafletMap.current && window.L) {
      leafletMap.current = window.L.map(mapRef.current).setView([13.0827, 80.2707], 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/location/history/${user.id}?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const logs = res.data.logs || [];
      setHistoryLogs(logs);

      updateMapRoute(logs);
    } catch (err) {
      console.error('Failed to fetch location history:', err);
      toast.error('Could not load travel history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedDate]);

  const updateMapRoute = (logs) => {
    if (!leafletMap.current || !window.L) return;

    // Clear old markers and polyline
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (logs.length === 0) return;

    const pathCoords = logs.map(l => [l.latitude, l.longitude]);

    // Draw polyline route
    polylineRef.current = window.L.polyline(pathCoords, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      dashArray: '6, 6'
    }).addTo(leafletMap.current);

    // Add numbered markers along path
    logs.forEach((log, index) => {
      const isFirst = index === 0;
      const isLast = index === logs.length - 1;

      const bgColor = isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6';

      const customIcon = window.L.divIcon({
        className: 'custom-history-pin',
        html: `
          <div style="
            background-color: ${bgColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 10px;
          ">
            ${index + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = window.L.marker([log.latitude, log.longitude], { icon: customIcon }).addTo(leafletMap.current);
      
      const popupText = `
        <div style="font-family: sans-serif; padding: 4px;">
          <h5 style="margin:0 0 4px 0; font-weight:800; font-size:12px;">Waypoint #${index + 1}</h5>
          <p style="margin:0; font-size:11px; color:#64748b;"><strong>Time:</strong> ${new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p style="margin:2px 0; font-size:11px;"><strong>Battery:</strong> ${log.batteryLevel != null ? log.batteryLevel + '%' : 'N/A'}</p>
        </div>
      `;
      marker.bindPopup(popupText);
      markersRef.current.push(marker);
    });

    leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
  };

  const generateActivationCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await axios.post(`${API_BASE}/call-sync/activation-codes`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActivationCode(res.data.code);
      setShowCodeModal(true);
      toast.success('APK activation code generated!');
    } catch (err) {
      console.error('Failed to generate activation code:', err);
      toast.error(err.response?.data?.message || 'Could not generate activation code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Calculate total distance traveled
  const totalDistanceKm = historyLogs.reduce((acc, curr, i) => {
    if (i === 0) return 0;
    const prev = historyLogs[i - 1];
    return acc + calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
  }, 0);

  const firstPing = historyLogs[0]?.createdAt ? new Date(historyLogs[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const lastPing = historyLogs[historyLogs.length - 1]?.createdAt ? new Date(historyLogs[historyLogs.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Route size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">My Travel History</h1>
            <p className="text-xs font-semibold text-slate-400">Track your daily work visit routes and location pings</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white outline-none font-medium"
            />
          </div>

          <button
            onClick={generateActivationCode}
            disabled={isGeneratingCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/25"
          >
            <Smartphone size={15} />
            {isGeneratingCode ? 'Generating...' : 'Get Mobile APK Code'}
          </button>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
            title="Refresh Route"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recorded Pings</p>
            <h3 className="text-2xl font-black text-white mt-1">{historyLogs.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MapPin size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Est. Distance</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{totalDistanceKm.toFixed(1)} km</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Route size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">First Active Ping</p>
            <h3 className="text-lg font-bold text-slate-200 mt-1">{firstPing}</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Last Active Ping</p>
            <h3 className="text-lg font-bold text-slate-200 mt-1">{lastPing}</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Main Container: Interactive Route Map + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
        {/* Timeline List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col h-full shadow-2xl backdrop-blur-xl">
          <h3 className="text-sm font-bold text-white mb-3">Timeline Logs ({selectedDate})</h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading history logs...</div>
            ) : historyLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">No location pings recorded for this date.</div>
            ) : (
              historyLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-3.5 rounded-2xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                    <span className="font-mono text-[11px]">
                      {log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}
                    </span>
                    {log.batteryLevel != null && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <Battery size={12} /> {log.batteryLevel}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map View (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col h-full shadow-2xl relative overflow-hidden">
          <div ref={mapRef} className="w-full h-full rounded-2xl z-10 border border-slate-800" />
        </div>
      </div>

      {/* APK Activation Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Smartphone size={28} />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">APK Device Activation Code</h3>
              <p className="mt-1 text-xs text-slate-300">Enter this 6-digit code inside the PeopleDesk APK on your phone.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <span className="text-3xl font-black tracking-[0.3em] font-mono text-blue-400 pl-3">
                {activationCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activationCode);
                  toast.success('Code copied to clipboard!');
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                title="Copy Code"
              >
                <Copy size={16} />
              </button>
            </div>

            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              ⏱️ Valid for 10 minutes. Enables automatic location tracking & call log sync.
            </p>

            <button
              onClick={() => setShowCodeModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLocationHistory;
