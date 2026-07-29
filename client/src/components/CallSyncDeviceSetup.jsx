import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { getCallLogPlugin } from '../utils/capacitorPlugins';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://peopledesk.orbixdesigns.com/api';

const normalizeSimValue = (value) => String(value || '').trim().toLowerCase();

const buildSimLabelMap = (sims = []) => {
  const labels = {};
  sims.forEach((sim) => {
    const slot = String(sim?.simSlot || '').trim();
    const simId = String(sim?.simId || '').trim();
    const label = sim?.simLabel || sim?.displayName || (slot ? `SIM ${slot}` : 'SIM');
    if (slot) labels[slot] = label;
    if (simId) labels[simId] = label;
  });
  return labels;
};

const filterLogsForSim = (logs, officialSim) => {
  const target = normalizeSimValue(officialSim);
  if (!target || target === '0' || target === 'all') return Array.isArray(logs) ? logs : [];

  return (Array.isArray(logs) ? logs : []).filter((log) => {
    const simSlot = normalizeSimValue(log.simSlot);
    const simId = normalizeSimValue(log.simId);
    const simLabel = normalizeSimValue(log.simLabel);
    const normalizedLabel = simLabel.replace(/^sim\s*/i, '');
    return (
      simSlot === target ||
      simId === target ||
      normalizedLabel === target ||
      simLabel === target
    );
  });
};

