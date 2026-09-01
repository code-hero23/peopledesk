import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { getCallLogPlugin } from '../utils/capacitorPlugins';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://peopledesk.orbixdesigns.com/api';

const normalizeSimValue = (value) => String(value || '').trim().toLowerCase();

const filterLogsForSim = (logs, officialSim) => {
  const target = normalizeSimValue(officialSim);
  if (!target || target === '0' || target === 'all' || target === 'both') return Array.isArray(logs) ? logs : [];

  return (Array.isArray(logs) ? logs : []).filter((log) => {
    const simSlot = normalizeSimValue(log.simSlot);
    const simId = normalizeSimValue(log.simId);
    return (
      simSlot === target ||
      simId === target
    );
  });
};

export default function CallSyncDeviceSetup() {
  const [code, setCode] = useState('');
  const [sim, setSim] = useState('1');
  const [syncBothSims, setSyncBothSims] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSimSelection, setPendingSimSelection] = useState(null);
  const [status, setStatus] = useState('Enter the activation code generated from the desktop portal.');
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  const [simOptions, setSimOptions] = useState([
    { slot: '1', label: 'SIM 1' },
    { slot: '2', label: 'SIM 2' },
    { slot: 'all', label: 'Both SIMs (SIM 1 & SIM 2)' }
  ]);

  useEffect(() => {
    Preferences.get({ key: 'call_sync_device_token' }).then(({ value }) => setActivated(Boolean(value)));
    Preferences.get({ key: 'cre_official_sim' }).then(({ value }) => {
      if (value === 'all' || value === 'both') {
        setSyncBothSims(true);
        setSim('all');
      } else if (value) {
        setSim(value);
      }
    });

    // Load active SIM carrier info from Android system
    const loadSims = async () => {
      try {
        const plugin = getCallLogPlugin();
        const info = await plugin.getSimInfo();
        if (info && info.sims && info.sims.length > 0) {
          const options = info.sims.map(s => ({
            slot: s.simSlot,
            label: `${s.simLabel || s.displayName || 'SIM ' + s.simSlot} (SIM ${s.simSlot})`
          }));
          options.push({ slot: 'all', label: 'Both SIMs (SIM 1 & SIM 2)' });
          setSimOptions(options);
        }
      } catch (err) {
        console.warn('Could not fetch device SIM info', err);
      }
    };
    loadSims();
  }, []);

  const handleSimSelect = (selectedSlot) => {
    if (selectedSlot === 'all') {
      setPendingSimSelection('all');
      setShowConfirmModal(true);
    } else {
      setSim(selectedSlot);
      setSyncBothSims(false);
    }
  };

  const handleToggleBothSims = (enable) => {
    if (enable) {
      setPendingSimSelection('all');
      setShowConfirmModal(true);
    } else {
      setSyncBothSims(false);
      setSim(simOptions[0]?.slot || '1');
    }
  };

  const confirmFetchBothSims = () => {
    setSim('all');
    setSyncBothSims(true);
    setShowConfirmModal(false);
    setPendingSimSelection(null);
  };

  const cancelBothSimsSelection = () => {
    setShowConfirmModal(false);
    setPendingSimSelection(null);
    if (sim === 'all') {
      setSim('1');
      setSyncBothSims(false);
    }
  };

  const activate = async (event) => {
    event.preventDefault();
    setBusy(true);
    const targetSim = syncBothSims ? 'all' : sim;
    try {
      const plugin = getCallLogPlugin();
      try {
        await plugin.getCallLogs();
      } catch (e) {
        console.warn('Call log permission not granted during initial check, proceeding with device enrollment:', e);
      }
      const response = await fetch(`${API_BASE}/call-sync/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), officialSim: targetSim, deviceName: navigator.userAgent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Activation failed');
      await Preferences.set({ key: 'apiUrl', value: API_BASE });
      await Preferences.set({ key: 'call_sync_device_token', value: data.deviceToken });
      await Preferences.set({ key: 'cre_official_sim', value: data.officialSim || targetSim });
      await plugin.requestExactAlarmPermission?.();
      await plugin.requestBatteryExemption?.();
      await plugin.requestLocationPermission?.();
      await plugin.scheduleCallLogSync();
      setActivated(true);
      setStatus('Activated. Syncing call logs now...');
      
      try {
        const logsResult = await plugin.getCallLogs();
        const filteredLogs = filterLogsForSim(logsResult?.logs, data.officialSim || targetSim);
        if (filteredLogs.length > 0) {
          const targetUrl = API_BASE.replace(/\/$/, '') + '/call-sync/sync';
          await fetch(targetUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Device ${data.deviceToken}`
            },
            body: JSON.stringify({
              logs: filteredLogs,
              simFilter: data.officialSim || targetSim
            })
          });
        }
      } catch (e) {
        console.warn('Initial post-activation sync error:', e);
      }
      setStatus(`Activated for ${targetSim === 'all' ? 'BOTH SIMs' : `SIM ${targetSim}`}. Calls will sync automatically.`);
    } catch (error) {
      setStatus(error.message || 'Activation failed. Check permission, internet, and the code.');
    } finally { setBusy(false); }
  };

  const triggerManualSync = async () => {
    setBusy(true);
    setStatus('Syncing call logs right now...');
    try {
      const plugin = getCallLogPlugin();
      const { value: deviceToken } = await Preferences.get({ key: 'call_sync_device_token' });
      const { value: officialSim } = await Preferences.get({ key: 'cre_official_sim' });
      const { value: apiUrl } = await Preferences.get({ key: 'apiUrl' });

      const logsResult = await plugin.getCallLogs();
      if (!logsResult?.logs || logsResult.logs.length === 0) {
        setStatus('No call logs found on this device.');
        return;
      }

      const selectedSim = officialSim || (syncBothSims ? 'all' : sim);
      const filteredLogs = filterLogsForSim(logsResult.logs, selectedSim);
      if (filteredLogs.length === 0) {
        setStatus(`No call logs found for ${selectedSim === 'all' ? 'both SIMs' : `selected SIM ${selectedSim}`}.`);
        return;
      }

      const targetUrl = (apiUrl || API_BASE).replace(/\/$/, '') + '/call-sync/sync';
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Device ${deviceToken}`
        },
        body: JSON.stringify({
          logs: filteredLogs,
          simFilter: selectedSim
        })
      });

      if (response.ok) {
        const resData = await response.json();
        const savedCalls = typeof resData.totalCalls === 'number' ? resData.totalCalls : 0;
        const acceptedLogs = typeof resData.acceptedLogs === 'number' ? resData.acceptedLogs : filteredLogs.length;
        const rawReceived = typeof resData.rawReceived === 'number' ? resData.rawReceived : logsResult.logs.length;

        if (savedCalls === 0) {
          setStatus(`Sync request reached server, but 0 call logs were saved. Device sent ${rawReceived} logs and ${acceptedLogs} passed filtering.`);
        } else {
          setStatus(`Successfully saved ${savedCalls} call logs to server (${selectedSim === 'all' ? 'Both SIMs' : `SIM ${selectedSim}`}) from ${acceptedLogs}/${rawReceived} device logs. Refresh desktop to view.`);
        }
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'Sync failed');
      }
    } catch (err) {
      setStatus('Sync error: ' + (err.message || 'Failed to sync logs'));
    } finally {
      setBusy(false);
    }
  };

  const resetSetup = async () => {
    await Preferences.remove({ key: 'call_sync_device_token' });
    setActivated(false);
    setStatus('Enter the activation code generated from the desktop portal.');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs font-bold tracking-[.2em] text-red-400">PEOPLEDESK MOBILE APK</p>
        <h1 className="mt-2 text-3xl font-black">Device Activation</h1>
        <p className="mt-3 text-sm text-slate-300">Activate live location tracking & mobile device sync for this Android phone.</p>
        
        {activated ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-xl bg-emerald-500/15 p-4 text-sm text-emerald-300 border border-emerald-500/20">{status}</p>
            <button 
              onClick={triggerManualSync} 
              disabled={busy}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 p-4 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? 'Syncing...' : '🔄 SYNC CALL LOGS NOW'}
            </button>
            <button 
              onClick={resetSetup} 
              className="w-full rounded-xl bg-white/5 hover:bg-white/10 p-3 text-xs text-slate-400 font-semibold transition-all"
            >
              Re-configure / Change SIM Slot
            </button>
          </div>
        ) : (
          <form onSubmit={activate} className="mt-6 space-y-5">
            <label className="block text-sm font-semibold">
              Activation Code
              <input 
                value={code} 
                onChange={(e) => setCode(e.target.value.toUpperCase())} 
                required 
                maxLength="10" 
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 tracking-[.25em] outline-none focus:border-red-500 transition-all font-mono text-center text-lg" 
                placeholder="A1B2C3D4" 
              />
            </label>

            {/* Toggle: Sync Both SIMs as Official */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-200">Sync Both SIMs</p>
                  <p className="text-xs text-slate-400">Mark SIM 1 & SIM 2 as official work SIMs</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleBothSims(!syncBothSims)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                    syncBothSims ? 'bg-red-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {!syncBothSims && (
                <label className="block text-xs font-semibold text-slate-300 pt-2 border-t border-white/10">
                  Select Official SIM Slot
                  <select 
                    value={sim} 
                    onChange={(e) => handleSimSelect(e.target.value)} 
                    className="mt-2 w-full rounded-xl border border-white/15 bg-slate-800 p-3 text-sm"
                  >
                    {simOptions.map(option => (
                      <option key={option.slot} value={option.slot}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <button 
              disabled={busy} 
              className="w-full rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] p-4 font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-red-600/25"
            >
              {busy ? 'Activating…' : 'Activate Automatic Sync'}
            </button>
            
            <p className="text-xs text-slate-400 text-center leading-relaxed">{status}</p>
          </form>
        )}
      </section>

      {/* Confirmation Modal to Fetch Both SIM Logs */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Confirm Both SIMs Sync</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Are you sure you want to enable call sync for <span className="font-bold text-amber-400">BOTH SIM 1 & SIM 2</span>?
                <br /><br />
                Call logs from all active SIM slots on this mobile device will be uploaded and reported as official work call logs.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={cancelBothSimsSelection}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmFetchBothSims}
                className="flex-1 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500 transition-all shadow-lg shadow-red-600/30"
              >
                Yes, Sync Both SIMs
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

