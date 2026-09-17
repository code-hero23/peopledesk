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
  Car
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

  if (!isAuthorizedManager) {
    return <Navigate to="/dashboard" replace />;
  }
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

  // Playback animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const historyMarkersRef = useRef([]);
  const stopMarkersRef = useRef([]);
  const playbackMarkerRef = useRef(null);

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

  const [mapType, setMapType] = useState('google_roadmap');
  const tileLayerRef = useRef(null);

  const getTileConfig = (type) => {
    if (type === 'google_satellite') {
      return {
        url: 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
        options: { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '&copy; Google Maps' }
      };
    }
    if (type === 'google_roadmap') {
      return {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        options: { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '&copy; Google Maps' }
      };
    }
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: { attribution: '&copy; OpenStreetMap contributors' }
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
        preferCanvas: true
      }).setView([13.0827, 80.2707], 11);

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
      if (Array.isArray(res.data)) {
        setLiveData(res.data);
      } else if (res.data && res.data.liveData) {
        setLiveData(res.data.liveData || []);
        if (res.data.trackingWindow) {
          setTrackingInfo(res.data.trackingWindow);
        }
      }
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

      const isMoving = item.isMoving || status === 'MOVING';
      const isStationary = status === 'STATIONARY' || status === 'ONLINE' || (!isMoving && status !== 'IDLE' && status !== 'OFFLINE' && status !== 'OUT_OF_HOURS');

      const markerColor = 
        isMoving ? '#2563eb' : 
        isStationary ? '#10b981' : 
        status === 'IDLE' ? '#f59e0b' : 
        status === 'OUT_OF_HOURS' ? '#8b5cf6' : '#64748b';

      const customIcon = window.L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${isMoving ? `
              <!-- Pulsing Radar Wave (Swiggy / Uber style) -->
              <div style="
                position: absolute;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.25);
                border: 1.5px solid rgba(59, 130, 246, 0.6);
                animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
            ` : ''}
            <div style="
              background-color: ${markerColor};
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: 11px;
              font-family: sans-serif;
              position: relative;
              z-index: 2;
            ">
              ${isMoving ? '🚗' : (ae.name ? ae.name.substring(0, 2).toUpperCase() : 'AE')}
              ${(isMoving || isStationary) ? `<span style="position:absolute; top:-2px; right:-2px; width:10px; height:10px; background:${isMoving ? '#3b82f6' : '#10b981'}; border:2px solid white; border-radius:50%;"></span>` : ''}
            </div>
            ${isMoving ? `
              <div style="
                position: absolute;
                bottom: -16px;
                left: 50%;
                transform: translateX(-50%);
                white-space: nowrap;
                background: #0f172a;
                color: #60a5fa;
                border: 1px solid #3b82f6;
                font-size: 9px;
                font-weight: 800;
                padding: 1px 5px;
                border-radius: 4px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                gap: 3px;
                z-index: 3;
              ">
                <span style="width: 4px; height: 4px; border-radius: 50%; background: #3b82f6; display: inline-block;"></span>
                MOVING
              </div>
            ` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = window.L.marker(latLng, { icon: customIcon }).addTo(leafletMap.current);
      
      const lastActiveTime = loc.createdAt 
        ? new Date(loc.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
        : 'N/A';

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; min-width: 190px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <h4 style="margin: 0; font-weight: 800; font-size: 14px; color: #0f172a;">${ae.name}</h4>
            <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; background: ${markerColor}15; color: ${markerColor}; border: 1px solid ${markerColor}40;">
              ${isMoving ? '🚗 MOVING' : isStationary ? '📍 AT SITE' : status}
            </span>
          </div>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${ae.designation || 'Area Executive'}</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #334155; line-height: 1.5;">
            <div><strong>📞 Phone:</strong> ${ae.phone || 'N/A'}</div>
            <div><strong>🔋 Battery:</strong> ${loc.batteryLevel != null ? loc.batteryLevel + '%' : 'N/A'}</div>
            <div><strong>🕒 Last Ping:</strong> ${lastActiveTime} IST</div>
            <div><strong>🚦 Status:</strong> ${isMoving ? 'In Transit / Moving' : isStationary ? 'Stationary (At Site/Visit)' : status}</div>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersRef.current[ae.id] = marker;
    });

    if (bounds.length > 0 && !selectedAE) {
      leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    // Guarantee full tile coverage
    setTimeout(() => {
      leafletMap.current?.invalidateSize();
    }, 100);
  }, [liveData]);

  // Focus single AE on map & automatically trace their route for today
  const handleSelectAE = (aeItem) => {
    setSelectedAE(aeItem);
    // On mobile, switch to map view when an AE is tapped
    setMobileTab('map');
    const loc = aeItem.latestLocation;
    if (loc && loc.latitude && loc.longitude && leafletMap.current) {
      leafletMap.current.flyTo([loc.latitude, loc.longitude], 15, { duration: 1.2 });
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
    setIsPlaying(false);
    setPlaybackIndex(0);
    try {
      const res = await axios.get(`${API_BASE}/location/history/${aeUserId}?date=${targetDate}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const logs = res.data.logs || [];
      setHistoryLogs(logs);

      // Clean up previous polyline & markers
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      historyMarkersRef.current.forEach(m => m.remove());
      historyMarkersRef.current = [];
      stopMarkersRef.current.forEach(m => m.remove());
      stopMarkersRef.current = [];
      if (playbackMarkerRef.current) {
        playbackMarkerRef.current.remove();
        playbackMarkerRef.current = null;
      }

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
        historyMarkersRef.current.push(startMarker);

        // Add End marker (Red circle / Blue rotating vehicle if currently moving)
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
                ${isCurrentlyMoving ? '🚗 Currently Moving' : '📍 Current / Latest Location'}
              </b><br>
              Last Seen: ${new Date(endPoint.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </div>
          `);
          historyMarkersRef.current.push(endMarker);
        }

        // Set playback scrubber to the latest point by default
        setPlaybackIndex(pathCoords.length - 1);

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
          stopMarkersRef.current.push(stopMarker);
        });

        leafletMap.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
        const distanceLabel = snapped.roadDistanceKm ? `${snapped.roadDistanceKm} km road route` : `${calculateTotalDistanceKm(logs)} km`;
        toast.info(`Traced ${logs.length} GPS fixes (${distanceLabel}, ${detectedStops.length} stops) for ${targetDate}`);
      } else {
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
    if (playbackMarkerRef.current) {
      playbackMarkerRef.current.remove();
      playbackMarkerRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackIndex(0);
    setHistoryLogs([]);
    setSnappedPathCoords([]);
    setRoadDistanceKm(null);
    setIsRoadSnapped(false);
    setDetectedStopsList([]);
    toast.info('Route path cleared from map.');
  };

  // Swiggy / Ola / Uber Style Rotating Vehicle Playback Marker Update
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;

    const playbackPoints = snappedPathCoords.length > 0 
      ? snappedPathCoords 
      : historyLogs.map(l => [l.latitude, l.longitude]);

    if (playbackPoints.length === 0) return;

    // Only show animated vehicle pin during active playback or when scrubbing historical timeline
    const isInteracting = isPlaying || (playbackIndex >= 0 && playbackIndex < playbackPoints.length - 1);
    if (!isInteracting) {
      if (playbackMarkerRef.current) {
        playbackMarkerRef.current.remove();
        playbackMarkerRef.current = null;
      }
      return;
    }

    const latLng = playbackPoints[playbackIndex];
    if (!latLng) return;

    // Calculate heading/bearing angle in degrees along the road segment
    let bearing = 0;
    if (playbackIndex < playbackPoints.length - 1) {
      const p1 = playbackPoints[playbackIndex];
      const p2 = playbackPoints[playbackIndex + 1];
      const y = Math.sin((p2[1] - p1[1]) * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180);
      const x = Math.cos(p1[0] * Math.PI / 180) * Math.sin(p2[0] * Math.PI / 180) -
                Math.sin(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.cos((p2[1] - p1[1]) * Math.PI / 180);
      bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    } else if (playbackIndex > 0) {
      const p1 = playbackPoints[playbackIndex - 1];
      const p2 = playbackPoints[playbackIndex];
      const y = Math.sin((p2[1] - p1[1]) * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180);
      const x = Math.cos(p1[0] * Math.PI / 180) * Math.sin(p2[0] * Math.PI / 180) -
                Math.sin(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * Math.cos((p2[1] - p1[1]) * Math.PI / 180);
      bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    const vehicleIcon = window.L.divIcon({
      className: 'swiggy-uber-vehicle-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <!-- Pulsing Radar Wave (Swiggy / Uber style) -->
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.25);
            border: 1.5px solid rgba(59, 130, 246, 0.6);
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>

          <!-- Rotating Vehicle Marker pointing down the road -->
          <div style="
            transform: rotate(${Math.round(bearing)}deg);
            transition: transform 0.25s ease-out;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1d4ed8, #2563eb);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 18px rgba(37,99,235,0.7), 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff" stroke="#1d4ed8" stroke-width="1.5">
              <polygon points="12,2 22,21 12,16 2,21" />
            </svg>
          </div>
          
          <!-- Live Moving Status Tag -->
          <div style="
            position: absolute;
            bottom: -18px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            background: #0f172a;
            color: #60a5fa;
            border: 1px solid #3b82f6;
            font-size: 9px;
            font-weight: 800;
            padding: 1px 6px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 3px;
          ">
            <span style="width: 5px; height: 5px; border-radius: 50%; background: #3b82f6; display: inline-block;"></span>
            MOVING
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    if (!playbackMarkerRef.current) {
      playbackMarkerRef.current = window.L.marker(latLng, { 
        icon: vehicleIcon,
        zIndexOffset: 1000 
      }).addTo(leafletMap.current);
    } else {
      playbackMarkerRef.current.setIcon(vehicleIcon);
      playbackMarkerRef.current.setLatLng(latLng);
    }
  }, [playbackIndex, historyLogs, snappedPathCoords, isPlaying]);

  // Playback Timer Loop
  useEffect(() => {
    let timer = null;
    const playbackPoints = snappedPathCoords.length > 0 
      ? snappedPathCoords 
      : historyLogs.map(l => [l.latitude, l.longitude]);

    if (isPlaying && playbackPoints.length > 1) {
      const intervalMs = Math.max(60, Math.round(350 / playbackSpeed));
      timer = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= playbackPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, historyLogs.length, snappedPathCoords.length, playbackSpeed]);

  // Filter AEs
  const filteredData = liveData.filter(item => {
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
  });

  const movingCount = liveData.filter(i => i.isMoving || i.status === 'MOVING').length;
  const stationaryCount = liveData.filter(i => (i.status === 'STATIONARY' || i.status === 'ONLINE') && !i.isMoving).length;
  const idleCount = liveData.filter(i => i.status === 'IDLE').length;
  const offlineCount = liveData.filter(i => i.status === 'OFFLINE').length;
  const outOfHoursCount = liveData.filter(i => i.status === 'OUT_OF_HOURS').length;

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-[1700px] mx-auto min-h-screen text-slate-100 font-sans">
      
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
          
          {/* Floating Top Control Bar: Layer Switcher */}
          <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
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
              🛰️ Satellite
            </button>
            <button
              onClick={() => changeMapType('openstreetmap')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                mapType === 'openstreetmap' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              🌐 OpenStreet
            </button>
          </div>

          {/* Floating Route Tracing Panel for Selected AE */}
          {selectedAE && (
            <div className="absolute top-4 left-4 z-20 bg-slate-900/95 border border-slate-700/90 p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 max-w-[calc(100%-140px)] sm:max-w-xl animate-fadeIn">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  <p className="text-xs font-bold text-white truncate">{selectedAE.user.name}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{historyLogs.length} points</span>
                  {historyLogs.length > 1 && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{calculateTotalDistanceKm(historyLogs)} km</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">{detectedStopsList.length} stops</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:ml-auto">
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

          {/* Floating Bottom Journey Playback Bar */}
          {selectedAE && historyLogs.length > 1 && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/95 border border-slate-700/90 p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                  title={isPlaying ? "Pause" : "Play Journey"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="fill-white" />}
                </button>
                <button
                  onClick={() => { setIsPlaying(false); setPlaybackIndex(0); }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                  title="Reset to Start"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Scrubber Range Slider */}
              <div className="flex-1 w-full flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, (snappedPathCoords.length > 0 ? snappedPathCoords.length : historyLogs.length) - 1)}
                  value={playbackIndex}
                  onChange={(e) => {
                    setPlaybackIndex(Number(e.target.value));
                  }}
                  className="w-full accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-blue-400 shrink-0 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {(() => {
                    if (historyLogs.length === 0) return '--:--';
                    const totalPoints = snappedPathCoords.length > 0 ? snappedPathCoords.length : historyLogs.length;
                    const logIdx = Math.min(historyLogs.length - 1, Math.round((playbackIndex / Math.max(1, totalPoints - 1)) * (historyLogs.length - 1)));
                    const log = historyLogs[logIdx];
                    return log?.createdAt 
                      ? new Date(log.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                      : '--:--';
                  })()}
                </span>
              </div>

              {/* Speed Multipliers & Trip Distance */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[10px] font-bold">
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        playbackSpeed === spd ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <div className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
                  <Route size={12} className="text-emerald-400" />
                  <span>{calculateTotalDistanceKm(historyLogs)} km</span>
                </div>
              </div>
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