export default function CallSyncDeviceSetup() {
  const [code, setCode] = useState('');
  const [sim, setSim] = useState('1');
  const [status, setStatus] = useState('Enter the activation code generated from the desktop portal.');
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);
  const [detectedSims, setDetectedSims] = useState([]);
  const [lastSyncStatus, setLastSyncStatus] = useState(null);

  const [simOptions, setSimOptions] = useState([
    { slot: '1', label: 'SIM 1' },
    { slot: '2', label: 'SIM 2' }
  ]);

  const refreshDiagnostics = async () => {
    const [{ value: statusValue }, { value: detailValue }, { value: runAtValue }] = await Promise.all([
      Preferences.get({ key: 'call_sync_last_status' }),
      Preferences.get({ key: 'call_sync_last_detail' }),
      Preferences.get({ key: 'call_sync_last_run_at' })
    ]);

    if (!statusValue && !detailValue && !runAtValue) {
      setLastSyncStatus(null);
      return;
    }

    setLastSyncStatus({
      status: statusValue || 'unknown',
      detail: detailValue || 'No worker details available yet.',
      runAt: runAtValue || ''
    });
  };

  useEffect(() => {
    Preferences.get({ key: 'call_sync_device_token' }).then(({ value }) => setActivated(Boolean(value)));
    
    // Load active SIM carrier info from Android system
    const loadSims = async () => {
      try {
        const plugin = getCallLogPlugin();
        const info = await plugin.getSimInfo();
        if (info && info.sims && info.sims.length > 0) {
          setDetectedSims(info.sims);
          await Preferences.set({ key: 'sim_labels', value: JSON.stringify(buildSimLabelMap(info.sims)) });
          const options = info.sims.map(sim => ({
            slot: sim.simSlot,
            label: `${sim.simLabel || sim.displayName || 'SIM ' + sim.simSlot} (SIM ${sim.simSlot})`
          }));
          setSimOptions(options);
          if (options.length > 0) {
            setSim(options[0].slot);
          }
        }
      } catch (err) {
        console.warn('Could not fetch device SIM info', err);
      }
    };
    loadSims();
    refreshDiagnostics();
  }, []);

  const activate = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const plugin = getCallLogPlugin();
      // This requests the runtime permission before enrollment, so an activated but unusable phone is avoided.
      await plugin.getCallLogs();
      const response = await fetch(`${API_BASE}/call-sync/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), officialSim: sim, deviceName: navigator.userAgent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Activation failed');
      await Preferences.set({ key: 'apiUrl', value: API_BASE });
      await Preferences.set({ key: 'call_sync_device_token', value: data.deviceToken });
      await Preferences.set({ key: 'cre_official_sim', value: data.officialSim });
      if (detectedSims.length > 0) {
        await Preferences.set({ key: 'sim_labels', value: JSON.stringify(buildSimLabelMap(detectedSims)) });
      }
      await plugin.requestExactAlarmPermission?.();
      await plugin.requestBatteryExemption?.();
      await plugin.scheduleCallLogSync();
      setActivated(true);
      setStatus('Activated. Sycing call logs now...');
      
      // Perform immediate sync right after activation. Let the server apply
      // strict SIM handling so only the selected SIM is uploaded.
      try {
        const logsResult = await plugin.getCallLogs();
        const filteredLogs = filterLogsForSim(logsResult?.logs, data.officialSim || sim);
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
              simFilter: data.officialSim || sim
            })
          });
        }
      } catch (e) {
        console.warn('Initial post-activation sync error:', e);
      }
      setStatus('Activated. Calls will sync automatically from 10:30 AM to 7:00 PM IST.');
      await refreshDiagnostics();
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
        await refreshDiagnostics();
        return;
      }

      const selectedSim = officialSim || '2';
      const filteredLogs = filterLogsForSim(logsResult.logs, selectedSim);
      if (filteredLogs.length === 0) {
        setStatus(`No call logs found for selected SIM ${selectedSim}.`);
        await refreshDiagnostics();
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
          setStatus(`Sync request reached server, but 0 call logs were saved. Device sent ${rawReceived} logs and ${acceptedLogs} passed filtering. Please verify SIM selection and refresh desktop after retrying.`);
        } else {
          setStatus(`Successfully saved ${savedCalls} call logs to server from ${acceptedLogs}/${rawReceived} device logs. Refresh desktop to view.`);
        }
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'Sync failed');
      }
    } catch (err) {
      setStatus('Sync error: ' + (err.message || 'Failed to sync logs'));
    } finally {
      await refreshDiagnostics();
      setBusy(false);
    }
  };

  const resetSetup = async () => {
    await Preferences.remove({ key: 'call_sync_device_token' });
    await Preferences.remove({ key: 'cre_official_sim' });
    await Preferences.remove({ key: 'sim_labels' });
    setActivated(false);
    setStatus('Enter the activation code generated from the desktop portal.');
    setLastSyncStatus(null);
  };

  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
      <p className="text-xs font-bold tracking-[.2em] text-red-400">PEOPLEDESK APK</p>
      <h1 className="mt-2 text-3xl font-black">Call Sync Setup</h1>
      <p className="mt-3 text-sm text-slate-300">This phone does not need your desktop password. Activate it once with a temporary code.</p>
      {activated ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl bg-emerald-500/15 p-4 text-sm text-emerald-300 border border-emerald-500/20">{status}</p>
          {lastSyncStatus ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
              <p className="font-semibold text-white">Background sync status: {lastSyncStatus.status}</p>
              <p className="mt-1">{lastSyncStatus.detail}</p>
              {lastSyncStatus.runAt ? <p className="mt-2 text-slate-400">Last checked: {lastSyncStatus.runAt}</p> : null}
            </div>
          ) : null}
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
      ) : <form onSubmit={activate} className="mt-6 space-y-5">
        <label className="block text-sm font-semibold">Activation code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength="10" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 tracking-[.25em] outline-none" placeholder="A1B2C3D4E5" />
        </label>
        <label className="block text-sm font-semibold">Official work SIM slot
          <select value={sim} onChange={(e) => setSim(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-800 p-4">
            {simOptions.map(option => (
              <option key={option.slot} value={option.slot}>{option.label}</option>
            ))}
          </select>
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-red-600 p-4 font-bold disabled:opacity-50">{busy ? 'Activating…' : 'Activate automatic sync'}</button>
        <p className="text-sm text-slate-400">{status}</p>
      </form>}
    </section>
  </main>;
}

