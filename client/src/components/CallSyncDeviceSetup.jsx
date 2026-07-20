import { useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { getCallLogPlugin } from '../utils/capacitorPlugins';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://peopledesk.orbixdesigns.com/api';

export default function CallSyncDeviceSetup() {
  const [code, setCode] = useState('');
  const [sim, setSim] = useState('1');
  const [status, setStatus] = useState('Enter the activation code generated from the desktop portal.');
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    Preferences.get({ key: 'call_sync_device_token' }).then(({ value }) => setActivated(Boolean(value)));
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
      await plugin.requestExactAlarmPermission?.();
      await plugin.scheduleCallLogSync();
      setActivated(true);
      setStatus('Activated. Calls will sync automatically from 10:30 AM to 7:00 PM IST.');
    } catch (error) {
      setStatus(error.message || 'Activation failed. Check permission, internet, and the code.');
    } finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
      <p className="text-xs font-bold tracking-[.2em] text-red-400">PEOPLEDESK APK</p>
      <h1 className="mt-2 text-3xl font-black">Call Sync Setup</h1>
      <p className="mt-3 text-sm text-slate-300">This phone does not need your desktop password. Activate it once with a temporary code.</p>
      {activated ? <p className="mt-6 rounded-xl bg-emerald-500/15 p-4 text-sm text-emerald-300">{status}</p> : <form onSubmit={activate} className="mt-6 space-y-5">
        <label className="block text-sm font-semibold">Activation code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength="10" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 tracking-[.25em] outline-none" placeholder="A1B2C3D4E5" />
        </label>
        <label className="block text-sm font-semibold">Official work SIM slot
          <select value={sim} onChange={(e) => setSim(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-800 p-4">
            <option value="1">SIM 1</option><option value="2">SIM 2</option>
          </select>
        </label>
        <button disabled={busy} className="w-full rounded-xl bg-red-600 p-4 font-bold disabled:opacity-50">{busy ? 'Activating…' : 'Activate automatic sync'}</button>
        <p className="text-sm text-slate-400">{status}</p>
      </form>}
    </section>
  </main>;
}
