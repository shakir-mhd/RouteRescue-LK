'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Phone, ArrowLeft, Key, User, Lock, FileText, MapPin, Compass, LogOut, Navigation, AlertTriangle } from 'lucide-react';
import { useSharedState, Incident, Mechanic, Driver, SEED_MECHANICS, calculateDistanceKm, SRI_LANKA_REGIONS, addCancelledIncidentId, getCancelledIncidentIds, parseTimestampMs } from '../../utils/store';
import { supabase } from '../../utils/supabase';
import MapDashboard from '../../components/MapDashboard';
import TriageDrawer from '../../components/TriageDrawer';
import LiveTracker from '../../components/LiveTracker';
import MechanicRobotChat from '../../components/MechanicRobotChat';

const CITIES = SRI_LANKA_REGIONS.map((r) => ({
  name: r.name,
  coords: r.coords as [number, number],
}));

function findNearestCity(coords: [number, number]) {
  let closest = CITIES[0];
  let minDistance = Infinity;
  for (const city of CITIES) {
    const dist = calculateDistanceKm(coords[0], coords[1], city.coords[0], city.coords[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }
  return closest;
}

export default function MotoristPortal() {
  const router = useRouter();

  // Auth States: 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form Fields
  const [driverName, setDriverName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');

  // Forgot Password OTP flow fields
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Page Layout & Map State
  const [activeView, setActiveView] = useState<'map' | 'tracker'>('map');
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [reportMode, setReportMode] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>(CITIES[0].coords);
  const [mapCenter, setMapCenter] = useState<[number, number]>(CITIES[0].coords);
  const [isBrowsingRegion, setIsBrowsingRegion] = useState<boolean>(false);
  const [reportLocation, setReportLocation] = useState<[number, number]>(CITIES[0].coords);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Ref to track if driver explicitly selected a manual region (prevents watchPosition from overwriting)
  const isManualRegionRef = useRef<boolean>(false);

  // Synced Global States
  const [drivers, setDrivers] = useSharedState<Driver[]>('routerescue_drivers', []);
  const [incidents, setIncidents] = useSharedState<Incident[]>('routerescue_incidents', []);
  const [mechanics, setMechanics] = useSharedState<Mechanic[]>('routerescue_mechanics', SEED_MECHANICS);
  const [activeIncident, setActiveIncident] = useSharedState<Incident | null>('routerescue_active_incident', null);

  // GPS Tracking Status State
  const [gpsStatus, setGpsStatus] = useState<string>('Ready');

  // Restore login session locally & request device GPS coordinates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('routerescue_mechanics');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
        } catch (e) {}
      }

      const logged = localStorage.getItem('motorist_logged_in');
      const savedPhone = localStorage.getItem('motorist_phone');
      const savedName = localStorage.getItem('motorist_name');
      if (logged === 'true' && savedPhone) {
        setPhone(savedPhone);
        if (savedName) setDriverName(savedName);
        setIsLoggedIn(true);
      }
    }

    let watchId: number | null = null;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('Locating GPS...');
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          if (!isManualRegionRef.current) {
            setMapCenter(coords);
            setReportLocation(coords);
            const nearest = findNearestCity(coords);
            setSelectedCity(nearest);
            setGpsStatus(`GPS Active (${nearest.name})`);
          }
        },
        (error) => {
          console.log('GPS Geolocation Error:', error.message);
          setGpsStatus('GPS Unavailable (Select Region)');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Real-Time Heartbeat Auto-Sync: Poll Supabase 'incidents' table every 2.5 seconds
  useEffect(() => {
    let isMounted = true;

    async function syncIncidentsFromSupabase() {
      try {
        const { data, error } = await supabase.from('incidents').select('*').order('timestamp', { ascending: false });
        if (!error && data && isMounted) {
          const cancelledIds = getCancelledIncidentIds();
          const formattedIncidents: Incident[] = data
            .filter((d: any) => !cancelledIds.has(String(d.id)))
            .map((d: any) => ({
              id: String(d.id),
              category: String(d.category || 'Breakdown'),
              lat: Number(d.lat),
              lng: Number(d.lng),
              status: d.status as any,
              baseTariff: Number(d.base_tariff || d.baseTariff || 1000),
              timestamp: String(d.timestamp || new Date().toISOString()),
              mechanicId: String(d.mechanic_id || d.mechanicId || ''),
              distanceKm: Number(d.distance_km || d.distanceKm || 0),
              driverName: d.driver_name ? String(d.driver_name) : undefined,
              driverPhone: d.driver_phone ? String(d.driver_phone) : undefined,
              assignedEmployee: d.assigned_employee || undefined,
              cancellationReason: d.cancellation_reason ? String(d.cancellation_reason) : undefined,
              cancelledBy: d.cancelled_by ? (String(d.cancelled_by) as any) : undefined,
            }));

          setIncidents((prevIncidents) => {
            const merged = [...formattedIncidents];
            for (const localInc of prevIncidents) {
              if (localInc.status === 'Cancelled' || localInc.status === 'Resolved') {
                const idx = merged.findIndex((m) => String(m.id) === String(localInc.id));
                if (idx >= 0) {
                  if (merged[idx].status !== 'Cancelled' && merged[idx].status !== 'Resolved') {
                    merged[idx] = { ...merged[idx], ...localInc };
                  }
                } else {
                  merged.push(localInc);
                }
              }
            }
            merged.sort((a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp));
            if (JSON.stringify(prevIncidents) === JSON.stringify(merged)) {
              return prevIncidents;
            }
            return merged;
          });
        }
      } catch (err) {
        console.error('Real-time motorist incidents heartbeat error:', err);
      }
    }

    syncIncidentsFromSupabase();
    const interval = setInterval(syncIncidentsFromSupabase, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setIncidents]);

  // Synchronize activeIncident with global incidents store live
  useEffect(() => {
    if (activeIncident) {
      const matched = incidents.find((i) => String(i.id) === String(activeIncident.id));
      if (matched) {
        if (
          matched.status !== activeIncident.status ||
          matched.assignedEmployee?.name !== activeIncident.assignedEmployee?.name ||
          matched.cancellationReason !== activeIncident.cancellationReason
        ) {
          setActiveIncident(matched);
          if (typeof window !== 'undefined') {
            localStorage.setItem('routerescue_active_incident', JSON.stringify(matched));
          }
        }
      }
    }
  }, [incidents, activeIncident, setActiveIncident]);

  const handleLocateMe = () => {
    isManualRegionRef.current = false;
    setIsBrowsingRegion(false);

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('Requesting High-Accuracy GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setMapCenter([coords[0], coords[1]]);
          setReportLocation([coords[0], coords[1]]);
          const gpsNearest = findNearestCity(coords);
          setSelectedCity(gpsNearest);
          setMapZoom(16);
          setGpsStatus(`GPS Active (${gpsNearest.name})`);
        },
        (error) => {
          console.warn('GPS Geolocation error', error);
          const nearest = findNearestCity(userLocation);
          setGpsStatus(`GPS Blocked - Centered on ${nearest.name}`);
          alert(
            'GPS Location access was not granted by browser.\n\n' +
            'Tips to set your location:\n' +
            '1. Tap your city/region from the top header dropdown.\n' +
            '2. Tap anywhere on the map or drag the vehicle pin to set your exact breakdown location!'
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const handleCityChange = (cityName: string) => {
    const city = CITIES.find((c) => c.name === cityName);
    if (city) {
      isManualRegionRef.current = true;
      setIsBrowsingRegion(true);
      setSelectedCity(city);
      setMapCenter(city.coords);
      setUserLocation(city.coords);
      setReportLocation(city.coords);
      setMapZoom(14);
      setGpsStatus(`Inspecting: ${city.name}`);
    }
  };

  // Auth Handlers
  const handleDriverSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanName = driverName.trim();
    const cleanPhone = phone.trim();
    const cleanNic = nic.trim();

    if (!cleanName) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (cleanPhone.length < 9) {
      setAuthError('Please enter a valid mobile number.');
      return;
    }
    if (cleanNic.length < 9) {
      setAuthError('Please enter a valid NIC (e.g. 199012345678 or 901234567V).');
      return;
    }
    if (password.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }

    // Check if account already exists
    const existing = drivers.find((d) => d.mobile === cleanPhone || d.nic === cleanNic);
    if (existing) {
      setAuthError('⚠️ An account with this mobile number or NIC is already registered. Please click "Log In".');
      return;
    }

    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: cleanName,
      mobile: cleanPhone,
      nic: cleanNic,
      password,
    };

    setDrivers((prev) => [...prev, newDriver]);
    setIsLoggedIn(true);
    setDriverName(cleanName);

    if (typeof window !== 'undefined') {
      localStorage.setItem('motorist_logged_in', 'true');
      localStorage.setItem('motorist_phone', cleanPhone);
      localStorage.setItem('motorist_name', cleanName);
    }

    // Save to Supabase drivers table
    try {
      await supabase.from('drivers').upsert([
        {
          id: newDriver.id,
          name: newDriver.name,
          mobile: newDriver.mobile,
          nic: newDriver.nic,
          password: newDriver.password,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Error saving driver to Supabase:', err);
    }
  };

  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();

    if (cleanPhone.length < 9) {
      setAuthError('Please enter a valid mobile number.');
      return;
    }
    if (!cleanPassword) {
      setAuthError('Please enter your account password.');
      return;
    }

    // 1. Check local state drivers
    let matched = drivers.find(
      (d) => d.mobile === cleanPhone || d.mobile.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '')
    );

    // 2. Query Supabase drivers table if not found in local memory
    if (!matched) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .or(`mobile.eq.${cleanPhone},phone.eq.${cleanPhone}`);
        if (!error && data && data.length > 0) {
          const dbObj = data[0];
          matched = {
            id: String(dbObj.id),
            name: String(dbObj.name || dbObj.driver_name || 'Driver'),
            mobile: String(dbObj.mobile || dbObj.phone || cleanPhone),
            nic: String(dbObj.nic || ''),
            password: dbObj.password ? String(dbObj.password) : undefined,
          };
          setDrivers((prev) => [...prev, matched!]);
        }
      } catch (err) {
        console.error('Supabase driver verification query error:', err);
      }
    }

    // STRICT UNREGISTERED ACCOUNT CHECK
    if (!matched) {
      setAuthError(`❌ Access Denied: No driver account registered for ${cleanPhone}. Please click "Register Now" to create your driver account.`);
      return;
    }

    // STRICT PASSWORD VERIFICATION CHECK
    if (matched.password && matched.password !== cleanPassword) {
      setAuthError('❌ Access Denied: Incorrect password. Please check your password or use "Forgot Password?" to reset.');
      return;
    }

    // SUCCESSFUL AUTHENTICATION
    setIsLoggedIn(true);
    setDriverName(matched.name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('motorist_logged_in', 'true');
      localStorage.setItem('motorist_phone', cleanPhone);
      localStorage.setItem('motorist_name', matched.name);
    }
  };

  const handleDriverLogout = () => {
    setIsLoggedIn(false);
    setDriverName('');
    setPhone('');
    setPassword('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('motorist_logged_in');
      localStorage.removeItem('motorist_phone');
      localStorage.removeItem('motorist_name');
    }
  };

  const handleSendForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (forgotMobile.length < 9) {
      setAuthError('Please enter your registered mobile number.');
      return;
    }
    setForgotOtpSent(true);
    setAuthSuccess('OTP code sent! Use "1234" to verify.');
  };

  const handleVerifyForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (forgotOtp === '1234' || forgotOtp.length === 4) {
      setOtpVerified(true);
      setAuthSuccess('OTP Verified! Enter your new password below.');
    } else {
      setAuthError('Invalid OTP code. Use "1234".');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (newPassword.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }

    setDrivers((prev) =>
      prev.map((d) => (d.mobile === forgotMobile ? { ...d, password: newPassword } : d))
    );

    setAuthSuccess('Password updated successfully! You can now log in.');
    setAuthMode('login');
    setPassword(newPassword);
    setPhone(forgotMobile);
    setForgotOtpSent(false);
    setOtpVerified(false);
  };

  // Dispatch Movement Simulation (Triggered upon manual Garage confirmation)
  useEffect(() => {
    if (!activeIncident) return;

    if (activeIncident.status === 'Mechanic Assigned') {
      const timer = setTimeout(() => {
        const updated: Incident = { ...activeIncident, status: 'Mechanic En Route' };
        setActiveIncident(updated);
        setIncidents((prev) => prev.map((i) => (i.id === activeIncident.id ? updated : i)));
        setMechanics((prev) =>
          prev.map((m) => (String(m.id) === String(activeIncident.mechanicId) ? { ...m, isAvailable: false } : m))
        );
      }, 5000);
      return () => clearTimeout(timer);
    }

    if (activeIncident.status === 'Mechanic En Route') {
      const arrivalTimer = setTimeout(() => {
        const updated: Incident = { ...activeIncident, status: 'On-Site Repair' };
        setActiveIncident(updated);
        setIncidents((prev) => prev.map((i) => (i.id === activeIncident.id ? updated : i)));
      }, 15000);

      return () => {
        clearTimeout(arrivalTimer);
      };
    }
  }, [activeIncident, setActiveIncident, setIncidents]);

  const handleSubmitIncident = (
    category: string,
    baseTariff: number,
    mechanicId: string | number,
    distanceKm: number
  ) => {
    const matchedMech = mechanics.find((m) => String(m.id) === String(mechanicId));
    const assignedEmp = matchedMech?.employees && matchedMech.employees.length > 0 ? matchedMech.employees[0] : undefined;

    const newInc: Incident = {
      id: `inc-${Date.now()}`,
      category,
      lat: reportLocation[0],
      lng: reportLocation[1],
      status: 'Request Sent',
      baseTariff,
      timestamp: new Date().toISOString(),
      mechanicId,
      distanceKm,
      driverName,
      driverPhone: phone,
      assignedEmployee: assignedEmp ? { name: assignedEmp.name, phone: assignedEmp.phone, role: assignedEmp.role } : undefined,
    };

    setIncidents([newInc, ...incidents]);
    setActiveIncident(newInc);
    setReportMode(false);
    setActiveView('tracker');
  };

  const handleCancelIncident = async () => {
    if (!activeIncident) return;
    const reason = prompt('Please enter a reason for cancelling this rescue request:');
    if (!reason || !reason.trim()) return;

    const cancelledIncident: Incident = {
      ...activeIncident,
      status: 'Cancelled',
      cancellationReason: reason.trim(),
      cancelledBy: 'driver',
    };

    addCancelledIncidentId(activeIncident.id);
    const updatedIncidents = incidents.map((i) => (i.id === activeIncident.id ? cancelledIncident : i));
    setIncidents(updatedIncidents);
    setActiveIncident(null);
    setReportMode(false);
    setActiveView('map');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('routerescue_active_incident');
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    setMechanics((prev) =>
      prev.map((m) => (String(m.id) === String(activeIncident.mechanicId) ? { ...m, isAvailable: true } : m))
    );

    try {
      const payload = {
        id: String(cancelledIncident.id),
        category: cancelledIncident.category,
        lat: Number(cancelledIncident.lat),
        lng: Number(cancelledIncident.lng),
        status: 'Cancelled',
        base_tariff: Number(cancelledIncident.baseTariff || 1000),
        timestamp: cancelledIncident.timestamp || new Date().toISOString(),
        mechanic_id: String(cancelledIncident.mechanicId || ''),
        distance_km: Number(cancelledIncident.distanceKm || 0),
        driver_name: cancelledIncident.driverName || 'Anonymous Motorist',
        driver_phone: cancelledIncident.driverPhone || '',
        assigned_employee: cancelledIncident.assignedEmployee || null,
        cancellation_reason: reason.trim(),
        cancelled_by: 'driver',
      };

      const { error } = await supabase.from('incidents').upsert([payload]);
      if (error) {
        console.error('Supabase incident driver cancel error:', error);
        if (error.code === 'PGRST204') {
          await supabase.from('incidents').update({ status: 'Cancelled' }).eq('id', String(activeIncident.id));
          const fallbackPayload = {
            id: String(cancelledIncident.id),
            category: cancelledIncident.category,
            lat: Number(cancelledIncident.lat),
            lng: Number(cancelledIncident.lng),
            status: 'Cancelled',
            base_tariff: Number(cancelledIncident.baseTariff || 1000),
            timestamp: cancelledIncident.timestamp || new Date().toISOString(),
            mechanic_id: String(cancelledIncident.mechanicId || ''),
            distance_km: Number(cancelledIncident.distanceKm || 0),
            driver_name: cancelledIncident.driverName || 'Anonymous Motorist',
            driver_phone: cancelledIncident.driverPhone || '',
            assigned_employee: cancelledIncident.assignedEmployee || null,
          };
          await supabase.from('incidents').upsert([fallbackPayload]);
        }
      }

      if (activeIncident.mechanicId) {
        await supabase
          .from('mechanics')
          .update({ is_available: true })
          .eq('id', String(activeIncident.mechanicId));
      }
    } catch (err) {
      console.error('Error writing driver cancelled incident to Supabase:', err);
    }
  };

  const handleDismissCancelledIncident = () => {
    setActiveIncident(null);
    setReportMode(false);
    setActiveView('map');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('routerescue_active_incident');
      window.dispatchEvent(new Event('local-storage-sync'));
    }
  };

  const handleResolveIncident = async () => {
    if (!activeIncident) return;
    const resolvedIncident: Incident = { ...activeIncident, status: 'Resolved' };
    const updatedIncidents = incidents.map((i) => (i.id === activeIncident.id ? resolvedIncident : i));

    setIncidents(updatedIncidents);
    setActiveIncident(null);
    setActiveView('map');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('routerescue_active_incident');
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    setMechanics((prev) =>
      prev.map((m) =>
        String(m.id) === String(activeIncident.mechanicId)
          ? { ...m, isAvailable: true }
          : m
      )
    );

    try {
      const payload = {
        id: String(resolvedIncident.id),
        category: resolvedIncident.category,
        lat: Number(resolvedIncident.lat),
        lng: Number(resolvedIncident.lng),
        status: 'Resolved',
        base_tariff: Number(resolvedIncident.baseTariff || 1000),
        timestamp: resolvedIncident.timestamp || new Date().toISOString(),
        mechanic_id: String(resolvedIncident.mechanicId || ''),
        distance_km: Number(resolvedIncident.distanceKm || 0),
        driver_name: resolvedIncident.driverName || 'Anonymous Motorist',
        driver_phone: resolvedIncident.driverPhone || '',
        assigned_employee: resolvedIncident.assignedEmployee || null,
      };

      const { error } = await supabase.from('incidents').upsert([payload]);
      if (error) {
        console.error('Supabase incident resolve error:', error);
      }
      if (activeIncident.mechanicId) {
        await supabase
          .from('mechanics')
          .update({ is_available: true })
          .eq('id', String(activeIncident.mechanicId));
      }
    } catch (err) {
      console.error('Error writing resolved incident to Supabase:', err);
    }
  };

  const handleConfirmArrivalOnSite = async () => {
    if (!activeIncident) return;
    const updated: Incident = { ...activeIncident, status: 'On-Site Repair' };
    setActiveIncident(updated);
    setIncidents((prev) => prev.map((i) => (String(i.id) === String(activeIncident.id) ? updated : i)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('routerescue_active_incident', JSON.stringify(updated));
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    try {
      await supabase.from('incidents').update({ status: 'On-Site Repair' }).eq('id', String(updated.id));

      const payload = {
        id: String(updated.id),
        category: updated.category,
        lat: Number(updated.lat),
        lng: Number(updated.lng),
        status: 'On-Site Repair',
        base_tariff: Number(updated.baseTariff || 1000),
        timestamp: updated.timestamp || new Date().toISOString(),
        mechanic_id: String(updated.mechanicId || ''),
        distance_km: Number(updated.distanceKm || 0),
        driver_name: updated.driverName || 'Anonymous Motorist',
        driver_phone: updated.driverPhone || '',
        assigned_employee: updated.assignedEmployee || null,
      };
      const { error } = await supabase.from('incidents').upsert([payload]);
      if (error && error.code === 'PGRST204') {
        const { assigned_employee, ...fallbackPayload } = payload;
        await supabase.from('incidents').upsert([fallbackPayload]);
      }
    } catch (err) {
      console.error('Error writing on-site status to Supabase:', err);
    }
  };

  const isIncidentActive = activeIncident !== null;

  return (
    <div className="relative flex flex-col h-screen w-full select-none overflow-hidden bg-slate-950 text-slate-100">
      {/* 1. AUTH SCREEN OVERLAY */}
      <AnimatePresence>
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col justify-center items-center px-6 relative overflow-hidden"
          >
            <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-accent-orange/5 blur-3xl" />

            <div className="max-w-sm w-full glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-5">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer self-start"
              >
                <ArrowLeft size={14} />
                <span>Return to Home</span>
              </button>

              <div className="text-center flex flex-col items-center">
                <div className="relative group cursor-pointer mb-3">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[24px] blur-md opacity-60 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative h-20 w-20 rounded-[20px] p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden flex items-center justify-center">
                    <div className="absolute -top-8 -left-8 w-20 h-20 bg-gradient-to-br from-white/35 via-white/5 to-transparent rounded-full blur-xs pointer-events-none z-10" />
                    <img
                      src="/logo.png"
                      alt="RouteRescue LK Logo"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  </div>
                </div>
                <h2 className="text-sm font-black text-slate-100 flex items-center justify-center gap-1.5 uppercase tracking-wide">
                  <span className="text-orange-400">ROUTE RESCUE</span>
                  <span className="text-emerald-400 text-[10px] bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black">LK</span>
                  <span className="text-slate-400 font-normal">| Driver Portal</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {authMode === 'login' && 'Log in to request roadside assistance'}
                  {authMode === 'signup' && 'Create your driver account with NIC check'}
                  {authMode === 'forgot' && 'Password recovery via Mobile OTP'}
                </p>
              </div>

              {authError && (
                <div className="text-xs bg-red-950/30 border border-red-500/20 text-red-400 p-3 rounded-xl font-semibold">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="text-xs bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl font-semibold">
                  {authSuccess}
                </div>
              )}

              {/* LOGIN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleDriverLogin} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Mobile Number</label>
                    <div className="relative flex">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+94</span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="771234567"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Password</label>
                      <button
                        type="button"
                        onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('forgot'); }}
                        className="text-[10px] text-accent-orange hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer transition-all active:scale-[0.98] mt-2"
                  >
                    Log In & Enter Map
                  </button>

                  <div className="text-center pt-2 border-t border-slate-850">
                    <span className="text-xs text-slate-500">Don't have a driver account? </span>
                    <button
                      type="button"
                      onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('signup'); }}
                      className="text-xs text-amber-400 hover:underline font-extrabold cursor-pointer"
                    >
                      Register Now
                    </button>
                  </div>
                </form>
              )}

              {/* SIGNUP FORM */}
              {authMode === 'signup' && (
                <form onSubmit={handleDriverSignup} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="words"
                      autoComplete="name"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="e.g. Priyantha Perera"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange cursor-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Mobile Number</label>
                    <div className="relative flex">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+94</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="771234567"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange cursor-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">National Identity Card (NIC)</label>
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      required
                      value={nic}
                      onChange={(e) => setNic(e.target.value.toUpperCase())}
                      placeholder="e.g. 199012345678 or 901234567V"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange cursor-text"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Password</label>
                    <input
                      type="password"
                      inputMode="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange cursor-text"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer transition-all active:scale-[0.98] mt-2"
                  >
                    Create Account & Proceed
                  </button>

                  <div className="text-center pt-2 border-t border-slate-850">
                    <span className="text-xs text-slate-500">Already registered? </span>
                    <button
                      type="button"
                      onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('login'); }}
                      className="text-xs text-amber-400 hover:underline font-extrabold cursor-pointer"
                    >
                      Log In
                    </button>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD OTP FORM */}
              {authMode === 'forgot' && (
                <div className="space-y-3">
                  {!forgotOtpSent && (
                    <form onSubmit={handleSendForgotOtp} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Registered Mobile Number</label>
                        <div className="relative flex">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+94</span>
                          <input
                            type="tel"
                            required
                            value={forgotMobile}
                            onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, ''))}
                            placeholder="771234567"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer"
                      >
                        Send Reset OTP
                      </button>
                    </form>
                  )}

                  {forgotOtpSent && !otpVerified && (
                    <form onSubmit={handleVerifyForgotOtp} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Enter Reset OTP (Use: 1234)</label>
                        <input
                          type="text"
                          required
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          maxLength={4}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 text-center tracking-widest font-extrabold focus:outline-none focus:border-accent-orange"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer"
                      >
                        Verify OTP
                      </button>
                    </form>
                  )}

                  {otpVerified && (
                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Enter New Password</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs border border-emerald-400 cursor-pointer"
                      >
                        Update Password & Return to Login
                      </button>
                    </form>
                  )}

                  <button
                    type="button"
                    onClick={() => { setAuthError(''); setAuthSuccess(''); setAuthMode('login'); }}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-200 pt-2 cursor-pointer"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN MOTORIST DASHBOARD INTERFACE */}
      {isLoggedIn && (
        <>
          {/* Header Bar */}
          <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 shadow-xl">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 text-xs font-black text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-850 border border-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft size={14} className="text-orange-400" />
              <span className="hidden sm:inline">Return Home</span>
            </button>

            {/* City Preset Selector Dropdown */}
            {!reportMode && !isIncidentActive && (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <select
                  value={selectedCity.name}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="bg-transparent text-slate-100 font-black text-xs focus:outline-none cursor-pointer pr-1"
                >
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name} className="bg-slate-950 text-slate-200">
                      📍 {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isIncidentActive && (
              <span className="text-[10px] bg-red-950/60 text-red-400 border border-red-500/50 px-3.5 py-1 rounded-full font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5 shadow-md">
                <Compass size={13} className="animate-spin text-orange-400" />
                <span>Rescue Tracking Live</span>
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 shadow-sm">
                <span className="text-orange-400">👤</span>
                <span>{driverName}</span>
              </span>
              <button
                onClick={handleDriverLogout}
                className="flex items-center gap-1 text-[10px] font-black text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                title="Log Out of Driver Account"
              >
                <LogOut size={11} />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </header>

          {/* Primary View Router */}
          <main className="flex-grow flex flex-col relative w-full h-full overflow-hidden">
            <div className={`w-full h-full flex-grow flex flex-col ${activeView === 'map' ? 'flex' : 'hidden'}`}>
              <MapDashboard
                userLocation={userLocation}
                mapCenter={mapCenter}
                isBrowsingRegion={isBrowsingRegion}
                incidents={incidents}
                mechanics={mechanics.filter((m) => m.status === 'Approved')}
                reportMode={reportMode}
                reportLocation={reportLocation}
                onReportLocationChange={(lat, lng) => {
                  const coords: [number, number] = [lat, lng];
                  setUserLocation(coords);
                  setReportLocation(coords);
                  setMapCenter(coords);
                  const nearest = findNearestCity(coords);
                  setSelectedCity(nearest);
                  setGpsStatus(`Pinned at ${nearest.name}`);
                }}
                onRequestAssistance={() => {
                  setReportLocation(userLocation);
                  setReportMode(true);
                }}
                onLocateMe={handleLocateMe}
                zoom={mapZoom}
              />
            </div>

            {activeView === 'tracker' && (
              <div className="w-full h-full flex flex-col overflow-y-auto">
                <LiveTracker
                  activeIncident={activeIncident}
                  mechanics={mechanics}
                  onCancelIncident={handleCancelIncident}
                  onResolveIncident={handleResolveIncident}
                  onConfirmArrival={handleConfirmArrivalOnSite}
                  onDismissCancelled={handleDismissCancelledIncident}
                />
              </div>
            )}
          </main>

          {/* Breakdown Triage Swipeable Drawer overlay */}
          <TriageDrawer
            isOpen={reportMode}
            onClose={() => setReportMode(false)}
            reportLocation={reportLocation}
            mechanics={mechanics.filter((m) => m.status === 'Approved')}
            onSubmitIncident={handleSubmitIncident}
          />

          {/* Mobile Bottom Action & Navigation Bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-[1000] px-4 pb-5 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pointer-events-none">
            <div className="max-w-md mx-auto flex flex-col gap-2.5 pointer-events-auto">
              {!reportMode && activeView === 'map' && (
                <button
                  onClick={() => {
                    setReportLocation(userLocation);
                    setReportMode(true);
                  }}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-accent-orange via-orange-500 to-red-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.45)] hover:shadow-orange-950/60 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border-2 border-orange-300 cursor-pointer uppercase tracking-wider animate-pulse"
                >
                  <Navigation size={18} className="animate-bounce shrink-0" />
                  <span>Report Breakdown & Triage</span>
                </button>
              )}

              <div className="glass-panel rounded-2xl flex items-center justify-around py-2 px-3 shadow-2xl">
              <button
                onClick={() => {
                  setReportMode(false);
                  setActiveView('map');
                }}
                className="relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl cursor-pointer"
              >
                {activeView === 'map' && (
                  <motion.div
                    layoutId="activeMotoristGlow"
                    className="absolute inset-0 bg-accent-orange/15 rounded-xl border border-accent-orange/30 -z-10"
                  />
                )}
                <span className={`text-xs font-bold transition-colors ${activeView === 'map' ? 'text-accent-orange' : 'text-slate-400'}`}>
                  🗺️ Safety Map
                </span>
              </button>

              <button
                onClick={() => {
                  setReportMode(false);
                  setActiveView('tracker');
                }}
                className="relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl cursor-pointer"
              >
                {activeView === 'tracker' && (
                  <motion.div
                    layoutId="activeMotoristGlow"
                    className="absolute inset-0 bg-accent-orange/15 rounded-xl border border-accent-orange/30 -z-10"
                  />
                )}
                <div className="relative">
                  <span className={`text-xs font-bold transition-colors ${activeView === 'tracker' ? 'text-accent-orange' : 'text-slate-400'}`}>
                    🚨 Live Tracker
                  </span>
                  {isIncidentActive && (
                    <span className="absolute -top-1 -right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-orange"></span>
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </nav>
        </>
      )}
      <MechanicRobotChat userRole="driver" />
    </div>
  );
}
