import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
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
  Copy,
  Moon,
  Sun,
  X,
  Compass,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Download,
  Play,
  Pause,
  RotateCcw,
  Route,
  Car,
  Crosshair,
  Bike,
  Building,
  Flag,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify';
import ApkDownloadModal from '../../components/common/ApkDownloadModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const AELiveTracker = () => {
  const { user } = useSelector((state) => state.auth);

  // Strictly block regular Employee AEs from live tracking; allow AE Manager & Management
  const role = (user?.role || '').toUpperCase();
  const designation = (user?.designation || '').toUpperCase();
  const isAuthorizedManager = [
    'ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'AE_MANAGER', 'HR'
  ].includes(role) ||
    designation === 'AE MANAGER' ||
    designation === 'AR MANAGER' ||
    designation.includes('AE MANAGER') ||
    designation.includes('AR MANAGER');

  const [liveData, setLiveData] = useState([]);
  const [trackingInfo, setTrackingInfo] = useState({
    isCurrentlyInWindow: true,
    startIST: '07:00 AM',
    endIST: '08:00 PM',
    windowLabel: '7:00 AM – 8:00 PM IST'
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAE, setSelectedAE] = useState(null);
  
  // Mobile active tab: 'map' or 'list'
  const [mobileTab, setMobileTab] = useState('map');

  // Uber / Rapido Style Live Ride Tracking & Vehicle Mode
  const [vehicleMode, setVehicleMode] = useState('bike'); // 'bike' (Rapido) or 'cab' (Uber)
  const [isFollowMode, setIsFollowMode] = useState(false);
  const [isHudExpanded, setIsHudExpanded] = useState(true);

  // Selected AE Site Sign-Ins (Sequential Sites: Site 1, Site 2, Site 3...)
  const [selectedAESiteSignIns, setSelectedAESiteSignIns] = useState([]);
  const [selectedAESiteSignIn, setSelectedAESiteSignIn] = useState(null);
  const [selectedAEAssignment, setSelectedAEAssignment] = useState(null);

  // APK Activation Code Modal state
  const [activationCode, setActivationCode] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showApkDownloadModal, setShowApkDownloadModal] = useState(false);

  // Live IST Clock
  const [currentISTTime, setCurrentISTTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentISTTime(istStr);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const [isPingingNow, setIsPingingNow] = useState(false);

  const handleManualPing = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your device.');
      return;
    }
    setIsPingingNow(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.post(
            `${API_BASE}/location/ping`,
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed
            },
            { headers: { Authorization: `Bearer ${user.token}` } }
          );
          if (res.data?.trackingActive === false) {
            toast.warning('Ping received, but tracking is paused outside 7:00 AM – 8:00 PM IST.');
          } else {
            toast.success('Your live GPS location was transmitted successfully!');
          }
          await fetchLiveData(true);
        } catch (err) {
          console.error('Failed to send test ping:', err);
          toast.error(err.response?.data?.message || 'Could not record location ping');
        } finally {
          setIsPingingNow(false);
        }
      },
      (err) => {
        setIsPingingNow(false);
        toast.error(`Location error: ${err.message}. Please enable GPS.`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };
  
  // Helper: Haversine distance in meters
  const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper: Detect stationary visit stops (remained within 45m for >= 8 mins)
  const detectStops = (logs) => {
    if (!logs || logs.length < 2) return [];
    const stops = [];
    let cluster = [logs[0]];

    for (let i = 1; i < logs.length; i++) {
      const prev = cluster[0];
      const curr = logs[i];
      const dist = getDistanceMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);

      if (dist <= 45) {
        cluster.push(curr);
      } else {
        const startTime = new Date(cluster[0].createdAt).getTime();
        const endTime = new Date(cluster[cluster.length - 1].createdAt).getTime();
        const durationMins = Math.round((endTime - startTime) / (1000 * 60));

        if (durationMins >= 8) {
          const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
          const avgLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
          stops.push({
            latitude: avgLat,
            longitude: avgLng,
            arrivedAt: cluster[0].createdAt,
            departedAt: cluster[cluster.length - 1].createdAt,
            durationMins,
            stopNumber: stops.length + 1
          });
        }
        cluster = [curr];
      }
    }

    if (cluster.length > 1) {
      const startTime = new Date(cluster[0].createdAt).getTime();
      const endTime = new Date(cluster[cluster.length - 1].createdAt).getTime();
      const durationMins = Math.round((endTime - startTime) / (1000 * 60));
      if (durationMins >= 8) {
        const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
        stops.push({
          latitude: avgLat,
          longitude: avgLng,
          arrivedAt: cluster[0].createdAt,
          departedAt: cluster[cluster.length - 1].createdAt,
          durationMins,
          stopNumber: stops.length + 1
        });
      }
    }

    return stops;
  };

  // Helper: Calculate total path distance in km
  const calculateTotalDistanceKm = (logs) => {
    if (!logs || logs.length < 2) return '0.0';
    let totalMeters = 0;
    for (let i = 1; i < logs.length; i++) {
      totalMeters += getDistanceMeters(
        logs[i - 1].latitude,
        logs[i - 1].longitude,
        logs[i].latitude,
        logs[i].longitude
      );
    }
    return (totalMeters / 1000).toFixed(1);
  };

  // Helper: Convert sequential GPS breadcrumbs to street-following road path using OSRM
  const getRoadSnappedRoute = async (rawLogs) => {
    if (!rawLogs || rawLogs.length < 2) {
      return {
        pathCoords: rawLogs ? rawLogs.map(l => [l.latitude, l.longitude]) : [],
        isSnapped: false,
        roadDistanceKm: null
      };
    }

    // Filter out jitter (consecutive points closer than 15m)
    const filtered = [rawLogs[0]];
    for (let i = 1; i < rawLogs.length; i++) {
      const prev = filtered[filtered.length - 1];
      const curr = rawLogs[i];
      const dist = getDistanceMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      if (dist >= 15 || i === rawLogs.length - 1) {
        filtered.push(curr);
      }
    }

    if (filtered.length < 2) {
      return {
        pathCoords: rawLogs.map(l => [l.latitude, l.longitude]),
        isSnapped: false,
        roadDistanceKm: null
      };
    }

    // Query public OSRM in chunks of 25 coordinates with 1-point overlap
    const CHUNK_SIZE = 25;
    const allSnappedCoords = [];
    let totalRoadMeters = 0;
    let anySnapped = false;

    for (let i = 0; i < filtered.length - 1; i += (CHUNK_SIZE - 1)) {
      const chunk = filtered.slice(i, Math.min(filtered.length, i + CHUNK_SIZE));
      if (chunk.length < 2) break;

      const coordString = chunk.map(p => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

      try {
        const response = await fetch(osrmUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 'Ok' && data.routes && data.routes[0]) {
            const legCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
            totalRoadMeters += data.routes[0].distance || 0;
            anySnapped = true;

            if (allSnappedCoords.length === 0) {
              allSnappedCoords.push(...legCoords);
            } else {
              // Avoid duplicate stitch coordinate
              allSnappedCoords.push(...legCoords.slice(1));
            }
            continue;
          }
        }
      } catch (err) {
        console.warn('OSRM chunk routing fallback to direct GPS coordinates:', err);
      }

      // Fallback for this chunk: direct points
      const directChunk = chunk.map(p => [p.latitude, p.longitude]);
      if (allSnappedCoords.length === 0) {
        allSnappedCoords.push(...directChunk);
      } else {
        allSnappedCoords.push(...directChunk.slice(1));
      }
    }

    return {
      pathCoords: allSnappedCoords.length > 0 ? allSnappedCoords : rawLogs.map(l => [l.latitude, l.longitude]),
      isSnapped: anySnapped,
      roadDistanceKm: totalRoadMeters > 0 ? (totalRoadMeters / 1000).toFixed(1) : null
    };
  };

  // Historical Route Tracing state
  const [selectedDate, setSelectedDate] = useState(() => {
    // Current IST date in YYYY-MM-DD
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [detectedStopsList, setDetectedStopsList] = useState([]);
  const [snappedPathCoords, setSnappedPathCoords] = useState([]);
  const [isRoadSnapped, setIsRoadSnapped] = useState(false);
  const [roadDistanceKm, setRoadDistanceKm] = useState(null);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const siteMarkersRef = useRef({});
  const markerAnimationsRef = useRef({});
  const polylineRef = useRef(null);
  const casingPolylineRef = useRef(null);
  const historyMarkersRef = useRef([]);
  const stopMarkersRef = useRef([]);

  // Helper to remove all route polylines and history markers cleanly
  const clearMapRoute = () => {
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (casingPolylineRef.current) {
      casingPolylineRef.current.remove();
      casingPolylineRef.current = null;
    }
    historyMarkersRef.current.forEach(m => m.remove());
    historyMarkersRef.current = [];
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];
  };

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
      Object.values(markerAnimationsRef.current).forEach(id => cancelAnimationFrame(id));
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const [mapType, setMapType] = useState('google_roadmap');
  const tileLayerRef = useRef(null);

  const getTileConfig = (type) => {
    if (type === 'google_satellite') {
      return {
        url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
        options: { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '&copy; Google Maps' }
      };
    }
    if (type === 'google_roadmap') {
      return {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        options: { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '&copy; Google Maps' }
      };
    }
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }
    };
  };

  const changeMapType = (type) => {
    setMapType(type);
    if (leafletMap.current && window.L) {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
      }
      const config = getTileConfig(type);
      tileLayerRef.current = window.L.tileLayer(config.url, config.options).addTo(leafletMap.current);
      setTimeout(() => leafletMap.current?.invalidateSize(), 80);
    }
  };

  const initMap = () => {
    if (mapRef.current && !leafletMap.current && window.L) {
      leafletMap.current = window.L.map(mapRef.current, {
        zoomControl: false,
        preferCanvas: true,
        maxZoom: 21
      }).setView([13.0827, 80.2707], 12);

      // Add zoom control at top-left
      window.L.control.zoom({ position: 'topleft' }).addTo(leafletMap.current);

      const config = getTileConfig('google_roadmap');
      tileLayerRef.current = window.L.tileLayer(config.url, config.options).addTo(leafletMap.current);

      // Trigger size invalidations as DOM finishes layout
      setTimeout(() => leafletMap.current?.invalidateSize(), 100);
      setTimeout(() => leafletMap.current?.invalidateSize(), 400);
      setTimeout(() => leafletMap.current?.invalidateSize(), 1200);
    }
  };

  // Robust container resize observer to guarantee full tile coverage without grey blank spaces
  useEffect(() => {
    if (!mapRef.current) return;

    const observer = new ResizeObserver(() => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    });
    observer.observe(mapRef.current);

    const handleWindowResize = () => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Re-invalidate map size when mobile tab changes
  useEffect(() => {
    if (leafletMap.current) {
      setTimeout(() => {
        leafletMap.current?.invalidateSize();
      }, 150);
    }
  }, [mobileTab]);

  const fetchLiveData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await axios.get(`${API_BASE}/location/live`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      // Support both legacy array format and object format with trackingWindow info
      const newItems = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.liveData || []);

      setLiveData(newItems);
      if (res.data?.trackingWindow) {
        setTrackingInfo(res.data.trackingWindow);
      }

      // Synchronize selectedAE with fresh live data so HUD, battery and speed remain live
      setSelectedAE(prev => {
        if (!prev) return null;
        const fresh = newItems.find(i => i.user.id === prev.user.id);
        return fresh || prev;
      });
    } catch (err) {
      console.error('Failed to fetch AE live locations:', err);
      if (isManual) {
        toast.error('Could not refresh AE location tracker data.');
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  // Dynamic Fast-Polling: 3.5s when any AE is moving or an AE is selected; 10s when stationary
  const anyMoving = liveData.some(i => i.isMoving || i.status === 'MOVING');
  const pollInterval = (anyMoving || selectedAE) ? 3500 : 10000;

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveData();
    }, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, selectedAE?.user?.id]);

  // Calculate bearing angle between two coordinates (0-360 degrees)
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  // High-Definition Top-Down Bike/Scooter Vector (Rapido / Two-Wheeler style)
  const getBikeSVG = (color = '#2563eb', bearing = 0) => `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <!-- Glowing Headlight Beam projecting forward -->
      <div class="headlight-beam" style="
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 14px solid transparent;
        border-right: 14px solid transparent;
        border-top: 26px solid rgba(254, 240, 138, 0.55);
        filter: blur(2px);
        pointer-events: none;
      "></div>

      <!-- Top-Down Bike/Scooter SVG -->
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));">
        <ellipse cx="24" cy="25" rx="9" ry="20" fill="rgba(0,0,0,0.3)" filter="blur(1px)"/>
        <rect x="22" y="4" width="4" height="10" rx="2" fill="#0f172a" stroke="#ffffff" stroke-width="1"/>
        <rect x="13" y="13" width="22" height="3" rx="1.5" fill="#334155" stroke="#ffffff" stroke-width="0.8"/>
        <circle cx="12" cy="11" r="2" fill="#94a3b8" stroke="#ffffff" stroke-width="0.5"/>
        <circle cx="36" cy="11" r="2" fill="#94a3b8" stroke="#ffffff" stroke-width="0.5"/>
        <path d="M21 12 H27 L25 15 H23 Z" fill="#fef08a"/>
        <path d="M19 16 C19 14 29 14 29 16 L31 34 C31 36 17 36 17 34 Z" fill="${color}" stroke="#ffffff" stroke-width="1.2"/>
        <path d="M20 22 C20 20 28 20 28 22 L27 33 C27 34 21 34 21 33 Z" fill="#1e293b"/>
        <circle cx="24" cy="23" r="5" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>
        <path d="M20 21 Q24 18 28 21" stroke="#0284c7" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="22" y="34" width="4" height="8" rx="2" fill="#0f172a" stroke="#ffffff" stroke-width="0.8"/>
        <rect x="21.5" y="40" width="5" height="2" rx="1" fill="#ef4444"/>
      </svg>
    </div>
  `;

  // High-Definition Top-Down Cab/Car Vector (Uber / Four-Wheeler style)
  const getCabSVG = (color = '#eab308', bearing = 0) => `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <!-- Dual Headlight Beams projecting forward -->
      <div class="headlight-beam" style="
        position: absolute;
        top: -26px;
        left: 14px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 26px solid rgba(254, 240, 138, 0.45);
        filter: blur(2px);
        pointer-events: none;
      "></div>
      <div class="headlight-beam" style="
        position: absolute;
        top: -26px;
        right: 14px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 26px solid rgba(254, 240, 138, 0.45);
        filter: blur(2px);
        pointer-events: none;
      "></div>

      <!-- Top-Down Cab/Car SVG -->
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 5px 12px rgba(0,0,0,0.65));">
        <ellipse cx="24" cy="25" rx="14" ry="20" fill="rgba(0,0,0,0.3)" filter="blur(2px)"/>
        <rect x="7" y="10" width="3.5" height="8" rx="1.5" fill="#0f172a"/>
        <rect x="37.5" y="10" width="3.5" height="8" rx="1.5" fill="#0f172a"/>
        <rect x="7" y="30" width="3.5" height="8" rx="1.5" fill="#0f172a"/>
        <rect x="37.5" y="30" width="3.5" height="8" rx="1.5" fill="#0f172a"/>
        <rect x="9" y="6" width="30" height="36" rx="8" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
        <path d="M12 16 L15 11 H33 L36 16 Z" fill="#1e293b" stroke="#475569" stroke-width="0.5"/>
        <rect x="13" y="17" width="22" height="15" rx="3" fill="#ffffff" opacity="0.25"/>
        <rect x="18" y="21" width="12" height="5" rx="1.5" fill="#0f172a" stroke="#ffffff" stroke-width="0.8"/>
        <text x="24" y="25" fill="#facc15" font-size="3.2" font-weight="900" text-anchor="middle" font-family="sans-serif">TAXI</text>
        <path d="M14 33 H34 L32 37 H16 Z" fill="#1e293b" stroke="#475569" stroke-width="0.5"/>
        <rect x="11" y="6" width="5" height="2" rx="1" fill="#fef08a"/>
        <rect x="32" y="6" width="5" height="2" rx="1" fill="#fef08a"/>
        <rect x="11" y="40" width="5" height="2" rx="1" fill="#ef4444"/>
        <rect x="32" y="40" width="5" height="2" rx="1" fill="#ef4444"/>
      </svg>
    </div>
  `;

  // Continuous Vehicle Movement & Dead-Reckoning Engine (Uber / Rapido / Google Maps style)
  // Glides marker smoothly from current position to target GPS position.
  // When in MOVING state, continues dead-reckoning forward along street vector so vehicle never freezes still.
  const animateVehicleMotion = (aeId, marker, startPos, targetPos, isMoving, speedMps = 0, initialBearing = 0) => {
    if (!marker) return;

    if (markerAnimationsRef.current[aeId]) {
      cancelAnimationFrame(markerAnimationsRef.current[aeId]);
      delete markerAnimationsRef.current[aeId];
    }

    const distMeters = getDistanceMeters(startPos[0], startPos[1], targetPos[0], targetPos[1]);

    if (!isMoving || distMeters < 1.5) {
      marker.setLatLng(targetPos);
      return;
    }

    // Vector bearing along movement path
    const moveBearing = calculateBearing(startPos[0], startPos[1], targetPos[0], targetPos[1]);
    const activeBearing = (!isNaN(moveBearing) && moveBearing !== 0) ? moveBearing : initialBearing;

    // Glide duration matched to polling interval (~3200ms)
    const targetDuration = Math.min(4200, Math.max(1600, (distMeters / Math.max(speedMps || 6, 2)) * 1000));
    const startTime = performance.now();

    const velLat = (targetPos[0] - startPos[0]) / targetDuration;
    const velLng = (targetPos[1] - startPos[1]) / targetDuration;

    function step(now) {
      const elapsed = now - startTime;
      let curLat, curLng;

      if (elapsed <= targetDuration) {
        // Phase 1: Smooth interpolation from startPos to targetPos
        const progress = elapsed / targetDuration;
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        curLat = startPos[0] + (targetPos[0] - startPos[0]) * ease;
        curLng = startPos[1] + (targetPos[1] - startPos[1]) * ease;
      } else {
        // Phase 2: Still moving, continue dead-reckoning forward along street vector
        // until next GPS poll arrives (max 4.5 seconds to avoid overshooting)
        const extraMs = Math.min(elapsed - targetDuration, 4500);
        curLat = targetPos[0] + velLat * extraMs;
        curLng = targetPos[1] + velLng * extraMs;

        if (extraMs >= 4500) {
          marker.setLatLng([curLat, curLng]);
          return;
        }
      }

      marker.setLatLng([curLat, curLng]);

      // Dynamically update bearing rotation on the vehicle element
      const markerEl = marker.getElement();
      if (markerEl) {
        const rotator = markerEl.querySelector('.vehicle-rotator');
        if (rotator) {
          rotator.style.transform = `rotate(${Math.round(activeBearing)}deg)`;
        }
      }

      // If camera follow mode is active and this is the selected AE, gently follow
      if (isFollowMode && selectedAE?.user?.id === aeId && leafletMap.current) {
        if (Math.floor(elapsed / 450) !== Math.floor((elapsed - 16) / 450)) {
          leafletMap.current.panTo([curLat, curLng], { animate: true, duration: 0.4 });
        }
      }

      markerAnimationsRef.current[aeId] = requestAnimationFrame(step);
    }

    markerAnimationsRef.current[aeId] = requestAnimationFrame(step);
  };

  // Update map markers when liveData changes with smooth gliding, bike/cab icons & sequential Site pins
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;

    const currentEmployeeIds = new Set();
    const currentSiteKeys = new Set();
    const bounds = [];

    // Filter items to render: if selectedAE is set, ONLY render that selected AE (show his data alone!)
    // If selectedAE is null, render all AEs (overall view)
    const itemsToRender = selectedAE
      ? liveData.filter(item => item.user.id === selectedAE.user.id)
      : liveData;

    itemsToRender.forEach((item) => {
      const { user: ae, latestLocation: loc, previousLocation: prevLoc, status } = item;

      // 1. Check and Pin Sequential Sites (Site 1, Site 2, Site 3...) on Map if present
      const sites = (item.siteSignIns && item.siteSignIns.length > 0)
        ? item.siteSignIns
        : (item.siteSignIn ? [item.siteSignIn] : []);

      sites.forEach((site) => {
        if (!site.latitude || !site.longitude) return;
        const siteKey = `${ae.id}_site_${site.siteNumber}`;
        currentSiteKeys.add(siteKey);
        const siteLatLng = [site.latitude, site.longitude];
        bounds.push(siteLatLng);

        const isCompleted = site.isCompleted || site.status === 'COMPLETED';
        const siteIcon = window.L.divIcon({
          className: 'custom-site-signin-pin',
          html: `
            <div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <!-- Outer Glow Radar Ring -->
              <div style="
                position: absolute;
                width: 58px;
                height: 58px;
                border-radius: 16px;
                background: ${isCompleted ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.25)'};
                border: 2px solid ${isCompleted ? 'rgba(16, 185, 129, 0.7)' : 'rgba(245, 158, 11, 0.85)'};
                ${isCompleted ? '' : 'animation: pingRadar 2s cubic-bezier(0, 0, 0.2, 1) infinite;'}
              "></div>

              <!-- Main Pin Card -->
              <div style="
                background: ${isCompleted 
                  ? 'linear-gradient(135deg, #065f46, #059669, #10b981)' 
                  : 'linear-gradient(135deg, #92400e, #d97706, #f59e0b)'};
                width: 44px;
                height: 44px;
                border-radius: 14px;
                border: 3px solid #ffffff;
                box-shadow: 0 6px 20px ${isCompleted ? 'rgba(5, 150, 105, 0.6)' : 'rgba(217, 119, 6, 0.7)'};
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                position: relative;
                z-index: 2;
              ">
                <span style="font-size: 15px; line-height: 1;">${isCompleted ? '✅' : '🏢'}</span>
                <span style="font-size: 8px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 1px;">
                  SITE ${site.siteNumber}
                </span>
              </div>

              <!-- Floating Site Name Badge Below -->
              <div style="
                position: absolute;
                bottom: -18px;
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                background: #0f172a;
                color: ${isCompleted ? '#a7f3d0' : '#fde68a'};
                border: 1.5px solid ${isCompleted ? '#10b981' : '#f59e0b'};
                font-size: 9.5px;
                font-weight: 800;
                padding: 2px 7px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                gap: 4px;
                z-index: 4;
              ">
                <span style="width: 5px; height: 5px; border-radius: 50%; background: ${isCompleted ? '#10b981' : '#f59e0b'}; ${isCompleted ? '' : 'animation: pulse 1.2s infinite;'} display: inline-block;"></span>
                <span>Site ${site.siteNumber}: ${site.siteName}</span>
                ${isCompleted ? '<span style="color: #6ee7b7; font-size: 8.5px;">(Done)</span>' : ''}
              </div>
            </div>
          `,
          iconSize: [68, 68],
          iconAnchor: [34, 34]
        });

        const sitePopup = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 230px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 34px; height: 34px; border-radius: 8px; background: ${isCompleted ? '#ecfdf5' : '#fef3c7'}; border: 1.5px solid ${isCompleted ? '#10b981' : '#f59e0b'}; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                ${isCompleted ? '✅' : '🏢'}
              </div>
              <div>
                <h4 style="margin: 0; font-size: 13.5px; font-weight: 800; color: ${isCompleted ? '#065f46' : '#92400e'};">Site ${site.siteNumber}: ${site.siteName}</h4>
                <span style="font-size: 9.5px; font-weight: 800; color: ${isCompleted ? '#059669' : '#d97706'}; text-transform: uppercase;">
                  ${isCompleted ? '✅ Completed / Signed Out' : '🟢 Logged In / Active Site'}
                </span>
              </div>
            </div>
            <div style="background: ${isCompleted ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${isCompleted ? '#bbf7d0' : '#fde68a'}; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: ${isCompleted ? '#166534' : '#78350f'}; line-height: 1.5;">
              <div><strong>👤 Executive:</strong> ${ae.name}</div>
              <div><strong>🕒 Signed In:</strong> ${new Date(site.signedInAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST</div>
              ${site.checkoutTime ? `<div><strong>📤 Completed:</strong> ${new Date(site.checkoutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST</div>` : ''}
              ${site.address ? `<div><strong>📍 Address:</strong> ${site.address}</div>` : ''}
            </div>
          </div>
        `;

        if (siteMarkersRef.current[siteKey]) {
          siteMarkersRef.current[siteKey].setLatLng(siteLatLng);
          siteMarkersRef.current[siteKey].setIcon(siteIcon);
          siteMarkersRef.current[siteKey].setPopupContent(sitePopup);
        } else {
          const marker = window.L.marker(siteLatLng, {
            icon: siteIcon,
            zIndexOffset: 300
          }).addTo(leafletMap.current);
          marker.bindPopup(sitePopup);
          marker.on('click', () => {
            leafletMap.current?.flyTo(siteLatLng, 18, { duration: 0.8 });
          });
          siteMarkersRef.current[siteKey] = marker;
        }
      });

      // 2. Render Live Moving AE Marker (Bike 🛵 or Cab 🚗)
      if (!loc || !loc.latitude || !loc.longitude) return;

      currentEmployeeIds.add(ae.id);
      const latLng = [loc.latitude, loc.longitude];
      bounds.push(latLng);

      const isMoving = item.isMoving || status === 'MOVING';
      const isStationary = status === 'STATIONARY' || status === 'ONLINE' || (!isMoving && status !== 'IDLE' && status !== 'OFFLINE' && status !== 'OUT_OF_HOURS');

      // Calculate bearing angle: prefer vector from current marker position to new GPS fix
      let bearing = 0;
      const existing = markersRef.current[ae.id];
      if (existing) {
        const cur = existing.getLatLng();
        const d = getDistanceMeters(cur.lat, cur.lng, loc.latitude, loc.longitude);
        if (d >= 2) {
          bearing = calculateBearing(cur.lat, cur.lng, loc.latitude, loc.longitude);
        } else if (prevLoc && prevLoc.latitude && prevLoc.longitude) {
          bearing = calculateBearing(prevLoc.latitude, prevLoc.longitude, loc.latitude, loc.longitude);
        }
      } else if (prevLoc && prevLoc.latitude && prevLoc.longitude) {
        bearing = calculateBearing(prevLoc.latitude, prevLoc.longitude, loc.latitude, loc.longitude);
      }

      const markerColor = 
        isMoving ? '#2563eb' : 
        isStationary ? '#10b981' : 
        status === 'IDLE' ? '#f59e0b' : 
        status === 'OUT_OF_HOURS' ? '#8b5cf6' : '#64748b';

      const vehicleSVG = vehicleMode === 'cab' 
        ? getCabSVG('#2563eb', bearing) 
        : getBikeSVG('#2563eb', bearing);

      const customIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
            ${isMoving ? `
              <!-- Multi-tier Pulsing Radar Waves (Uber / Rapido style) -->
              <div style="
                position: absolute;
                width: 68px;
                height: 68px;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.22);
                border: 2px solid rgba(59, 130, 246, 0.7);
                animation: pingRadar 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                position: absolute;
                width: 58px;
                height: 58px;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.15);
                animation: pingRadar 1.6s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s;
              "></div>
            ` : ''}

            <!-- Center Vehicle / Avatar Circle with active Engine Vibration -->
            ${isMoving ? `
              <div class="vehicle-rotator" style="transform: rotate(${Math.round(bearing)}deg); transition: transform 0.25s ease-out; display: flex; align-items: center; justify-content: center; z-index: 2;">
                <div class="vehicle-engine-vibe" style="display: flex; align-items: center; justify-content: center;">
                  ${vehicleSVG}
                </div>
              </div>
            ` : `
              <div style="
                background: ${markerColor};
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 3.5px solid #ffffff;
                box-shadow: 0 6px 18px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 13px;
                font-family: system-ui, -apple-system, sans-serif;
                position: relative;
                z-index: 2;
              ">
                ${ae.name ? ae.name.substring(0, 2).toUpperCase() : 'AE'}
                ${isStationary ? `
                  <span style="
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 12px;
                    height: 12px;
                    background: #10b981;
                    border: 2.5px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #10b981;
                  "></span>
                ` : ''}
              </div>
            `}

            <!-- Floating Status Badge Pill Below Pin -->
            <div style="
              position: absolute;
              bottom: -18px;
              left: 50%;
              transform: translateX(-50%);
              white-space: nowrap;
              background: #0f172a;
              color: ${isMoving ? '#60a5fa' : markerColor};
              border: 1px solid ${isMoving ? '#3b82f6' : markerColor + '60'};
              font-size: 9.5px;
              font-weight: 800;
              padding: 1.5px 6px;
              border-radius: 6px;
              box-shadow: 0 3px 10px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              gap: 4px;
              z-index: 3;
            ">
              ${isMoving ? `
                <span style="width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; animation: pulse 1s infinite; display: inline-block;"></span>
                ${vehicleMode === 'cab' ? '🚗' : '🛵'} ${loc.speed && loc.speed > 0.5 ? `MOVING • ${(loc.speed * 3.6).toFixed(0)} km/h` : 'MOVING'}
              ` : (
                isStationary ? '📍 AT SITE' : status === 'IDLE' ? '⏳ IDLE' : status === 'OUT_OF_HOURS' ? 'OFF-HRS' : 'OFFLINE'
              )}
            </div>
          </div>
        `,
        iconSize: [56, 56],
        iconAnchor: [28, 28]
      });

      const lastActiveTime = loc.createdAt 
        ? new Date(loc.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 210px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <h4 style="margin: 0; font-weight: 800; font-size: 14px; color: #0f172a;">${ae.name}</h4>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; background: ${markerColor}15; color: ${markerColor}; border: 1px solid ${markerColor}40;">
              ${isMoving ? (vehicleMode === 'cab' ? '🚗 CAB EN ROUTE' : '🛵 BIKE EN ROUTE') : isStationary ? '📍 AT SITE' : status}
            </span>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${ae.designation || 'Area Executive'}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #334155; line-height: 1.5;">
            <div><strong>📞 Phone:</strong> ${ae.phone || 'N/A'}</div>
            <div><strong>🔋 Battery:</strong> ${loc.batteryLevel != null ? loc.batteryLevel + '%' : 'N/A'}</div>
            <div><strong>🕒 Last Ping:</strong> ${lastActiveTime} IST</div>
            <div><strong>🚦 Status:</strong> ${isMoving ? 'In Transit / Moving' : isStationary ? 'Stationary (At Site/Visit)' : status}</div>
            ${loc.speed ? `<div><strong>⚡ Speed:</strong> ${(loc.speed * 3.6).toFixed(1)} km/h</div>` : ''}
            ${item.siteSignIns && item.siteSignIns.length > 0 ? (
              `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">` +
              item.siteSignIns.map(s => `<div><strong>🏢 Site ${s.siteNumber}:</strong> ${s.siteName} (${s.status === 'COMPLETED' ? 'Done' : 'Active'})</div>`).join('') +
              `</div>`
            ) : item.siteSignIn ? `<div><strong>🏢 Site 1:</strong> ${item.siteSignIn.siteName}</div>` : ''}
          </div>
        </div>
      `;

      // Check if marker already exists for this AE
      const existingMarker = markersRef.current[ae.id];
      if (existingMarker) {
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);

        const currentPos = existingMarker.getLatLng();
        const dist = Math.hypot(currentPos.lat - loc.latitude, currentPos.lng - loc.longitude);
        if (dist > 0.00001) {
          // Smoothly animate vehicle motion down the road with dead-reckoning
          animateVehicleMotion(
            ae.id,
            existingMarker,
            [currentPos.lat, currentPos.lng],
            latLng,
            isMoving,
            loc.speed || 0,
            bearing
          );
        } else if (!isMoving) {
          existingMarker.setLatLng(latLng);
        }
      } else {
        const newMarker = window.L.marker(latLng, { 
          icon: customIcon,
          zIndexOffset: isMoving ? 500 : isStationary ? 200 : 0
        }).addTo(leafletMap.current);
        newMarker.bindPopup(popupContent);
        markersRef.current[ae.id] = newMarker;
      }

      // If this is the selected AE, dynamically extend the solid road route polyline under the vehicle wheels
      if (selectedAE && selectedAE.user.id === ae.id && polylineRef.current && isMoving) {
        const currentPath = polylineRef.current.getLatLngs();
        if (currentPath && currentPath.length > 0) {
          const lastPoint = currentPath[currentPath.length - 1];
          const distFromLast = getDistanceMeters(lastPoint.lat, lastPoint.lng, loc.latitude, loc.longitude);
          if (distFromLast >= 8) {
            polylineRef.current.addLatLng(latLng);
            if (casingPolylineRef.current) {
              casingPolylineRef.current.addLatLng(latLng);
            }
          }
        }
      }
    });

    // Remove obsolete markers for employees not in current itemsToRender
    Object.keys(markersRef.current).forEach((empId) => {
      if (!currentEmployeeIds.has(Number(empId))) {
        if (markerAnimationsRef.current[empId]) {
          cancelAnimationFrame(markerAnimationsRef.current[empId]);
          delete markerAnimationsRef.current[empId];
        }
        markersRef.current[empId].remove();
        delete markersRef.current[empId];
      }
    });

    // Remove obsolete Site markers
    Object.keys(siteMarkersRef.current).forEach((siteKey) => {
      if (!currentSiteKeys.has(siteKey)) {
        siteMarkersRef.current[siteKey].remove();
        delete siteMarkersRef.current[siteKey];
      }
    });

    if (bounds.length > 0 && !selectedAE) {
      leafletMap.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }

    if (isFollowMode && selectedAE?.latestLocation?.latitude) {
      leafletMap.current.panTo([selectedAE.latestLocation.latitude, selectedAE.latestLocation.longitude], { animate: true, duration: 0.5 });
    }

    // Guarantee full tile coverage
    setTimeout(() => {
      leafletMap.current?.invalidateSize();
    }, 100);
  }, [liveData, vehicleMode, selectedAE, isFollowMode]);

  // Reset selection & show overall view of all executives and all sites on map
  const handleShowAll = () => {
    setSelectedAE(null);
    setSelectedAESiteSignIn(null);
    setSelectedAESiteSignIns([]);
    setSelectedAEAssignment(null);
    clearMapRoute();
    setHistoryLogs([]);
    setSnappedPathCoords([]);
    setRoadDistanceKm(null);
    setIsRoadSnapped(false);
    setDetectedStopsList([]);

    // Fit map bounds to show all active employees if any exist
    if (leafletMap.current && liveData.length > 0) {
      const validPoints = liveData
        .filter(i => i.latestLocation?.latitude && i.latestLocation?.longitude)
        .map(i => [i.latestLocation.latitude, i.latestLocation.longitude]);
      if (validPoints.length > 0) {
        leafletMap.current.fitBounds(validPoints, { padding: [50, 50], maxZoom: 15 });
      }
    }
    toast.info('Viewing all field executives on map');
  };

  // Focus single AE on map & isolate their data alone (hiding all other executives)
  const handleSelectAE = (aeItem) => {
    if (selectedAE?.user?.id === aeItem.user.id) {
      // Re-focus camera if already selected
      const loc = aeItem.latestLocation;
      if (loc?.latitude && loc?.longitude && leafletMap.current) {
        leafletMap.current.flyTo([loc.latitude, loc.longitude], 17, { duration: 1.0 });
        markersRef.current[aeItem.user.id]?.openPopup();
      }
      return;
    }

    setSelectedAE(aeItem);
    setSelectedAESiteSignIn(aeItem.siteSignIn || null);
    setSelectedAESiteSignIns(aeItem.siteSignIns || (aeItem.siteSignIn ? [aeItem.siteSignIn] : []));
    setSelectedAEAssignment(aeItem.activeAssignment || null);
    // On mobile, switch to map view when an AE is tapped
    setMobileTab('map');

    // Immediately remove previous employee's route & markers so old paths don't linger
    clearMapRoute();
    setHistoryLogs([]);
    setSnappedPathCoords([]);
    setRoadDistanceKm(null);
    setIsRoadSnapped(false);
    setDetectedStopsList([]);

    const loc = aeItem.latestLocation;
    if (loc && loc.latitude && loc.longitude && leafletMap.current) {
      // Zoom deeply into the employee's current area (street level zoom 17)
      leafletMap.current.flyTo([loc.latitude, loc.longitude], 17, { duration: 1.2 });
      if (markersRef.current[aeItem.user.id]) {
        setTimeout(() => {
          markersRef.current[aeItem.user.id]?.openPopup();
        }, 500);
      }
    }
    // Auto-fetch & trace route for selected AE
    fetchRouteHistory(aeItem.user.id, selectedDate);
  };

  // Fetch and trace history path for selected AE
  const fetchRouteHistory = async (aeUserId, dateToFetch = null) => {
    const targetDate = dateToFetch || selectedDate;
    setLoadingHistory(true);

    // Clean up previous polyline, casing, & markers immediately
    clearMapRoute();

    try {
      const res = await axios.get(`${API_BASE}/location/history/${aeUserId}?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const logs = res.data.logs || [];
      setHistoryLogs(logs);

      if (res.data.siteSignIns) {
        setSelectedAESiteSignIns(res.data.siteSignIns);
      }
      if (res.data.siteSignIn) {
        setSelectedAESiteSignIn(res.data.siteSignIn);
      }
      if (res.data.activeAssignment) {
        setSelectedAEAssignment(res.data.activeAssignment);
      }

      // Clean up previous polyline & markers again before rendering new route
      clearMapRoute();

      if (logs.length > 0 && leafletMap.current && window.L) {
        // Road-snapped street navigation route (following actual city streets)
        const snapped = await getRoadSnappedRoute(logs);
        const pathCoords = snapped.pathCoords;
        setSnappedPathCoords(pathCoords);
        setRoadDistanceKm(snapped.roadDistanceKm);
        setIsRoadSnapped(snapped.isSnapped);

        // Draw street route: Outer glow casing + vibrant navigation blue
        casingPolylineRef.current = window.L.polyline(pathCoords, {
          color: '#1e40af',
          weight: 8,
          opacity: 0.35,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(leafletMap.current);

        polylineRef.current = window.L.polyline(pathCoords, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(leafletMap.current);

        // Add Directional Arrows along the actual road segments
        if (pathCoords.length > 1) {
          const arrowCount = Math.min(8, Math.max(3, Math.floor(pathCoords.length / 15)));
          const step = Math.max(1, Math.floor(pathCoords.length / arrowCount));
          for (let i = 0; i < pathCoords.length - 1; i += step) {
            const p1 = pathCoords[i];
            const p2 = pathCoords[i + 1];
            const y = Math.sin((p2[1] - p1[1]) * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180);
            const x = Math.cos(p1[0] * Math.PI / 180) * Math.sin(p2[0] * Math.PI / 180) -
                      Math.sin(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.cos((p2[1] - p1[1]) * Math.PI / 180);
            const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

            const midLat = (p1[0] + p2[0]) / 2;
            const midLng = (p1[1] + p2[1]) / 2;

            const arrowIcon = window.L.divIcon({
              className: 'custom-dir-arrow',
              html: `
                <div style="transform: rotate(${bearing}deg); display: flex; align-items: center; justify-content: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1d4ed8" stroke="#ffffff" stroke-width="2" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
                    <polygon points="12,2 22,22 12,17 2,22" />
                  </svg>
                </div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            });
            const arrowMarker = window.L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(leafletMap.current);
            historyMarkersRef.current.push(arrowMarker);
          }
        }

        // Add Start marker (Green circle - Site Sign-in / Departure)
        const startPoint = logs[0];
        const startMarker = window.L.circleMarker([startPoint.latitude, startPoint.longitude], {
          radius: 8,
          color: '#ffffff',
          weight: 2.5,
          fillColor: '#10b981',
          fillOpacity: 1
        }).addTo(leafletMap.current).bindPopup(`
          <div style="font-family: system-ui; padding: 4px;">
            <b style="color: #059669; font-size: 12px;">🟢 Departure Point (Start)</b><br>
            Time: ${new Date(startPoint.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST
          </div>
        `);
        // Add click handler on start marker to zoom in deep
        startMarker.on('click', () => {
          leafletMap.current?.flyTo([startPoint.latitude, startPoint.longitude], 18, { duration: 0.8 });
        });
        historyMarkersRef.current.push(startMarker);

        // Add End marker (Red circle / Blue if currently moving)
        if (logs.length > 1) {
          const endPoint = logs[logs.length - 1];
          const isCurrentlyMoving = selectedAE?.status === 'MOVING' || selectedAE?.isMoving;
          const endMarker = window.L.circleMarker([endPoint.latitude, endPoint.longitude], {
            radius: 8,
            color: '#ffffff',
            weight: 2.5,
            fillColor: isCurrentlyMoving ? '#2563eb' : '#ef4444',
            fillOpacity: 1
          }).addTo(leafletMap.current).bindPopup(`
            <div style="font-family: system-ui; padding: 4px;">
              <b style="color: ${isCurrentlyMoving ? '#2563eb' : '#dc2626'}; font-size: 12px;">
                ${isCurrentlyMoving ? '🔵 Live Moving Position' : '🔴 Last Logged Fix'}
              </b><br>
              Time: ${new Date(endPoint.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </div>
          `);
          endMarker.on('click', () => {
            leafletMap.current?.flyTo([endPoint.latitude, endPoint.longitude], 18, { duration: 0.8 });
          });
          historyMarkersRef.current.push(endMarker);
        }

        // Add Sequential Site Pins (Site 1, Site 2, Site 3...) matching Attendance display
        const siteSignIns = (res.data.siteSignIns && res.data.siteSignIns.length > 0)
          ? res.data.siteSignIns
          : (res.data.siteSignIn ? [res.data.siteSignIn] : (selectedAE?.siteSignIns || (selectedAE?.siteSignIn ? [selectedAE.siteSignIn] : [])));

        siteSignIns.forEach((site) => {
          if (!site || !site.latitude || !site.longitude) return;
          const siteNum = site.siteNumber || 1;
          const isCompleted = site.isCompleted || site.status === 'COMPLETED';

          const sitePinIcon = window.L.divIcon({
            className: `site-history-pin-${siteNum}`,
            html: `
              <div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <div style="
                  position: absolute;
                  width: 54px;
                  height: 54px;
                  border-radius: 50%;
                  background: ${isCompleted ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.25)'};
                  border: 1.5px solid ${isCompleted ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'};
                  ${isCompleted ? '' : 'animation: pingRadar 2s infinite;'}
                "></div>
                <div style="
                  background: ${isCompleted ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)'};
                  width: 42px;
                  height: 42px;
                  border-radius: 12px;
                  border: 3px solid #ffffff;
                  box-shadow: 0 4px 14px ${isCompleted ? 'rgba(16, 185, 129, 0.45)' : 'rgba(217, 119, 6, 0.45)'};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 20px;
                  z-index: 2;
                ">
                  ${isCompleted ? '✅' : '🏢'}
                </div>
                <div style="
                  position: absolute;
                  bottom: -18px;
                  left: 50%;
                  transform: translateX(-50%);
                  white-space: nowrap;
                  background: #0f172a;
                  color: ${isCompleted ? '#a7f3d0' : '#fde68a'};
                  border: 1.5px solid ${isCompleted ? '#10b981' : '#f59e0b'};
                  font-size: 9.5px;
                  font-weight: 800;
                  padding: 2px 7px;
                  border-radius: 6px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                  z-index: 4;
                ">
                  Site ${siteNum}: ${site.siteName} ${isCompleted ? '(Done)' : '(Active)'}
                </div>
              </div>
            `,
            iconSize: [68, 68],
            iconAnchor: [34, 34]
          });

          const siteMarker = window.L.marker([site.latitude, site.longitude], {
            icon: sitePinIcon,
            zIndexOffset: 450 + siteNum
          }).addTo(leafletMap.current).bindPopup(`
            <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
              <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: ${isCompleted ? '#059669' : '#b45309'};">
                ${isCompleted ? '✅' : '🏢'} Site ${siteNum}: ${site.siteName} ${isCompleted ? '(Completed)' : '(Active)'}
              </h4>
              <div style="background: ${isCompleted ? '#ecfdf5' : '#fffbeb'}; border: 1px solid ${isCompleted ? '#d1fae5' : '#fef3c7'}; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: ${isCompleted ? '#065f46' : '#92400e'}; line-height: 1.5;">
                <div><strong>🕒 Signed In:</strong> ${site.signedInAt ? new Date(site.signedInAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Logged In'} IST</div>
                ${site.address ? `<div><strong>📍 Address:</strong> ${site.address}</div>` : ''}
                ${site.checkoutTime ? `<div><strong>📤 Departed:</strong> ${new Date(site.checkoutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST</div>` : '<div><strong>⚡ Status:</strong> Currently Active Site</div>'}
              </div>
            </div>
          `);
          siteMarker.on('click', () => {
            leafletMap.current?.flyTo([site.latitude, site.longitude], 18, { duration: 0.8 });
          });
          historyMarkersRef.current.push(siteMarker);
        });

        // Add Place B Destination Pin if assignment has coordinates
        const destData = res.data.activeAssignment || selectedAE?.activeAssignment;
        if (destData && destData.latitude && destData.longitude) {
          const destPinIcon = window.L.divIcon({
            className: 'place-b-destination-pin',
            html: `
              <div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center;">
                <div style="
                  background: linear-gradient(135deg, #ef4444, #b91c1c);
                  width: 40px;
                  height: 40px;
                  border-radius: 12px;
                  border: 3px solid #ffffff;
                  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.45);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 18px;
                  z-index: 2;
                ">
                  🏁
                </div>
                <div style="
                  position: absolute;
                  bottom: -18px;
                  left: 50%;
                  transform: translateX(-50%);
                  white-space: nowrap;
                  background: #0f172a;
                  color: #fca5a5;
                  border: 1.5px solid #ef4444;
                  font-size: 9.5px;
                  font-weight: 800;
                  padding: 2px 7px;
                  border-radius: 6px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                  z-index: 4;
                ">
                  Place B: ${destData.siteName}
                </div>
              </div>
            `,
            iconSize: [68, 68],
            iconAnchor: [34, 34]
          });

          const destMarker = window.L.marker([destData.latitude, destData.longitude], {
            icon: destPinIcon,
            zIndexOffset: 460
          }).addTo(leafletMap.current).bindPopup(`
            <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
              <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #dc2626;">🏁 Place B: ${destData.siteName}</h4>
              <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #991b1b; line-height: 1.5;">
                ${destData.clientName ? `<div><strong>👤 Client:</strong> ${destData.clientName}</div>` : ''}
                ${destData.scheduledTime ? `<div><strong>🕒 Time:</strong> ${destData.scheduledTime}</div>` : ''}
                ${destData.location ? `<div><strong>📍 Location:</strong> ${destData.location}</div>` : ''}
              </div>
            </div>
          `);
          destMarker.on('click', () => {
            leafletMap.current?.flyTo([destData.latitude, destData.longitude], 18, { duration: 0.8 });
          });
          historyMarkersRef.current.push(destMarker);
        }

        // Detect and place Stop markers with durations
        const detectedStops = detectStops(logs);
        setDetectedStopsList(detectedStops);

        detectedStops.forEach((stop) => {
          const stopIcon = window.L.divIcon({
            className: 'custom-stop-pin',
            html: `
              <div style="
                background: linear-gradient(135deg, #f59e0b, #d97706);
                width: 26px;
                height: 26px;
                border-radius: 8px;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 10px;
              ">
                🛑${stop.stopNumber}
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const stopMarker = window.L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
            .addTo(leafletMap.current)
            .bindPopup(`
              <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 170px;">
                <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #b45309;">🛑 Stop #${stop.stopNumber} - Site Visit</h4>
                <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #92400e; line-height: 1.5;">
                  <div><strong>🕒 Duration:</strong> ${stop.durationMins} minutes</div>
                  <div><strong>📥 Arrived:</strong> ${new Date(stop.arrivedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  <div><strong>📤 Departed:</strong> ${new Date(stop.departedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                </div>
              </div>
            `);
          stopMarker.on('click', () => {
            leafletMap.current?.flyTo([stop.latitude, stop.longitude], 18, { duration: 0.8 });
          });
          stopMarkersRef.current.push(stopMarker);
        });

        leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40], maxZoom: 18 });
        const distanceLabel = snapped.roadDistanceKm ? `${snapped.roadDistanceKm} km road route` : `${calculateTotalDistanceKm(logs)} km`;
        toast.info(`Traced ${logs.length} GPS fixes (${distanceLabel}, ${detectedStops.length} stops) for ${targetDate}`);
      } else {
        clearMapRoute();
        setDetectedStopsList([]);
        toast.warning(`No location logs found between 7:00 AM and 8:00 PM IST on ${targetDate}`);
      }
    } catch (err) {
      console.error('Failed to load location history:', err);
      toast.error('Could not load location route history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClearRoute = () => {
    clearMapRoute();
    setHistoryLogs([]);
    setSnappedPathCoords([]);
    setRoadDistanceKm(null);
    setIsRoadSnapped(false);
    setDetectedStopsList([]);
    setSelectedAESiteSignIn(null);
    setSelectedAESiteSignIns([]);
    setSelectedAEAssignment(null);
    toast.info('Route path cleared from map.');
  };


  // Status Priority Rank: Active first (Moving -> Stationary) -> Idle second -> Offline last
  const getStatusPriority = (item) => {
    const isMoving = item.isMoving || item.status === 'MOVING';
    if (isMoving) return 1; // Active: Moving (Top Priority)
    const isStationary = item.status === 'STATIONARY' || item.status === 'ONLINE' || (!isMoving && item.status !== 'IDLE' && item.status !== 'OFFLINE' && item.status !== 'OUT_OF_HOURS');
    if (isStationary) return 2; // Active: At Site / Online
    if (item.status === 'IDLE') return 3; // Idle second
    if (item.status === 'OFFLINE') return 4; // Offline last
    if (item.status === 'OUT_OF_HOURS') return 5; // Out of hours last
    return 6;
  };

  // Filter and Sort AEs: Active first, Idle second, Offline last
  const filteredData = liveData
    .filter(item => {
      const matchesSearch = item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.user.phone && item.user.phone.includes(searchQuery)) ||
                            (item.user.designation && item.user.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      const isMoving = item.isMoving || item.status === 'MOVING';
      const isStationary = item.status === 'STATIONARY' || item.status === 'ONLINE' || (!isMoving && item.status !== 'IDLE' && item.status !== 'OFFLINE' && item.status !== 'OUT_OF_HOURS');

      let matchesStatus = false;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'MOVING') {
        matchesStatus = isMoving;
      } else if (statusFilter === 'STATIONARY') {
        matchesStatus = isStationary;
      } else if (statusFilter === 'IDLE') {
        matchesStatus = item.status === 'IDLE';
      } else if (statusFilter === 'OFFLINE') {
        matchesStatus = item.status === 'OFFLINE';
      } else if (statusFilter === 'OUT_OF_HOURS') {
        matchesStatus = item.status === 'OUT_OF_HOURS';
      } else {
        matchesStatus = item.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Primary: Active (Moving -> Stationary) -> Idle -> Offline
      const pA = getStatusPriority(a);
      const pB = getStatusPriority(b);
      if (pA !== pB) return pA - pB;

      // Secondary: Most recent location timestamp first
      const timeA = a.latestLocation?.createdAt ? new Date(a.latestLocation.createdAt).getTime() : 0;
      const timeB = b.latestLocation?.createdAt ? new Date(b.latestLocation.createdAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;

      // Tertiary: Alphabetical name
      return (a.user?.name || '').localeCompare(b.user?.name || '');
    });

  const movingCount = liveData.filter(i => i.isMoving || i.status === 'MOVING').length;
  const stationaryCount = liveData.filter(i => (i.status === 'STATIONARY' || i.status === 'ONLINE') && !i.isMoving).length;
  const idleCount = liveData.filter(i => i.status === 'IDLE').length;
  const offlineCount = liveData.filter(i => i.status === 'OFFLINE').length;

  if (!isAuthorizedManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1700px] mx-auto min-h-screen text-slate-100 font-sans">
      <style>{`
        @keyframes pingRadar {
          0% { transform: scale(0.92); opacity: 0.85; }
          70% { transform: scale(1.65); opacity: 0; }
          100% { transform: scale(1.65); opacity: 0; }
        }
        @keyframes vehicleDriveVibe {
          0% { transform: translateY(0px) scale(1); }
          25% { transform: translateY(-0.8px) scale(1.01); }
          50% { transform: translateY(0.4px) scale(0.99); }
          75% { transform: translateY(-0.6px) scale(1.01); }
          100% { transform: translateY(0px) scale(1); }
        }
        .vehicle-engine-vibe {
          animation: vehicleDriveVibe 0.22s infinite linear;
        }
        @keyframes headlightFlicker {
          0%, 100% { opacity: 0.65; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.95; transform: translateX(-50%) scale(1.08); filter: blur(1.5px); }
        }
        .headlight-beam {
          animation: headlightFlicker 0.6s infinite ease-in-out;
        }
      `}</style>
      
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/95 border border-slate-800/90 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Compass size={24} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">AE Live Tracker</h1>
                
                {/* 7 AM - 8 PM IST Tracking Window Badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${
                  trackingInfo.isCurrentlyInWindow
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${trackingInfo.isCurrentlyInWindow ? 'bg-emerald-400 animate-ping' : 'bg-purple-400'}`} />
                  {trackingInfo.isCurrentlyInWindow ? 'Live Window: 7 AM – 8 PM IST' : 'Tracking Paused: Resumes 7 AM IST'}
                </span>

                {/* Live Clock Pill */}
                {currentISTTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    <Clock size={11} className="text-blue-400" />
                    {currentISTTime} IST
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Real-time field monitoring active strictly within 7:00 AM – 8:00 PM IST (Offset sync applied)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleManualPing}
            disabled={isPingingNow}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
            title="Transmit immediate device coordinate ping to server"
          >
            <Navigation size={14} className={isPingingNow ? 'animate-pulse' : ''} />
            <span>{isPingingNow ? 'Locating...' : 'Ping My GPS'}</span>
          </button>

          <button
            onClick={generateActivationCode}
            disabled={isGeneratingCode}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            <Smartphone size={14} />
            <span>{isGeneratingCode ? 'Generating...' : 'Get APK Code'}</span>
          </button>

          <button
            onClick={() => setShowApkDownloadModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white transition-all active:scale-95 shadow-lg shadow-blue-600/25"
            title="Download PeopleDesk and AE Manager APK builds"
          >
            <Download size={14} />
            <span>Download APKs</span>
          </button>

          <button
            onClick={() => fetchLiveData(true)}
            disabled={refreshing}
            className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Refresh GPS Feed"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid - 6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800/90 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total AEs</p>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{liveData.length}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/50">
            <User size={18} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg ring-1 ring-blue-500/20">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">Moving Now</p>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-blue-400 mt-1">{movingCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Car size={18} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">At Site</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{stationaryCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Idle (&lt; 1h)</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{idleCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Offline</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-400 mt-1">{offlineCount}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700/50">
            <XCircle size={18} />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-purple-500/20 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">Window</p>
            <h3 className="text-xs sm:text-sm font-black text-purple-300 mt-1">7 AM – 8 PM</h3>
            <span className="text-[9px] text-slate-400">IST Daily</span>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Moon size={18} />
          </div>
        </div>
      </div>

      {/* Mobile Tab Segmented Switcher (Visible only below lg breakpoint) */}
      <div className="flex lg:hidden bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'map'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin size={14} />
          <span>Map View</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'list'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User size={14} />
          <span>AE Directory ({filteredData.length})</span>
        </button>
      </div>

      {/* Main Tracker Workspace (Grid on Desktop, Tabbed on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px] lg:h-[calc(100vh-220px)]">
        
        {/* Left Column: AE Directory & Filters (Hidden on mobile if map tab active) */}
        <div className={`lg:col-span-4 bg-slate-900/90 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col shadow-2xl backdrop-blur-xl ${
          mobileTab === 'list' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Search & Filter Header */}
          <div className="space-y-3 pb-3.5 border-b border-slate-800">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by AE name, phone, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap gap-1 bg-slate-800/40 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
              {['ALL', 'MOVING', 'STATIONARY', 'IDLE', 'OFFLINE', 'OUT_OF_HOURS'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 min-w-[45px] py-1.5 px-1.5 rounded-lg transition-all text-center ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {st === 'MOVING' ? '🚗 MOVING' : st === 'STATIONARY' ? '📍 SITE' : st === 'OUT_OF_HOURS' ? 'OFF-HRS' : st}
                </button>
              ))}
            </div>
          </div>

          {/* AE Cards Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Show All Executives Card (Overall View) */}
            <button
              onClick={handleShowAll}
              className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-left ${
                !selectedAE
                  ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-600/10 ring-1 ring-blue-500/40 text-white'
                  : 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!selectedAE ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-800 text-slate-400'}`}>
                  <Users size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black tracking-wide truncate">All Executives & Sites</h4>
                  <p className="text-[10px] text-slate-400 truncate">Show overall fleet & all pins</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border shrink-0 ${
                !selectedAE ? 'bg-blue-500/30 text-blue-300 border-blue-400/40' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {liveData.length} ALL
              </span>
            </button>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium animate-pulse flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-blue-400" />
                <span>Loading active AE GPS feeds...</span>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <p>No Area Executives match your filter criteria.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                  className="px-3 py-1 bg-slate-800 text-blue-400 rounded-lg text-[11px] font-bold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredData.map((item) => {
                const { user: ae, latestLocation: loc, status } = item;
                const isSelected = selectedAE?.user?.id === ae.id;

                const isItemMoving = item.isMoving || status === 'MOVING';
                const isItemStationary = status === 'STATIONARY' || status === 'ONLINE' || (!isItemMoving && status !== 'IDLE' && status !== 'OFFLINE' && status !== 'OUT_OF_HOURS');

                const statusBg = 
                  isItemMoving ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                  isItemStationary ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                  status === 'IDLE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                  status === 'OUT_OF_HOURS' ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' :
                  'bg-slate-800 text-slate-400 border-slate-700/60';

                const statusDotColor = 
                  isItemMoving ? 'bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-pulse' :
                  isItemStationary ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' :
                  status === 'IDLE' ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' :
                  status === 'OUT_OF_HOURS' ? 'bg-purple-400' :
                  'bg-slate-500';

                const statusLabel = 
                  isItemMoving ? 'MOVING' :
                  isItemStationary ? 'AT SITE' :
                  status === 'OUT_OF_HOURS' ? 'OFF-HOURS' : status;

                return (
                  <div
                    key={ae.id}
                    onClick={() => handleSelectAE(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40'
                        : 'bg-slate-800/35 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColor}`} />
                        <h4 className="text-sm font-bold text-white truncate">{ae.name}</h4>
                      </div>
                      
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border shrink-0 ${statusBg}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="truncate text-slate-400">{ae.designation || 'Area Executive'}</span>
                        {ae.phone && (
                          <a 
                            href={`tel:${ae.phone}`} 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-slate-400 hover:text-blue-400 font-semibold"
                          >
                            <Phone size={11} className="text-blue-400" />
                            <span>{ae.phone}</span>
                          </a>
                        )}
                      </div>

                      {loc && loc.createdAt ? (
                        <div className="flex items-center justify-between pt-1.5 text-[11px] border-t border-slate-800/90 text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            <span>{new Date(loc.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST</span>
                          </span>

                          <div className="flex items-center gap-2.5">
                            {loc.batteryLevel != null && (
                              <span className="flex items-center gap-1 font-bold text-slate-300">
                                <Battery size={13} className={loc.batteryLevel < 20 ? 'text-rose-400' : loc.batteryLevel < 50 ? 'text-amber-400' : 'text-emerald-400'} />
                                {loc.batteryLevel}%
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 text-[10px] text-slate-400 italic border-t border-slate-800/90">
                          No GPS pings recorded in 7 AM – 8 PM window today
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Leaflet Interactive Map Container (Hidden on mobile if list tab active) */}
        <div className={`lg:col-span-8 bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-2 sm:p-3 flex flex-col shadow-2xl relative overflow-hidden min-h-[520px] h-[550px] sm:h-[650px] lg:h-full ${
          mobileTab === 'map' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Floating Top Control Bar: Layer Switcher & Vehicle Mode Toggle */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {/* Global Vehicle Mode Switcher (Bike vs Cab) */}
            <div className="flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
              <button
                onClick={() => setVehicleMode('bike')}
                className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  vehicleMode === 'bike' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="Rapido-style Bike / Two-Wheeler Tracking"
              >
                <Bike size={13} />
                <span className="hidden sm:inline">Bike</span>
              </button>
              <button
                onClick={() => setVehicleMode('cab')}
                className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  vehicleMode === 'cab' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'text-slate-300 hover:text-white'
                }`}
                title="Uber-style Cab / Car Tracking"
              >
                <Car size={13} />
                <span className="hidden sm:inline">Cab</span>
              </button>
            </div>

            {/* Map Layer Switcher */}
            <div className="flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
              <button
                onClick={() => changeMapType('google_roadmap')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  mapType === 'google_roadmap' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                🗺️ Map
              </button>
              <button
                onClick={() => changeMapType('google_satellite')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  mapType === 'google_satellite' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                🛰️ Sat
              </button>
              <button
                onClick={() => changeMapType('openstreetmap')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  mapType === 'openstreetmap' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                🌐 OSM
              </button>
            </div>
          </div>

          {/* Floating Route Tracing & Isolation Panel for Selected AE */}
          {selectedAE && (
            <div className="absolute top-4 left-4 z-20 bg-slate-900/95 border border-slate-700/90 p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 max-w-[calc(100%-140px)] sm:max-w-2xl animate-fadeIn">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Viewing Alone:</span>
                  <p className="text-xs font-bold text-white truncate">{selectedAE.user.name}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="text-emerald-400 font-bold">{selectedAESiteSignIns.length || (selectedAESiteSignIn ? 1 : 0)} sites logged</span>
                  {historyLogs.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-blue-300 font-semibold">{roadDistanceKm ? `${roadDistanceKm} km road` : `${calculateTotalDistanceKm(historyLogs)} km`}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">{detectedStopsList.length} stops</span>
                      {isRoadSnapped && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400 font-bold">🛣️ Snapped</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:ml-auto">
                <button
                  onClick={handleShowAll}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 shrink-0 shadow-md"
                  title="Show all field executives and all sites on map"
                >
                  <Users size={13} className="text-blue-400" />
                  <span>Show All</span>
                </button>

                <button
                  onClick={() => {
                    const loc = selectedAE?.latestLocation;
                    if (loc?.latitude && loc?.longitude && leafletMap.current) {
                      leafletMap.current.flyTo([loc.latitude, loc.longitude], 18, { duration: 1.0 });
                      markersRef.current[selectedAE.user.id]?.openPopup();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 shrink-0"
                  title="Deep zoom into current location (Street level)"
                >
                  <Crosshair size={13} />
                  <span className="hidden md:inline">Focus</span>
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (selectedAE) {
                      fetchRouteHistory(selectedAE.user.id, e.target.value);
                    }
                  }}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => fetchRouteHistory(selectedAE.user.id, selectedDate)}
                  disabled={loadingHistory}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all disabled:opacity-50 shrink-0"
                >
                  {loadingHistory ? 'Tracing...' : 'Trace'}
                </button>
                {historyLogs.length > 0 && (
                  <button
                    onClick={handleClearRoute}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Clear path"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Uber / Rapido Style Live Journey Tracking HUD Drawer */}
          {selectedAE && (
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 max-w-2xl mx-auto bg-slate-900/95 border border-slate-700/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl backdrop-blur-2xl text-white animate-fadeIn">
              {/* Header: Vehicle Mode Toggle, AE Profile, Status & Expand/Collapse */}
              <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Vehicle Mode Switcher (Bike vs Cab) */}
                  <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/80 shrink-0">
                    <button
                      onClick={() => setVehicleMode('bike')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        vehicleMode === 'bike'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Switch to Rapido-style Bike/Two-Wheeler Tracking"
                    >
                      <Bike size={13} />
                      <span className="hidden sm:inline">Bike</span>
                    </button>
                    <button
                      onClick={() => setVehicleMode('cab')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        vehicleMode === 'cab'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Switch to Uber-style Cab/Car Tracking"
                    >
                      <Car size={13} />
                      <span className="hidden sm:inline">Cab</span>
                    </button>
                  </div>

                  {/* AE Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-black text-white truncate">{selectedAE.user.name}</h4>
                      {selectedAE.user.phone && (
                        <a
                          href={`tel:${selectedAE.user.phone}`}
                          className="p-1 rounded-md bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-all shrink-0"
                          title="Call Executive"
                        >
                          <Phone size={10} />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{selectedAE.user.designation || 'Area Executive'}</p>
                  </div>
                </div>

                {/* Right Header: Moving Status & HUD Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                    selectedAE.isMoving || selectedAE.status === 'MOVING'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse'
                      : selectedAESiteSignIn && selectedAESiteSignIn.status === 'SIGNED_IN'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : selectedAE.status === 'STATIONARY'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>
                      {selectedAE.isMoving || selectedAE.status === 'MOVING'
                        ? `${vehicleMode === 'cab' ? '🚗 Cab' : '🛵 Bike'} Moving`
                        : selectedAESiteSignIn && selectedAESiteSignIn.status === 'SIGNED_IN'
                          ? `🏢 Site ${selectedAESiteSignIn.siteNumber || 1} Signed In`
                          : selectedAE.status === 'STATIONARY'
                            ? '📍 At Site'
                            : selectedAE.status}
                    </span>
                  </span>

                  <button
                    onClick={() => setIsHudExpanded(!isHudExpanded)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                    title={isHudExpanded ? 'Collapse HUD' : 'Expand HUD'}
                  >
                    {isHudExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              {isHudExpanded && (
                <div className="space-y-3 pt-3">
                  {/* Sequential Journey Stepper ("Where they are going from where") */}
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 space-y-2.5 text-xs max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    {/* Multi-Site Sequential Journey Stepper (Site 1, Site 2, Site 3...) */}
                    {selectedAESiteSignIns && selectedAESiteSignIns.length > 0 ? (
                      selectedAESiteSignIns.map((site, sIdx) => {
                        const isCompleted = site.isCompleted || site.status === 'COMPLETED';
                        return (
                          <div key={site.id || sIdx} className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center shrink-0 mt-0.5">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isCompleted 
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                                  : 'bg-amber-500/20 border-amber-400 text-amber-400 animate-pulse'
                              }`}>
                                <span className="text-[8px] font-black">{isCompleted ? '✓' : site.siteNumber}</span>
                              </div>
                              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/50 to-blue-500/50" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
                                  isCompleted ? 'text-emerald-400' : 'text-amber-400'
                                }`}>
                                  <span>{isCompleted ? '✅' : '🏢'} SITE {site.siteNumber}: {site.siteName}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black border ${
                                    isCompleted 
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}>
                                    {isCompleted ? 'Done' : 'Active'}
                                  </span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {site.signedInAt
                                    ? new Date(site.signedInAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                                    : 'Logged In'}
                                </span>
                              </div>
                              {site.address && (
                                <p className="text-[10px] text-slate-400 truncate">{site.address}</p>
                              )}
                              {site.checkoutTime && (
                                <p className="text-[9.5px] text-emerald-400/90 font-medium">
                                  Departed / Completed: {new Date(site.checkoutTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      /* Fallback Point A if no attendance site logged yet */
                      <div className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center shrink-0 mt-0.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/50 to-blue-500/50" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-[11px] text-emerald-400 uppercase tracking-wider">
                              🟢 MORNING DEPARTURE POINT
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {historyLogs[0]?.createdAt
                                ? new Date(historyLogs[0].createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                                : '07:00 AM'}
                            </span>
                          </div>
                          <p className="text-white font-bold text-[11px] truncate">
                            First GPS logged start fix
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Middle: Where he comes through (Street & Live Movement) */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center shrink-0 mt-0.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedAE.isMoving || selectedAE.status === 'MOVING'
                            ? 'bg-blue-500/20 border-blue-400 text-blue-400 animate-pulse'
                            : 'bg-slate-700/40 border-slate-600 text-slate-400'
                        }`}>
                          <span className="text-[9px]">{vehicleMode === 'cab' ? '🚗' : '🛵'}</span>
                        </div>
                        <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500/50 to-rose-500/50" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-[11px] text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🛣️ COMING THROUGH (LIVE TRANSIT)</span>
                            {selectedAE.latestLocation?.speed && selectedAE.latestLocation.speed > 0.5 ? (
                              <span className="text-blue-300 font-bold">({(selectedAE.latestLocation.speed * 3.6).toFixed(0)} km/h)</span>
                            ) : null}
                          </span>
                          <span className="text-[10px] font-mono text-blue-400 font-bold">
                            {selectedAE.latestLocation?.batteryLevel != null ? `${selectedAE.latestLocation.batteryLevel}% 🔋` : ''}
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium text-[11px] truncate">
                          {selectedAE.latestLocation?.address
                            ? selectedAE.latestLocation.address
                            : isRoadSnapped
                              ? 'City Road Street Route'
                              : 'Active Transit Segment'}
                        </p>
                      </div>
                    </div>

                    {/* Point B: Destination (Scheduled Site Assignment or Next Target) */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center shrink-0 mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center">
                          <Flag size={9} className="text-rose-400" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-[11px] text-rose-400 uppercase tracking-wider">
                            🔴 DESTINATION / TARGET SITE
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {selectedAEAssignment?.scheduledTime || 'Scheduled Today'}
                          </span>
                        </div>
                        <p className="text-white font-bold text-[11px] truncate">
                          {selectedAEAssignment
                            ? `Site: ${selectedAEAssignment.siteName}`
                            : selectedAESiteSignIn?.checkoutSiteName
                              ? `Next Site: ${selectedAESiteSignIn.checkoutSiteName}`
                              : 'Target Site Inspection'}
                        </p>
                        {selectedAEAssignment?.clientName && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Client: {selectedAEAssignment.clientName} {selectedAEAssignment.location ? `• ${selectedAEAssignment.location}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trip Summary Metrics Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80 text-[10px] font-bold">
                    <span className="text-blue-400 font-mono">
                      🛣️ {roadDistanceKm ? `${roadDistanceKm} km road` : `${calculateTotalDistanceKm(historyLogs)} km`}
                    </span>
                    <span className="text-slate-400">
                      📍 {historyLogs.length} GPS fixes
                    </span>
                    <span className="text-amber-400">
                      🛑 {detectedStopsList.length} stops
                    </span>
                    <span className="text-emerald-400 font-bold">
                      🏢 {selectedAESiteSignIns.length} sites logged
                    </span>
                  </div>

                  {/* Live Tracking Controls (Follow Camera, Focus Vehicle, Show All, Call AE) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Camera Follow Mode Toggle */}
                    <button
                      onClick={() => setIsFollowMode(!isFollowMode)}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isFollowMode
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="Auto-center map camera on moving vehicle"
                    >
                      <Crosshair size={13} className={isFollowMode ? 'animate-spin-slow' : ''} />
                      <span>{isFollowMode ? 'Camera Following' : 'Follow Camera'}</span>
                    </button>

                    {/* Focus on Current Vehicle */}
                    <button
                      onClick={() => {
                        const loc = selectedAE?.latestLocation;
                        if (loc?.latitude && loc?.longitude && leafletMap.current) {
                          leafletMap.current.flyTo([loc.latitude, loc.longitude], 18, { duration: 1.0 });
                          markersRef.current[selectedAE.user.id]?.openPopup();
                        }
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white text-xs font-bold transition-all border border-slate-700"
                      title="Zoom directly to vehicle location"
                    >
                      <Navigation size={13} />
                      <span>Focus Vehicle</span>
                    </button>

                    {/* Show All Executives Button */}
                    <button
                      onClick={handleShowAll}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700"
                      title="Show all field executives and sites on map"
                    >
                      <Users size={13} className="text-blue-400" />
                      <span>Show All Executives</span>
                    </button>

                    {/* Call Executive */}
                    {selectedAE.user.phone && (
                      <a
                        href={`tel:${selectedAE.user.phone}`}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all"
                        title="Direct phone call"
                      >
                        <Phone size={13} />
                        <span>Call AE</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaflet Map DOM Element */}
          <div 
            ref={mapRef} 
            className="w-full flex-1 min-h-[480px] h-full rounded-xl sm:rounded-2xl z-10 border border-slate-800/90 overflow-hidden bg-slate-950 shadow-inner" 
          />
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
              ⏱️ Valid for 10 minutes. Device will sync Call Logs and live GPS pings between 7:00 AM and 8:00 PM IST.
            </p>

            <div className="pt-2 border-t border-slate-800 space-y-2 text-left">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Direct APK Downloads</p>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`${API_BASE}/downloads/peopledesk-apk`}
                  download="PeopleDesk-latest.apk"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-600/20 transition-all text-center"
                >
                  <Download size={13} />
                  <span>PeopleDesk APK</span>
                </a>
                <a
                  href={`${API_BASE}/downloads/ae-manager-apk`}
                  download="AEManager-latest.apk"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 transition-all text-center"
                >
                  <Download size={13} />
                  <span>AE Manager APK</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowCodeModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modal: Dual APK Downloads */}
      <ApkDownloadModal isOpen={showApkDownloadModal} onClose={() => setShowApkDownloadModal(false)} />
    </div>
  );
};

export default AELiveTracker;
