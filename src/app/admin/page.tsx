'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShieldAlert, Key, UserCheck, CreditCard, Map, Info, Star,
  Building2, Users, Settings, Eye, RefreshCw, X, AlertTriangle, FileText,
  Calendar, Trash2, CheckCircle, Phone, Clock, ShieldCheck, MapPin, ExternalLink, LogOut,
  Search, Filter, CheckCircle2, XCircle, Banknote
} from 'lucide-react';
import { useSharedState, Incident, Mechanic, SEED_MECHANICS, DEFAULT_ADMIN_SETTINGS, AdminSettings, SubscriptionPlan, DEFAULT_PLANS, addCancelledIncidentId, getCancelledIncidentIds, parseTimestampMs } from '../../utils/store';
import { supabase } from '../../utils/supabase';
import dynamic from 'next/dynamic';

const MapInner = dynamic(() => import('../../components/MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 gap-2">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-accent-orange"></div>
      <span className="text-xs">Loading Master Operations Map...</span>
    </div>
  ),
});

export default function SuperAdminDashboard() {
  const router = useRouter();

  // Security Verification State
  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');

  // Active Tab View State: 'live-incidents' | 'completed-history' | 'queue' | 'directory' | 'billing' | 'map' | 'settings'
  const [activeTab, setActiveTab] = useState<'live-incidents' | 'completed-history' | 'queue' | 'directory' | 'billing' | 'map' | 'settings'>('live-incidents');

  // Month & History Filters for completed booking history
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [adminHistoryStatusFilter, setAdminHistoryStatusFilter] = useState<'all' | 'resolved' | 'cancelled'>('all');
  const [adminHistorySearchQuery, setAdminHistorySearchQuery] = useState('');
  const [adminHistoryCategoryFilter, setAdminHistoryCategoryFilter] = useState('all');

  // Directory status filter: 'approved' | 'rejected'
  const [directoryFilter, setDirectoryFilter] = useState<'approved' | 'rejected'>('approved');

  // Directory Modal Details
  const [selectedMechanicModal, setSelectedMechanicModal] = useState<Mechanic | null>(null);

  // Synced Global States
  const [incidents, setIncidents] = useSharedState<Incident[]>('routerescue_incidents', []);
  const [mechanics, setMechanics] = useSharedState<Mechanic[]>('routerescue_mechanics', SEED_MECHANICS);
  const [adminSettings, setAdminSettings] = useSharedState<AdminSettings>('routerescue_admin_settings', DEFAULT_ADMIN_SETTINGS);
  const [plans, setPlans] = useSharedState<SubscriptionPlan[]>('routerescue_plans', DEFAULT_PLANS);

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
            return merged;
          });
        }
      } catch (err) {
        console.error('Real-time admin incidents heartbeat error:', err);
      }
    }

    syncIncidentsFromSupabase();
    const interval = setInterval(syncIncidentsFromSupabase, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setIncidents]);

  // Subscription Plan Form State
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState<number | string>(3000);
  const [newPlanRadius, setNewPlanRadius] = useState<number | string>(15);
  const [newPlanFeature, setNewPlanFeature] = useState('');
  const [newPlanFeatures, setNewPlanFeatures] = useState<string[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Tariff & Passcode Settings Forms
  const [newPasscode, setNewPasscode] = useState(adminSettings?.passcode || '1234');
  const [flatRate, setFlatRate] = useState<number | string>(adminSettings?.flatRate || 1000);
  const [perKmRate, setPerKmRate] = useState<number | string>(adminSettings?.perKmRate || 150);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Garage Capacity & Radius Edit State in Modal
  const [editMaxCapacity, setEditMaxCapacity] = useState<number | string>(3);
  const [editRadius, setEditRadius] = useState<number | string>(5);
  const [editTier, setEditTier] = useState<'Basic' | 'Premium Pro'>('Basic');

  useEffect(() => {
    if (selectedMechanicModal) {
      setEditMaxCapacity(selectedMechanicModal.maxCapacity || (selectedMechanicModal.tier === 'Premium Pro' ? 5 : 3));
      setEditRadius(selectedMechanicModal.radius || (selectedMechanicModal.tier === 'Premium Pro' ? 25 : 5));
      setEditTier(selectedMechanicModal.tier === 'Premium Pro' ? 'Premium Pro' : 'Basic');
    }
  }, [selectedMechanicModal]);

  const handleSaveMechanicCapacityAndSettings = (mechId: number | string) => {
    const newCap = Math.max(1, Number(editMaxCapacity) || 3);
    const newRad = Math.max(1, Number(editRadius) || 5);
    const updatedMechs = mechanics.map((m) =>
      String(m.id) === String(mechId)
        ? {
            ...m,
            maxCapacity: newCap,
            radius: newRad,
            tier: editTier,
          }
        : m
    );
    setMechanics(updatedMechs);
    if (selectedMechanicModal) {
      setSelectedMechanicModal({
        ...selectedMechanicModal,
        maxCapacity: newCap,
        radius: newRad,
        tier: editTier,
      });
    }
    alert(`Updated ${selectedMechanicModal?.businessName || 'Garage'}: Max Capacity set to ${newCap} jobs, Radius set to ${newRad}km!`);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    const priceNum = Number(newPlanPrice) || 0;
    const radiusNum = Number(newPlanRadius) || 5;
    const targetPlanName = newPlanName.trim();

    if (editingPlanId) {
      const updated = plans.map((p) =>
        p.id === editingPlanId
          ? { ...p, name: targetPlanName, price: priceNum, radius: radiusNum, features: newPlanFeatures }
          : p
      );
      setPlans(updated);

      // Instantly propagate radius change to all mechanics on this plan tier!
      const updatedMechanics = mechanics.map((m) => {
        if (
          m.tier === targetPlanName ||
          (targetPlanName === 'Basic' && m.tier === 'Basic') ||
          (targetPlanName === 'Premium Pro' && m.tier === 'Premium Pro')
        ) {
          return { ...m, radius: radiusNum };
        }
        return m;
      });
      setMechanics(updatedMechanics);

      setEditingPlanId(null);
    } else {
      const planObj: SubscriptionPlan = {
        id: `plan-${Date.now()}`,
        name: targetPlanName,
        price: priceNum,
        radius: radiusNum,
        features: newPlanFeatures.length > 0 ? newPlanFeatures : [`${radiusNum}km Dispatch Radius`],
      };
      setPlans([...plans, planObj]);

      const updatedMechanics = mechanics.map((m) => {
        if (
          m.tier === targetPlanName ||
          (targetPlanName === 'Basic' && m.tier === 'Basic') ||
          (targetPlanName === 'Premium Pro' && m.tier === 'Premium Pro')
        ) {
          return { ...m, radius: radiusNum };
        }
        return m;
      });
      setMechanics(updatedMechanics);
    }

    setNewPlanName('');
    setNewPlanPrice(3000);
    setNewPlanRadius(15);
    setNewPlanFeatures([]);
  };

  const handleEditPlan = (p: SubscriptionPlan) => {
    setEditingPlanId(p.id);
    setNewPlanName(p.name);
    setNewPlanPrice(p.price);
    setNewPlanRadius(p.radius);
    setNewPlanFeatures(p.features || []);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('Are you sure you want to delete this subscription plan?')) {
      setPlans(plans.filter((p) => p.id !== planId));
    }
  };

  const handleAddFeature = () => {
    if (newPlanFeature.trim()) {
      setNewPlanFeatures([...newPlanFeatures, newPlanFeature.trim()]);
      setNewPlanFeature('');
    }
  };

  // Emergency Cancel Breakdown Booking Action
  const handleAdminCancelIncident = async (incidentId: string) => {
    const reason = prompt('Enter admin emergency cancellation reason:');
    if (!reason || !reason.trim()) return;

    const targetInc = incidents.find((inc) => inc.id === incidentId);
    if (!targetInc) return;

    const cancelledIncident: Incident = {
      ...targetInc,
      status: 'Cancelled' as const,
      cancellationReason: reason.trim(),
      cancelledBy: 'admin',
    };

    addCancelledIncidentId(incidentId);
    const updatedIncidents = incidents.map((inc) => (inc.id === incidentId ? cancelledIncident : inc));
    setIncidents(updatedIncidents);

    if (typeof window !== 'undefined') {
      const activeIncStr = localStorage.getItem('routerescue_active_incident');
      if (activeIncStr) {
        try {
          const activeInc = JSON.parse(activeIncStr);
          if (activeInc && activeInc.id === incidentId) {
            localStorage.setItem('routerescue_active_incident', JSON.stringify(cancelledIncident));
            window.dispatchEvent(new Event('local-storage-sync'));
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

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
        cancelled_by: 'admin',
      };

      const { error } = await supabase.from('incidents').upsert([payload]);
      if (error) {
        console.error('Supabase admin incident cancel error:', error);
        if (error.code === 'PGRST204') {
          await supabase.from('incidents').update({ status: 'Cancelled' }).eq('id', String(incidentId));
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

      if (targetInc.mechanicId) {
        await supabase
          .from('mechanics')
          .update({ is_available: true })
          .eq('id', String(targetInc.mechanicId));
      }
    } catch (err) {
      console.error('Error writing admin incident cancellation to Supabase:', err);
    }

    alert('Emergency breakdown incident cancelled by Super Admin.');
  };

  // Authenticate session on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const verified = sessionStorage.getItem('admin_verified');
      if (verified === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (adminSettings && passcode.trim() === String(adminSettings.passcode).trim()) {
      setIsAdmin(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_verified', 'true');
      }
    } else {
      setPassError('Invalid Administrator Passcode. Access Denied.');
      setPasscode('');
    }
  };

  const handleApproveVendor = (id: number | string) => {
    const vendorToApprove = mechanics.find((m) => String(m.id) === String(id));
    const updatedList = mechanics.map((m) => {
      const matches =
        String(m.id) === String(id) ||
        (vendorToApprove && (
          (m.nic && vendorToApprove.nic && String(m.nic).trim().toLowerCase() === String(vendorToApprove.nic).trim().toLowerCase()) ||
          (m.phone && vendorToApprove.phone && String(m.phone).trim() === String(vendorToApprove.phone).trim()) ||
          (m.businessName && vendorToApprove.businessName && String(m.businessName).trim().toLowerCase() === String(vendorToApprove.businessName).trim().toLowerCase())
        ));
      return matches ? { ...m, status: 'Approved' as const } : m;
    });

    setMechanics(updatedList);

    if (typeof window !== 'undefined') {
      const storedSessionStr = localStorage.getItem('mechanic_session');
      if (storedSessionStr) {
        try {
          const sessionObj = JSON.parse(storedSessionStr);
          const isMatchingSession =
            String(sessionObj.id) === String(id) ||
            (vendorToApprove && (
              (sessionObj.nic && vendorToApprove.nic && String(sessionObj.nic).trim().toLowerCase() === String(vendorToApprove.nic).trim().toLowerCase()) ||
              (sessionObj.phone && vendorToApprove.phone && String(sessionObj.phone).trim() === String(vendorToApprove.phone).trim()) ||
              (sessionObj.businessName && vendorToApprove.businessName && String(sessionObj.businessName).trim().toLowerCase() === String(vendorToApprove.businessName).trim().toLowerCase())
            ));
          if (isMatchingSession) {
            localStorage.setItem('mechanic_session', JSON.stringify({ ...sessionObj, status: 'Approved' }));
            window.dispatchEvent(new Event('local-storage-sync'));
          }
        } catch (e) {}
      }
    }
  };

  const handleRejectVendor = (id: number | string) => {
    const vendorToReject = mechanics.find((m) => String(m.id) === String(id));
    setMechanics(
      mechanics.map((m) => {
        const matches =
          String(m.id) === String(id) ||
          (vendorToReject && (
            (m.nic && vendorToReject.nic && String(m.nic).trim().toLowerCase() === String(vendorToReject.nic).trim().toLowerCase()) ||
            (m.phone && vendorToReject.phone && String(m.phone).trim() === String(vendorToReject.phone).trim()) ||
            (m.businessName && vendorToReject.businessName && String(m.businessName).trim().toLowerCase() === String(vendorToReject.businessName).trim().toLowerCase())
          ));
        return matches ? { ...m, status: 'Rejected' } : m;
      })
    );
  };

  const handleToggleTier = (id: number | string) => {
    setMechanics(
      mechanics.map((m) => {
        if (String(m.id) === String(id)) {
          const nextTier = m.tier === 'Premium Pro' ? 'Basic' : 'Premium Pro';
          const nextRadius = nextTier === 'Premium Pro' ? 25 : 5;
          const nextMaxCap = nextTier === 'Premium Pro' ? 15 : 5;
          return { ...m, tier: nextTier, radius: nextRadius, maxCapacity: nextMaxCap };
        }
        return m;
      })
    );
  };

  const handleDeleteMechanic = (id: number | string) => {
    const mechToDelete = mechanics.find((m) => String(m.id) === String(id));
    const mechName = mechToDelete ? (mechToDelete.businessName || mechToDelete.name) : 'this garage';

    if (!confirm(`⚠️ Confirm Permanent Deletion:\n\nAre you sure you want to permanently delete "${mechName}" from RouteRescue LK system? This action cannot be undone.`)) {
      return;
    }

    setMechanics(mechanics.filter((m) => String(m.id) !== String(id)));

    if (typeof window !== 'undefined') {
      const storedSessionStr = localStorage.getItem('mechanic_session');
      if (storedSessionStr) {
        try {
          const sessionObj = JSON.parse(storedSessionStr);
          if (String(sessionObj.id) === String(id) || (mechToDelete && sessionObj.phone === mechToDelete.phone)) {
            localStorage.removeItem('mechanic_session');
          }
        } catch (e) {}
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminSettings = {
      passcode: newPasscode,
      flatRate: Number(flatRate),
      perKmRate: Number(perKmRate),
    };
    setAdminSettings(updated);
    setSettingsMessage('Saving settings to database...');

    try {
      const { data: existing } = await supabase.from('admin_settings').select('*');
      let result;
      if (existing && existing.length > 0) {
        result = await supabase
          .from('admin_settings')
          .update({
            passcode: newPasscode,
            flat_rate: Number(flatRate),
            per_km_rate: Number(perKmRate),
          })
          .eq('id', existing[0].id);
      } else {
        result = await supabase.from('admin_settings').insert([
          {
            id: 1,
            passcode: newPasscode,
            flat_rate: Number(flatRate),
            per_km_rate: Number(perKmRate),
          },
        ]);
      }

      if (result.error) {
        console.error('Supabase admin_settings error:', result.error);
        setSettingsMessage(`⚠️ Database error: ${result.error.message}`);
      } else {
        setSettingsMessage('✅ Settings and Base Tariff Rates saved to database & live system!');
      }
    } catch (err: any) {
      console.error('Error updating admin_settings:', err);
      setSettingsMessage(`⚠️ Error: ${err.message || 'Failed to update database'}`);
    }
  };

  const handleResetMockDataset = () => {
    setMechanics(SEED_MECHANICS);
    setIncidents([]);
    setAdminSettings(DEFAULT_ADMIN_SETTINGS);
    setSettingsMessage('Mock dataset reset to initial Sri Lankan city garages!');
  };

  const handleApproveLocationChange = async (id: number | string) => {
    const vendor = mechanics.find((m) => String(m.id) === String(id));
    if (!vendor || !vendor.pendingLocation) return;

    const newCity = vendor.pendingLocation.city;
    const newLat = vendor.pendingLocation.lat;
    const newLng = vendor.pendingLocation.lng;

    const updatedList = mechanics.map((m) => {
      const matches =
        String(m.id) === String(id) ||
        (vendor && (
          (m.nic && vendor.nic && String(m.nic).trim().toLowerCase() === String(vendor.nic).trim().toLowerCase()) ||
          (m.phone && vendor.phone && String(m.phone).trim() === String(vendor.phone).trim())
        ));
      if (matches) {
        const { pendingLocation, ...rest } = m;
        return {
          ...rest,
          city: newCity,
          lat: newLat,
          lng: newLng,
        };
      }
      return m;
    });

    setMechanics(updatedList);

    if (typeof window !== 'undefined') {
      const storedSessionStr = localStorage.getItem('mechanic_session');
      if (storedSessionStr) {
        try {
          const sessionObj = JSON.parse(storedSessionStr);
          if (String(sessionObj.id) === String(id) || (vendor && sessionObj.phone === vendor.phone)) {
            const { pendingLocation, ...restSession } = sessionObj;
            localStorage.setItem(
              'mechanic_session',
              JSON.stringify({
                ...restSession,
                city: newCity,
                lat: newLat,
                lng: newLng,
              })
            );
            window.dispatchEvent(new Event('local-storage-sync'));
          }
        } catch (e) {}
      }
    }

    alert(`✅ Location change approved for ${vendor.businessName || vendor.name}.\n\nNew Location: ${newCity} (${newLat.toFixed(4)}, ${newLng.toFixed(4)}) is now LIVE for motorist searches.`);
  };

  const handleRejectLocationChange = (id: number | string) => {
    const vendor = mechanics.find((m) => String(m.id) === String(id));
    if (!vendor || !vendor.pendingLocation) return;

    const updatedList = mechanics.map((m) => {
      if (String(m.id) === String(id)) {
        const { pendingLocation, ...rest } = m;
        return rest;
      }
      return m;
    });

    setMechanics(updatedList);

    if (typeof window !== 'undefined') {
      const storedSessionStr = localStorage.getItem('mechanic_session');
      if (storedSessionStr) {
        try {
          const sessionObj = JSON.parse(storedSessionStr);
          if (String(sessionObj.id) === String(id)) {
            const { pendingLocation, ...restSession } = sessionObj;
            localStorage.setItem('mechanic_session', JSON.stringify(restSession));
            window.dispatchEvent(new Event('local-storage-sync'));
          }
        } catch (e) {}
      }
    }

    alert(`Location change request rejected for ${vendor.businessName || vendor.name}.`);
  };

  const approvedMechanics = mechanics.filter((m) => m.status === 'Approved');
  const basicCount = approvedMechanics.filter((m) => m.tier === 'Basic').length;
  const premiumCount = approvedMechanics.filter((m) => m.tier === 'Premium Pro').length;
  const totalMonthlyRevenue = basicCount * 1500 + premiumCount * 5000;

  const pendingQueue = mechanics.filter((m) => m.status === 'Pending');
  const pendingLocationRequests = mechanics.filter((m) => Boolean(m.pendingLocation));
  const rejectedGarages = mechanics.filter((m) => m.status === 'Rejected');

  const activeIncidentsList = incidents.filter((i) => i.status !== 'Resolved' && i.status !== 'Cancelled');
  const completedIncidentsList = incidents
    .filter((i) => {
      if (i.status !== 'Resolved' && i.status !== 'Cancelled') return false;
      if (selectedMonth === 'All') return true;
      const dateStr = new Date(i.timestamp).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return dateStr.toLowerCase().includes(selectedMonth.toLowerCase());
    })
    .sort((a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp));

  const adminHistoryResolvedCount = completedIncidentsList.filter((i) => i.status === 'Resolved').length;
  const adminHistoryCancelledCount = completedIncidentsList.filter((i) => i.status === 'Cancelled').length;
  const adminHistoryTotalRevenue = completedIncidentsList
    .filter((i) => i.status === 'Resolved')
    .reduce((acc, i) => acc + Number(i.baseTariff || 1000), 0);

  const filteredAdminHistory = completedIncidentsList.filter((inc) => {
    if (adminHistoryStatusFilter === 'resolved' && inc.status !== 'Resolved') return false;
    if (adminHistoryStatusFilter === 'cancelled' && inc.status !== 'Cancelled') return false;
    if (adminHistoryCategoryFilter !== 'all' && inc.category !== adminHistoryCategoryFilter) return false;
    if (adminHistorySearchQuery.trim()) {
      const q = adminHistorySearchQuery.toLowerCase().trim();
      const garage = mechanics.find((m) => String(m.id) === String(inc.mechanicId));
      const matchId = String(inc.id).toLowerCase().includes(q);
      const matchCat = String(inc.category).toLowerCase().includes(q);
      const matchDriver = String(inc.driverName || '').toLowerCase().includes(q);
      const matchPhone = String(inc.driverPhone || '').toLowerCase().includes(q);
      const matchGarage = String(garage?.businessName || garage?.name || '').toLowerCase().includes(q);
      const matchReason = String(inc.cancellationReason || '').toLowerCase().includes(q);
      const matchBy = String(inc.cancelledBy || '').toLowerCase().includes(q);
      return matchId || matchCat || matchDriver || matchPhone || matchGarage || matchReason || matchBy;
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-6 relative overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-accent-orange/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-red-500/5 blur-3xl" />

        <div className="max-w-sm w-full glass-panel p-6 rounded-2xl border-slate-800 flex flex-col gap-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer self-start"
          >
            <ArrowLeft size={14} />
            <span>Return to Home</span>
          </button>

          <div className="text-center flex flex-col items-center">
            <div className="relative group cursor-pointer mb-3">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-[26px] blur-md opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
              <div className="relative h-24 w-24 rounded-[22px] p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden flex items-center justify-center">
                <div className="absolute -top-10 -left-10 w-24 h-24 bg-gradient-to-br from-white/35 via-white/5 to-transparent rounded-full blur-xs pointer-events-none z-10" />
                <img
                  src="/logo.png"
                  alt="RouteRescue LK Logo"
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
            </div>
            <h2 className="text-lg font-extrabold text-slate-200 flex items-center justify-center gap-2">
              <ShieldAlert className="text-red-500 animate-pulse" size={20} />
              <span>Super Admin Portal</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter the administration passcode to audit platform subscribers and operational maps.
            </p>
          </div>

          {passError && (
            <div className="text-xs bg-red-950/30 border border-red-500/20 text-red-400 p-3 rounded-xl font-semibold leading-normal">
              {passError}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Security Key</label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-accent-orange text-center tracking-widest"
              />
            </div>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-left text-[9px] text-slate-500 flex items-start gap-2">
              <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <span>Use passcode <code className="text-amber-500 font-semibold">1234</code> to enter. Admin panel oversees subscriber credentials and platform maps.</span>
            </div>
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer transition-all active:scale-[0.98]"
            >
              Verify Passcode
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setPasscode('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_session');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col px-4 py-6 relative overflow-x-hidden select-none">
      {/* Brand Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-900 mb-6 shrink-0">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={18} />
            <span className="text-sm font-extrabold uppercase tracking-wider text-slate-200 hidden sm:inline">
              Super Admin Control Center
            </span>
          </div>
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-extrabold transition-all cursor-pointer"
          >
            <LogOut size={13} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto flex-grow flex flex-col gap-6">
        {/* Navigation Bar - 7 Super Admin Tabs */}
        <div className="glass-panel p-1.5 rounded-2xl border-slate-800 flex items-center justify-between shadow-md shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('live-incidents')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'live-incidents' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <AlertTriangle size={14} className="text-red-400" />
            <span>Active Calls ({activeIncidentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed-history')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'completed-history' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <FileText size={14} className="text-emerald-400" />
            <span>Completed Log ({completedIncidentsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 relative ${activeTab === 'queue' ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <UserCheck size={14} />
            <span>Pending Queue ({pendingQueue.length + pendingLocationRequests.length})</span>
            {pendingLocationRequests.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'directory' ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Building2 size={14} />
            <span>Garages ({approvedMechanics.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'billing' ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <CreditCard size={14} />
            <span>Billing</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'map' ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Map size={14} />
            <span>Master Map</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 px-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${activeTab === 'settings' ? 'bg-accent-orange/15 text-accent-orange border border-accent-orange/30' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>

        {/* TAB: LIVE ACTIVE EMERGENCY BREAKDOWNS */}
        {activeTab === 'live-incidents' && (
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="text-red-400 animate-pulse" size={16} />
                    <span>Live Active Emergency Breakdown Bookings</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Real-time control center view of all active motorist rescue requests across Sri Lanka.
                  </p>
                </div>
                <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold border border-red-500/30">
                  {activeIncidentsList.length} Active Calls
                </span>
              </div>

              {activeIncidentsList.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <CheckCircle size={32} className="mx-auto text-emerald-500/60" />
                  <p className="text-xs font-semibold">No active emergency breakdown incidents right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeIncidentsList.map((inc) => {
                    const assignedGarage = mechanics.find((m) => String(m.id) === String(inc.mechanicId));
                    return (
                      <div key={inc.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-850 space-y-3 shadow-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-accent-orange/15 text-accent-orange px-2 py-0.5 rounded font-mono font-bold uppercase border border-accent-orange/30">
                              {inc.id}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-100 mt-1">{inc.category}</h4>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${inc.status === 'Request Sent'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}>
                            {inc.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Customer Driver:</span>
                            <span className="font-semibold">{inc.driverName || 'Motorist'} ({inc.driverPhone || '0771234567'})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Confirmed Garage:</span>
                            <span className="font-semibold text-emerald-400">{assignedGarage ? (assignedGarage.businessName || assignedGarage.name) : 'Searching Nearby Garages...'}</span>
                          </div>
                          {inc.assignedEmployee && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Assigned Technician:</span>
                              <span className="font-semibold text-cyan-400">{inc.assignedEmployee.name} ({inc.assignedEmployee.phone} - {inc.assignedEmployee.role})</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Est. Tariff & Distance:</span>
                            <span className="font-bold text-amber-400">{inc.baseTariff?.toLocaleString()} LKR ({inc.distanceKm || 2.5} km)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Reported Time:</span>
                            <span className="text-[10px] text-slate-400">{new Date(inc.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleAdminCancelIncident(inc.id)}
                            className="py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold text-xs border border-red-500/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                          >
                            <Trash2 size={13} />
                            <span>Emergency Cancel Booking</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: MONTHLY COMPLETED BOOKINGS HISTORY EVIDENCE LOGS */}
        {activeTab === 'completed-history' && (
          <div className="space-y-6">
            {/* Executive Key Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-panel p-4 rounded-2xl border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Operations</span>
                  <FileText size={16} className="text-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-slate-100">{completedIncidentsList.length}</span>
                  <span className="text-[10px] text-slate-400">Audit Logs</span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Successfully Resolved</span>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-400">{adminHistoryResolvedCount}</span>
                  <span className="text-[10px] text-emerald-400/80">Completed</span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl border-red-500/20 bg-red-950/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-red-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Cancelled / Rejected</span>
                  <XCircle size={16} className="text-red-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-red-400">{adminHistoryCancelledCount}</span>
                  <span className="text-[10px] text-red-400/80">Terminated</span>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl border-amber-500/20 bg-amber-950/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-amber-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Revenue Billed</span>
                  <Banknote size={16} className="text-amber-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-amber-400">{adminHistoryTotalRevenue.toLocaleString()}</span>
                  <span className="text-[10px] text-amber-400/80">LKR</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="text-emerald-400" size={16} />
                    <span>Monthly Completed Bookings Audit Evidence Records</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Full audit log of resolved and cancelled emergency breakdown rescue operations across Sri Lanka.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Dropdown Filter */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                    <Filter size={14} className="text-slate-400" />
                    <select
                      value={adminHistoryCategoryFilter}
                      onChange={(e) => setAdminHistoryCategoryFilter(e.target.value)}
                      className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900">All Categories</option>
                      <option value="Flat Tire" className="bg-slate-900">Flat Tire</option>
                      <option value="Electrical/Won't Start" className="bg-slate-900">Electrical / Won't Start</option>
                      <option value="Smoke/Overheating" className="bg-slate-900">Smoke / Overheating</option>
                      <option value="Completely Stalled" className="bg-slate-900">Completely Stalled</option>
                      <option value="Accident Assistance" className="bg-slate-900">Accident Assistance</option>
                      <option value="Fuel/Battery" className="bg-slate-900">Fuel / Battery</option>
                    </select>
                  </div>

                  {/* Month Filter Selector */}
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                    <Calendar size={14} className="text-amber-400" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="All" className="bg-slate-900">All Months (Evidence Log)</option>
                      <option value="August 2026" className="bg-slate-900">August 2026</option>
                      <option value="July 2026" className="bg-slate-900">July 2026</option>
                      <option value="June 2026" className="bg-slate-900">June 2026</option>
                      <option value="May 2026" className="bg-slate-900">May 2026</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Interactive Status Segment Filters & Real-Time Search Bar */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                {/* Status Sub-Tabs */}
                <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl gap-1 shrink-0">
                  <button
                    onClick={() => setAdminHistoryStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      adminHistoryStatusFilter === 'all'
                        ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>All Logged</span>
                    <span className="bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
                      {completedIncidentsList.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminHistoryStatusFilter('resolved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      adminHistoryStatusFilter === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Resolved</span>
                    <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full text-[10px]">
                      {adminHistoryResolvedCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminHistoryStatusFilter('cancelled')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      adminHistoryStatusFilter === 'cancelled'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-md'
                        : 'text-slate-400 hover:text-red-400'
                    }`}
                  >
                    <XCircle size={13} className="text-red-400" />
                    <span>Cancelled / Rejected</span>
                    <span className="bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded-full text-[10px]">
                      {adminHistoryCancelledCount}
                    </span>
                  </button>
                </div>

                {/* Instant Search Input Bar */}
                <div className="relative flex-grow max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={adminHistorySearchQuery}
                    onChange={(e) => setAdminHistorySearchQuery(e.target.value)}
                    placeholder="Search incident ID, driver, garage, category, or reason..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent-orange"
                  />
                  {adminHistorySearchQuery && (
                    <button
                      onClick={() => setAdminHistorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {filteredAdminHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No booking records match your selected status or filter keywords.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Inc Ref ID</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Driver / Motorist</th>
                        <th className="py-2.5 px-3">Servicing Garage</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Tariff Billed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60">
                      {filteredAdminHistory.map((inc) => {
                        const garage = mechanics.find((m) => String(m.id) === String(inc.mechanicId));
                        return (
                          <tr key={inc.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-300">{inc.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-200">{inc.category}</td>
                            <td className="py-3 px-3 text-slate-300">{inc.driverName || 'Motorist'} ({inc.driverPhone || '0771234567'})</td>
                            <td className="py-3 px-3 text-emerald-400 font-semibold">{garage ? (garage.businessName || garage.name) : 'Assigned Garage'}</td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">{new Date(inc.timestamp).toLocaleString()}</td>
                            <td className="py-3 px-3">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${inc.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                {inc.status === 'Resolved' ? 'Resolved / Completed' : `Cancelled (${inc.cancelledBy || 'System'})`}
                              </span>
                              {inc.status === 'Cancelled' && inc.cancellationReason && (
                                <p className="text-[10px] text-red-300 mt-1 italic leading-tight">
                                  Reason: {inc.cancellationReason}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-amber-400">{inc.baseTariff?.toLocaleString()} LKR</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: PENDING APPROVALS QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Garage Location Change Requests */}
            {pendingLocationRequests.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border-amber-500/40 bg-amber-950/20 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-400" size={18} />
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Pending Garage Location Change Requests ({pendingLocationRequests.length})
                    </h3>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                    Location Approvals
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  The following garages have requested to update their registered workshop location. The garage's current location remains live on the motorist map until approved.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingLocationRequests.map((vendor) => (
                    <div key={vendor.id} className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col justify-between gap-3 shadow-md">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-100">{vendor.businessName || vendor.name}</h4>
                            <div className="text-xs text-slate-400 mt-0.5">Owner: {vendor.name} • Phone: {vendor.phone}</div>
                          </div>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                            Request Pending
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <div className="text-[9px] text-emerald-400 font-bold uppercase">Current Active (Live)</div>
                            <div className="font-extrabold text-slate-200 mt-0.5">{vendor.city}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {vendor.lat?.toFixed(4)}, {vendor.lng?.toFixed(4)}
                            </div>
                          </div>

                          <div className="bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
                            <div className="text-[9px] text-amber-300 font-bold uppercase">Requested New Location</div>
                            <div className="font-extrabold text-amber-200 mt-0.5">{vendor.pendingLocation?.city}</div>
                            <div className="text-[10px] font-mono text-amber-300/80">
                              {vendor.pendingLocation?.lat.toFixed(4)}, {vendor.pendingLocation?.lng.toFixed(4)}
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Submitted on {vendor.pendingLocation?.requestedAt}. <br />
                          ℹ️ <em>Current active location ({vendor.city}) is operating live on motorist rescue map until you approve.</em>
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleRejectLocationChange(vendor.id)}
                          className="flex-1 py-2 rounded-xl bg-slate-950 hover:bg-slate-850 text-red-400 border border-red-500/30 text-xs font-bold cursor-pointer transition-all"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleApproveLocationChange(vendor.id)}
                          className="flex-1 py-2 rounded-xl bg-accent-green hover:bg-emerald-600 text-slate-950 text-xs font-extrabold border border-emerald-400 cursor-pointer transition-all shadow-sm"
                        >
                          Approve New Location
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel p-4 rounded-xl border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Vendor Verification Queue
              </h3>
              <p className="text-[11px] text-slate-400">
                Audit newly registered garages and mechanics. Verify National Identity Card (NIC) details before issuing activation approvals.
              </p>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center text-xs text-slate-500 border-slate-800">
                👍 Queue cleared! No pending garage approvals requiring audit.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingQueue.map((vendor) => (
                  <div key={vendor.id} className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-100">{vendor.businessName || vendor.name}</h4>
                          <div className="text-xs text-slate-400 mt-0.5">Owner: {vendor.name}</div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${vendor.tier === 'Premium Pro' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                          {vendor.tier} ({vendor.radius}km)
                        </span>
                      </div>

                      <div className="mt-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                        <div className="text-slate-300">NIC: <strong className="text-accent-yellow">{vendor.nic || 'Not Provided'}</strong></div>
                        <div className="text-slate-400">Phone: <strong>{vendor.phone}</strong></div>
                        <div className="text-slate-400">City: <strong>{vendor.city}</strong></div>
                        <div className="text-slate-400 font-mono text-[10px] pt-1">
                          GPS: <strong className="text-cyan-400">{vendor.lat ? vendor.lat.toFixed(5) : '6.9271'}, {vendor.lng ? vendor.lng.toFixed(5) : '79.8612'}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMechanicModal(vendor)}
                        className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <MapPin size={13} className="text-cyan-400" />
                        <span>Audit Workshop Location on Map</span>
                      </button>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => handleRejectVendor(vendor.id)}
                        className="flex-1 py-2 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 text-amber-400 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveVendor(vendor.id)}
                        className="flex-1 py-2 rounded-xl bg-accent-green hover:bg-emerald-600 text-slate-950 text-xs font-extrabold border border-emerald-400 cursor-pointer transition-all"
                      >
                        Approve Garage
                      </button>
                      <button
                        onClick={() => handleDeleteMechanic(vendor.id)}
                        className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-950/80 text-red-400 border border-red-500/40 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1"
                        title="Delete Garage Account"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GARAGE DIRECTORY MODAL VIEW */}
        {activeTab === 'directory' && (
          <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Nationwide Garage Directory
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verified active service garages & rejected vendor archive.
                </p>
              </div>

              {/* Status Filter Toggle */}
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-850">
                <button
                  onClick={() => setDirectoryFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    directoryFilter === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle size={13} className="text-emerald-400" />
                  <span>Approved Active ({approvedMechanics.length})</span>
                </button>
                <button
                  onClick={() => setDirectoryFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                    directoryFilter === 'rejected'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <X size={13} className="text-red-400" />
                  <span>Rejected Archive ({rejectedGarages.length})</span>
                </button>
              </div>
            </div>

            {directoryFilter === 'approved' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="pb-3 pt-2 font-bold">Garage Name</th>
                      <th className="pb-3 pt-2 font-bold">City</th>
                      <th className="pb-3 pt-2 font-bold">Status</th>
                      <th className="pb-3 pt-2 font-bold">Duty State</th>
                      <th className="pb-3 pt-2 font-bold">Tier</th>
                      <th className="pb-3 pt-2 font-bold">Roster Count</th>
                      <th className="pb-3 pt-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-200">
                    {approvedMechanics.map((mech) => (
                      <tr key={mech.id} className="hover:bg-slate-900/50">
                        <td className="py-3 font-bold text-slate-100">{mech.businessName || mech.name}</td>
                        <td className="py-3 font-semibold text-slate-300">{mech.city}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              Approved
                            </span>
                            {mech.pendingLocation && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
                                Location Change Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {mech.isOpen === false ? (
                            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-extrabold">
                              🔴 CLOSED / HOLIDAY
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">
                              🟢 OPEN TODAY
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-slate-300">{mech.tier} ({mech.radius}km)</td>
                        <td className="py-3 font-bold text-amber-400">{mech.employees?.length || 1} Staff</td>
                        <td className="py-3 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedMechanicModal(mech)}
                            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>Audit & Roster</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMechanic(mech.id)}
                            className="py-1.5 px-2.5 bg-red-950/30 hover:bg-red-950/60 text-red-400 text-xs font-bold rounded-lg border border-red-500/30 flex items-center gap-1 cursor-pointer transition-all"
                            title="Permanently Delete Garage"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-3">
                {rejectedGarages.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                    No rejected garage registrations in archive.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                          <th className="pb-3 pt-2 font-bold">Rejected Garage</th>
                          <th className="pb-3 pt-2 font-bold">Owner & NIC</th>
                          <th className="pb-3 pt-2 font-bold">City</th>
                          <th className="pb-3 pt-2 font-bold">Status</th>
                          <th className="pb-3 pt-2 font-bold text-right">Re-Audit / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-200">
                        {rejectedGarages.map((mech) => (
                          <tr key={mech.id} className="hover:bg-slate-900/50">
                            <td className="py-3 font-bold text-slate-100">{mech.businessName || mech.name}</td>
                            <td className="py-3 text-slate-300">{mech.name} ({mech.nic || 'N/A'})</td>
                            <td className="py-3 font-semibold text-slate-300">{mech.city}</td>
                            <td className="py-3">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold border bg-red-500/20 text-red-400 border-red-500/30">
                                Rejected
                              </span>
                            </td>
                            <td className="py-3 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedMechanicModal(mech)}
                                className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-bold rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
                              >
                                <MapPin size={12} />
                                <span>Location Audit</span>
                              </button>
                              <button
                                onClick={() => handleApproveVendor(mech.id)}
                                className="py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-extrabold rounded-lg border border-emerald-500/30 cursor-pointer"
                              >
                                Re-Approve
                              </button>
                              <button
                                onClick={() => handleDeleteMechanic(mech.id)}
                                className="py-1.5 px-2.5 bg-red-950/30 hover:bg-red-950/60 text-red-400 text-xs font-bold rounded-lg border border-red-500/30 flex items-center gap-1 cursor-pointer transition-all"
                                title="Permanently Delete Garage"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BILLING OVERSIGHT */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Approved Garages</span>
                <span className="text-xl font-extrabold text-slate-100 mt-1 block">
                  {approvedMechanics.length} <span className="text-xs font-normal text-slate-400">Nodes</span>
                </span>
              </div>
              <div className="glass-panel p-5 rounded-2xl border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Basic vs Pro Split</span>
                <span className="text-xl font-extrabold text-amber-400 mt-1 block">
                  {basicCount} Basic / {premiumCount} Pro
                </span>
              </div>
              <div className="glass-panel p-5 rounded-2xl border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Estimated Monthly Revenue</span>
                <span className="text-xl font-extrabold text-accent-green mt-1 block">
                  {totalMonthlyRevenue.toLocaleString()} LKR
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Subscription Oversight Controls</h4>

              <div className="space-y-3">
                {approvedMechanics.map((mech) => (
                  <div key={mech.id} className="bg-slate-900 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                      <div className="font-bold text-slate-100">{mech.businessName || mech.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">City: {mech.city} • Phone: {mech.phone} • Tier: <strong className="text-amber-400">{mech.tier}</strong></div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleTier(mech.id)}
                        className="py-1.5 px-3 bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer hover:border-slate-700"
                      >
                        Toggle Tier
                      </button>
                      <button
                        onClick={() => handleDeleteMechanic(mech.id)}
                        className="py-1.5 px-3 bg-red-950/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg cursor-pointer hover:bg-red-950/40"
                      >
                        Revoke Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MASTER PLATFORM MAP */}
        {activeTab === 'map' && (
          <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4 flex-grow flex flex-col min-h-[60vh]">
            <div>
              <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Master Platform Map - Sri Lanka Operations</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Live view of active incident calls and nationwide garage nodes.</p>
            </div>

            <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
              <MapInner
                userLocation={[7.8731, 80.7718]}
                zoom={8}
                incidents={incidents}
                mechanics={approvedMechanics}
                reportMode={false}
                reportLocation={[7.8731, 80.7718]}
                onReportLocationChange={() => { }}
                audioAlertEnabled={false}
              />
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY & TARIFF SETTINGS */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSaveSettings} className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Settings size={16} className="text-accent-orange" />
                <span>Base Tariff Configurator</span>
              </h3>

              {settingsMessage && (
                <div className="text-xs bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl font-semibold">
                  {settingsMessage}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Admin Passcode Key</label>
                <input
                  type="text"
                  required
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Flat Arrival Fee (LKR)</label>
                <input
                  type="number"
                  required
                  value={flatRate}
                  onChange={(e) => setFlatRate(e.target.value === '' ? '' : e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Distance Rate (LKR / km)</label>
                <input
                  type="number"
                  required
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(e.target.value === '' ? '' : e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-orange"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-accent-orange hover:bg-orange-600 text-slate-950 font-bold text-xs border border-orange-400 cursor-pointer"
              >
                Save Settings
              </button>
            </form>

            {/* SUBSCRIPTION PLANS CONFIGURATOR */}
            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-amber-400" />
                <span>Subscription Plans & Tiers Configurator</span>
              </h3>

              {/* Plans List */}
              <div className="space-y-2">
                {plans.map((p) => (
                  <div key={p.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                          {p.price.toLocaleString()} LKR/mo
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.radius}km Dispatch Radius • {p.features?.length || 0} features
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEditPlan(p)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-bold rounded-lg border border-red-500/30 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Plan Form */}
              <form onSubmit={handleSavePlan} className="pt-3 border-t border-slate-850 space-y-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {editingPlanId ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Plan Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise Pro"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Price (LKR/mo)</label>
                    <input
                      type="number"
                      required
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value === '' ? '' : e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Dispatch Radius (km)</label>
                    <input
                      type="number"
                      required
                      value={newPlanRadius}
                      onChange={(e) => setNewPlanRadius(e.target.value === '' ? '' : e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-md"
                  >
                    {editingPlanId ? 'Update Subscription Plan' : 'Add New Subscription Plan'}
                  </button>
                  {editingPlanId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlanId(null);
                        setNewPlanName('');
                        setNewPlanPrice(3000);
                        setNewPlanRadius(15);
                      }}
                      className="px-3 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* MECHANIC DIRECTORY MODAL DETAILS */}
      <AnimatePresence>
        {selectedMechanicModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMechanicModal(null)}
              className="fixed inset-0 bg-slate-950 z-[3000]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3100] max-w-md w-[90%] glass-panel-heavy p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4 bg-slate-950"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <Building2 size={16} className="text-accent-orange" />
                  <span>{selectedMechanicModal.businessName || selectedMechanicModal.name}</span>
                </h4>
                <button onClick={() => setSelectedMechanicModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-850 pb-1.5">
                  <span className="text-slate-400">Owner Name</span>
                  <span className="font-bold text-slate-200">{selectedMechanicModal.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1.5">
                  <span className="text-slate-400">Phone Number</span>
                  <span className="font-bold text-slate-200">{selectedMechanicModal.phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1.5">
                  <span className="text-slate-400">NIC Credential</span>
                  <span className="font-bold text-accent-yellow">{selectedMechanicModal.nic || '881234567V'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850 pb-1.5">
                  <span className="text-slate-400">City & Workshop GPS</span>
                  <span className="font-mono text-cyan-400 font-bold text-[11px]">
                    {selectedMechanicModal.city} ({selectedMechanicModal.lat ? selectedMechanicModal.lat.toFixed(5) : '6.9271'}, {selectedMechanicModal.lng ? selectedMechanicModal.lng.toFixed(5) : '79.8612'})
                  </span>
                </div>

                <div className="pt-1 pb-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedMechanicModal.lat || 6.9271},${selectedMechanicModal.lng || 79.8612}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all block text-center shadow-md"
                  >
                    <ExternalLink size={14} />
                    <span>Open Satellite Audit in Google Maps ↗</span>
                  </a>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-extrabold block mb-2">Registered Staff Roster ({selectedMechanicModal.employees?.length || 0})</span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {selectedMechanicModal.employees?.map((emp) => (
                      <div key={emp.id} className="bg-slate-900 p-2 rounded-lg border border-slate-850 flex justify-between items-center text-[11px]">
                        <div>
                          <strong className="text-slate-200">{emp.name}</strong>
                          <div className="text-[9px] text-slate-400">{emp.role}</div>
                        </div>
                        <span className="text-slate-400 font-semibold">{emp.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Capacity & Radius Configuration Controls */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2 mt-2">
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">
                    ⚡ Admin Garage Capacity & Operating Radius Controls
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">Max Capacity</label>
                      <input
                        type="number"
                        value={editMaxCapacity}
                        onChange={(e) => setEditMaxCapacity(e.target.value === '' ? '' : e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">Radius (km)</label>
                      <input
                        type="number"
                        value={editRadius}
                        onChange={(e) => setEditRadius(e.target.value === '' ? '' : e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                        placeholder="e.g. 25"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block mb-1">Tier</label>
                      <select
                        value={editTier}
                        onChange={(e) => setEditTier(e.target.value as 'Basic' | 'Premium Pro')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Premium Pro">Premium Pro</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveMechanicCapacityAndSettings(selectedMechanicModal.id)}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-all shadow-md mt-1"
                  >
                    Save Capacity & Settings
                  </button>
                </div>
              </div>

              {selectedMechanicModal.status === 'Pending' ? (
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      handleRejectVendor(selectedMechanicModal.id);
                      setSelectedMechanicModal(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-500/30 text-xs font-bold cursor-pointer transition-all"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleApproveVendor(selectedMechanicModal.id);
                      setSelectedMechanicModal(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-accent-green hover:bg-emerald-600 text-slate-950 text-xs font-extrabold border border-emerald-400 cursor-pointer transition-all shadow-lg"
                  >
                    Approve Garage
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      handleDeleteMechanic(selectedMechanicModal.id);
                      setSelectedMechanicModal(null);
                    }}
                    className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 font-extrabold text-xs rounded-xl border border-red-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 size={14} />
                    <span>Delete Garage Account</span>
                  </button>
                  <button
                    onClick={() => setSelectedMechanicModal(null)}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl border border-slate-800 cursor-pointer"
                  >
                    Close Audit Window
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
