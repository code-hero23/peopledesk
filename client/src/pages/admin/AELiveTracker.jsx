import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
  MapPin, 
  Navigation, 
  Battery, 
  BatteryCharging, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers,
  Smartphone,
  Copy
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const AELiveTracker = () => {
  const { user } = useSelector((state) => state.auth);
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAE, setSelectedAE] = useState(null);
  
  // APK Activation Code Modal state
  const [activationCode, setActivationCode] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const generateActivationCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await axios.post(`${API_BASE}/call-sync/activation-codes`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setActivationCode(res.data.code);
      setShowCodeModal(true);
      toast.success('APK activation code generated! Valid for 10 minutes.');
    } catch (err) {
      console.error('Failed to generate activation code:', err);
      toast.error(err.response?.data?.message || 'Could not generate activation code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };
  
  // Historical Route Tracing state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);

  // Load Leaflet CSS and JS dynamically if not present
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
      // Default centered on India (Chennai/Bangalore area or 13.0827, 80.2707)
      leafletMap.current = window.L.map(mapRef.current).setView([13.0827, 80.2707], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }
  };

  const fetchLiveData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE}/location/live`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setLiveData(res.data || []);
    } catch (err) {
      console.error('Failed to fetch AE live locations:', err);
      toast.error('Could not refresh AE location tracker data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(() => fetchLiveData(), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Update map markers when liveData changes
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = [];

    liveData.forEach((item) => {
      const { user: ae, latestLocation: loc, status } = item;
      if (!loc || !loc.latitude || !loc.longitude) return;

      const latLng = [loc.latitude, loc.longitude];
      bounds.push(latLng);

      const markerColor = status === 'ONLINE' ? '#10b981' : status === 'IDLE' ? '#f59e0b' : '#64748b';

      const customIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 11px;
          ">
            ${ae.name ? ae.name.substring(0, 2).toUpperCase() : 'AE'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = window.L.marker(latLng, { icon: customIcon }).addTo(leafletMap.current);
      
      const popupContent = `
        <div style="font-family: sans-serif; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-weight: 800; font-size: 14px;">${ae.name}</h4>
          <p style="margin: 0; font-size: 11px; color: #64748b;">${ae.designation || 'AE'} • ${ae.phone || 'No phone'}</p>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="margin: 2px 0; font-size: 11px;"><strong>Status:</strong> <span style="color:${markerColor}; font-weight:bold;">${status}</span></p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Battery:</strong> ${loc.batteryLevel != null ? loc.batteryLevel + '%' : 'N/A'}</p>
          <p style="margin: 2px 0; font-size: 11px;"><strong>Last Active:</strong> ${new Date(loc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersRef.current[ae.id] = marker;
    });

    if (bounds.length > 0 && !selectedAE) {
      leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [liveData]);

  // Focus single AE on map
  const handleSelectAE = (aeItem) => {
    setSelectedAE(aeItem);
    const loc = aeItem.latestLocation;
    if (loc && loc.latitude && loc.longitude && leafletMap.current) {
      leafletMap.current.flyTo([loc.latitude, loc.longitude], 15, { duration: 1.2 });
      if (markersRef.current[aeItem.user.id]) {
        markersRef.current[aeItem.user.id].openPopup();
      }
    }
  };

  // Fetch and trace history path for selected AE
  const fetchRouteHistory = async (aeUserId) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/location/history/${aeUserId}?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const logs = res.data.logs || [];
      setHistoryLogs(logs);

      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      if (logs.length > 0 && leafletMap.current && window.L) {
        const pathCoords = logs.map(l => [l.latitude, l.longitude]);
        polylineRef.current = window.L.polyline(pathCoords, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8'
        }).addTo(leafletMap.current);

        leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        toast.info(`Loaded ${logs.length} location points for ${selectedDate}`);
      } else {
        toast.warning(`No location history logs found for ${selectedDate}`);
      }
    } catch (err) {
      console.error('Failed to load location history:', err);
      toast.error('Could not load location route history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filter AEs
  const filteredData = liveData.filter(item => {
    const matchesSearch = item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.user.phone && item.user.phone.includes(searchQuery));
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = liveData.filter(i => i.status === 'ONLINE').length;
  const idleCount = liveData.filter(i => i.status === 'IDLE').length;
  const offlineCount = liveData.filter(i => i.status === 'OFFLINE').length;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Navigation size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">AE Live Tracker</h1>
              <p className="text-xs font-semibold text-slate-400">Real-time GPS location monitoring for Architectural Executives</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generateActivationCode}
            disabled={isGeneratingCode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-blue-600/25"
          >
            <Smartphone size={15} />
            {isGeneratingCode ? 'Generating...' : 'Get APK Code'}
          </button>
          <button
            onClick={() => fetchLiveData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh GPS'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total AEs</p>
            <h3 className="text-2xl font-black text-white mt-1">{liveData.length}</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-300">
            <User size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Online Now</p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">{onlineCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Idle (&lt; 1h)</p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">{idleCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Offline</p>
            <h3 className="text-2xl font-black text-slate-400 mt-1">{offlineCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area: Map + AE List Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left Sidebar: AE Cards & Filters (4 columns) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col h-full shadow-2xl backdrop-blur-xl">
          {/* Search & Filter Tabs */}
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search AE name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
              {['ALL', 'ONLINE', 'IDLE', 'OFFLINE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* AE Cards List */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">Loading AE live data...</div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">No AEs match your filter.</div>
            ) : (
              filteredData.map((item) => {
                const { user: ae, latestLocation: loc, status } = item;
                const isSelected = selectedAE?.user?.id === ae.id;

                return (
                  <div
                    key={ae.id}
                    onClick={() => handleSelectAE(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          status === 'ONLINE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                          status === 'IDLE' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-500'
                        }`} />
                        <h4 className="text-sm font-bold text-white">{ae.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${
                        status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        status === 'IDLE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-500" />
                        <span>{ae.phone || 'No Phone Registered'}</span>
                      </div>
                      {loc && loc.createdAt && (
                        <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-800/80">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={11} /> {new Date(loc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {loc.batteryLevel != null && (
                            <span className="flex items-center gap-1 text-slate-300 font-semibold">
                              <Battery size={12} className="text-emerald-400" /> {loc.batteryLevel}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Leaflet Map Container & Route Controls (8 columns) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col h-full shadow-2xl relative overflow-hidden">
          {/* Map Controls Top Bar */}
          {selectedAE && (
            <div className="absolute top-7 left-7 z-20 bg-slate-900/95 border border-slate-700 p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-wrap items-center gap-3 max-w-lg">
              <div>
                <p className="text-xs font-bold text-white">{selectedAE.user.name}</p>
                <p className="text-[10px] text-slate-400">Selected AE for route tracing</p>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white outline-none"
                />
                <button
                  onClick={() => fetchRouteHistory(selectedAE.user.id)}
                  disabled={loadingHistory}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  {loadingHistory ? 'Tracing...' : 'Trace Route'}
                </button>
              </div>
            </div>
          )}

          {/* Leaflet Map DOM Element */}
          <div ref={mapRef} className="w-full h-full rounded-2xl z-10 border border-slate-800" />
        </div>
      </div>

      {/* Modal: APK Activation Code */}
      {showCodeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Smartphone size={28} />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">APK Device Activation Code</h3>
              <p className="mt-1 text-xs text-slate-300">Enter this code into the PeopleDesk APK on the mobile device.</p>
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
              ⏱️ Valid for 10 minutes. Device will sync Call Logs and 5-minute Live Location pings.
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

export default AELiveTracker;
