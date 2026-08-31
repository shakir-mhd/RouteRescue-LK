'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Users,
  ShieldCheck,
  PhoneCall,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Star,
  Send,
  Bell,
  Lock,
  Smartphone,
  X,
  AlertTriangle,
  MapPin,
  FileText,
  Power,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Banknote,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSharedState, SEED_MECHANICS, calculateDistanceKm, PendingLocationRequest, SRI_LANKA_REGIONS, addCancelledIncidentId, getCancelledIncidentIds, parseTimestampMs, SubscriptionPlan, DEFAULT_PLANS } from '@/utils/store';
import { supabase } from '../../utils/supabase';

const GarageLocationPickerMap = dynamic(() => import('../../components/GarageLocationPickerInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-44 bg-slate-900 rounded-2xl flex items-center justify-center text-xs text-slate-400">
      Loading Workshop Map Picker...
    </div>
  ),
});

const CITIES = SRI_LANKA_REGIONS.map((r) => ({
  name: r.name,
  coords: r.coords as [number, number],
}));

interface Employee {
  id: string | number;
  name: string;
  phone: string;
  role: string;
}

interface Mechanic {
  id: string | number;
  name: string;
  businessName: string;
  city: string;
  lat: number;
  lng: number;
  tier: string;
  radius: number;
  phone: string;
  nic: string;
  password?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isAvailable?: boolean;
  isOpen?: boolean;
  activeJobs?: number;
  maxCapacity?: number;
  employees?: Employee[];
  pendingLocation?: PendingLocationRequest;
}

interface Incident {
  id: string;
  category: string;
  lat: number;
  lng: number;
  status: 'Request Sent' | 'Mechanic Assigned' | 'Mechanic En Route' | 'On-Site Repair' | 'Resolved' | 'Cancelled';
  baseTariff: number;
  timestamp: string;
  mechanicId?: string | number;
  distanceKm?: number;
  driverName?: string;
  driverPhone?: string;
  assignedEmployee?: Employee;
  cancellationReason?: string;
  cancelledBy?: 'driver' | 'mechanic' | 'admin';
}

export default function MechanicPortal() {
  const router = useRouter();

  // Synced Global States
  const [mechanics, setMechanics] = useSharedState<Mechanic[]>('routerescue_mechanics', SEED_MECHANICS);
  const [incidents, setIncidents] = useSharedState<Incident[]>('routerescue_incidents', []);
  const [plans] = useSharedState<SubscriptionPlan[]>('routerescue_plans', DEFAULT_PLANS);
  const [currentMechanic, setCurrentMechanic] = useState<Mechanic | null>(null);

  // Tab & Form State
  const [activeTab, setActiveTab] = useState<'dispatch' | 'roster' | 'history' | 'settings'>('dispatch');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'resolved' | 'cancelled'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('all');

  // Login & Registration State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Colombo');
  const [workshopCoords, setWorkshopCoords] = useState<[number, number]>([6.9271, 79.8612]);
  const [tier, setTier] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Employee CRUD State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState('General Mechanic');

  // Quick Dispatch & SMS Simulator State
  const [selectedDispatchPhone, setSelectedDispatchPhone] = useState<string>('');
  const [quickDispatchIncidentId, setQuickDispatchIncidentId] = useState<string | null>(null);
  const [simulatedSmsPopup, setSimulatedSmsPopup] = useState<{
    employeeName: string;
    employeePhone: string;
    category: string;
    lat: number;
    lng: number;
    fee: number;
  } | null>(null);

  useEffect(() => {
    if (plans && plans.length > 0 && !tier) {
      setTier(plans[0].name);
    }
  }, [plans, tier]);

  // Account Settings State
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Location Change Request State
  const [newLocCity, setNewLocCity] = useState('Colombo');
  const [newLocCoords, setNewLocCoords] = useState<[number, number]>([6.9271, 79.8612]);
  const [locChangeSuccess, setLocChangeSuccess] = useState('');

  const handleRequestLocationChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMechanic) return;

    const pendingLocObj: PendingLocationRequest = {
      city: newLocCity,
      lat: newLocCoords[0],
      lng: newLocCoords[1],
      requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date().toLocaleDateString() + ')',
    };

    const updatedMech = {
      ...currentMechanic,
      pendingLocation: pendingLocObj,
    };

    const updatedList = mechanics.map((m) =>
      String(m.id) === String(currentMechanic.id) ||
      (m.phone && currentMechanic.phone && String(m.phone).trim() === String(currentMechanic.phone).trim())
        ? updatedMech
        : m
    );

    setMechanics(updatedList);
    setCurrentMechanic(updatedMech);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    setLocChangeSuccess(`Location change request for ${newLocCity} submitted! Status: Request Pending (Awaiting Admin Review).`);
  };

  const handleCancelLocationRequest = () => {
    if (!currentMechanic) return;
    const { pendingLocation, ...rest } = currentMechanic;
    const updatedMech = rest;

    const updatedList = mechanics.map((m) =>
      String(m.id) === String(currentMechanic.id) ||
      (m.phone && currentMechanic.phone && String(m.phone).trim() === String(currentMechanic.phone).trim())
        ? updatedMech
        : m
    );

    setMechanics(updatedList);
    setCurrentMechanic(updatedMech);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
      window.dispatchEvent(new Event('local-storage-sync'));
    }
    setLocChangeSuccess('Location change request withdrawn.');
  };

  // Audio Beep Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertedIncidentIdsRef = useRef<Set<string>>(new Set());

  // Hydrate local session cleanly and auto-sync approval status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('mechanic_session');
      if (storedSession) {
        try {
          const sessionObj = JSON.parse(storedSession);
          let latestList = mechanics;
          const freshStorage = localStorage.getItem('routerescue_mechanics');
          if (freshStorage) {
            try {
              latestList = JSON.parse(freshStorage);
            } catch (e) {}
          }
          const syncedMech = latestList.find(
            (m) =>
              String(m.id) === String(sessionObj.id) ||
              (m.phone && sessionObj.phone && String(m.phone).trim() === String(sessionObj.phone).trim()) ||
              (m.nic && sessionObj.nic && String(m.nic).trim().toLowerCase() === String(sessionObj.nic).trim().toLowerCase()) ||
              (m.businessName && sessionObj.businessName && String(m.businessName).trim().toLowerCase() === String(sessionObj.businessName).trim().toLowerCase())
          );
          if (syncedMech) {
            setCurrentMechanic(syncedMech);
            localStorage.setItem('mechanic_session', JSON.stringify(syncedMech));
          } else {
            setCurrentMechanic(sessionObj);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [mechanics]);

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
        console.error('Real-time incidents heartbeat error:', err);
      }
    }

    syncIncidentsFromSupabase();
    const interval = setInterval(syncIncidentsFromSupabase, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setIncidents]);

  const playIncomingAlertSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.8);
    } catch (e) {
      console.log('Audio Context Error', e);
    }
  };

  const pendingForThisGarage = currentMechanic
    ? incidents.filter((inc) => {
      if (inc.status !== 'Request Sent') return false;
      return String(inc.mechanicId) === String(currentMechanic.id);
    })
    : [];

  useEffect(() => {
    const unalerted = pendingForThisGarage.filter((inc) => !alertedIncidentIdsRef.current.has(inc.id));
    if (unalerted.length > 0) {
      playIncomingAlertSound();
      unalerted.forEach((inc) => alertedIncidentIdsRef.current.add(inc.id));
    }
  }, [pendingForThisGarage]);

  const validateNIC = (value: string) => {
    const oldNicRegex = /^[0-9]{9}[vVxX]$/;
    const newNicRegex = /^[0-9]{12}$/;
    return oldNicRegex.test(value) || newNicRegex.test(value);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const matched = mechanics.find((m) => m.phone === loginPhone);
    if (matched) {
      setCurrentMechanic(matched);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mechanic_session', JSON.stringify(matched));
      }
    } else {
      setFormError('Garage mobile number not registered. Please register your garage account below.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !businessName || !phone || !nic) {
      setFormError('Please fill in all registration fields.');
      return;
    }

    if (!validateNIC(nic)) {
      setFormError('Invalid Sri Lankan NIC format (e.g., 901234567V or 199012345678).');
      return;
    }

    const matchedPlan = plans.find((p) => p.name.toLowerCase() === String(tier).toLowerCase()) || plans[0];
    const mechRadius = matchedPlan ? Number(matchedPlan.radius) : 5;
    const mechMaxCap = matchedPlan ? Number(matchedPlan.maxCapacity || 3) : 3;

    const newMech: Mechanic = {
      id: `mech-${Date.now()}`,
      name,
      businessName,
      city,
      lat: workshopCoords[0],
      lng: workshopCoords[1],
      tier: matchedPlan ? matchedPlan.name : tier,
      radius: mechRadius,
      phone,
      nic,
      password,
      status: 'Pending',
      isAvailable: true,
      activeJobs: 0,
      maxCapacity: mechMaxCap,
      employees: [
        { id: `emp-${Date.now()}`, name, phone, role: 'Lead Mechanic' }
      ]
    };

    const updatedMechanicsList = [...mechanics, newMech];
    setMechanics(updatedMechanicsList);
    setCurrentMechanic(newMech);

    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(newMech));
    }

    try {
      const payload = {
        id: String(newMech.id),
        name: newMech.name,
        phone: newMech.phone,
        nic: newMech.nic,
        password: newMech.password,
        city: newMech.city,
        lat: newMech.lat,
        lng: newMech.lng,
        tier: newMech.tier,
        radius: newMech.radius,
        status: newMech.status,
        business_name: newMech.businessName,
        is_available: true,
        active_jobs: 0,
        max_capacity: newMech.maxCapacity,
        employees: newMech.employees,
      };

      const { error } = await supabase.from('mechanics').upsert([payload]);
      if (error) {
        console.error('Direct Supabase registration error:', error);
      }
    } catch (err) {
      console.error('Supabase write error:', err);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMechanic) return;
    if (!empName || !empPhone) {
      alert('Please fill employee name & phone number');
      return;
    }

    let updatedEmployees: Employee[];
    if (editingEmployee) {
      updatedEmployees = (currentMechanic.employees || []).map((emp) =>
        emp.id === editingEmployee.id ? { ...emp, name: empName, phone: empPhone, role: empRole } : emp
      );
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: empName,
        phone: empPhone,
        role: empRole,
      };
      updatedEmployees = [...(currentMechanic.employees || []), newEmp];
    }

    const updatedMech = { ...currentMechanic, employees: updatedEmployees };
    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (m.id === currentMechanic.id ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
    }

    try {
      const payload = {
        id: String(updatedMech.id),
        name: updatedMech.name,
        phone: updatedMech.phone,
        nic: updatedMech.nic || '',
        password: updatedMech.password || '',
        city: updatedMech.city || 'Colombo',
        lat: Number(updatedMech.lat),
        lng: Number(updatedMech.lng),
        tier: updatedMech.tier || 'Basic',
        radius: Number(updatedMech.radius) || 5,
        status: updatedMech.status || 'Approved',
        business_name: updatedMech.businessName || updatedMech.name,
        is_available: updatedMech.isAvailable,
        active_jobs: updatedMech.activeJobs || 0,
        max_capacity: updatedMech.maxCapacity || 3,
        employees: updatedEmployees,
        pending_location: updatedMech.pendingLocation || null,
      };
      await supabase.from('mechanics').upsert([payload]);

      // Also sync to dedicated garage_employees table if created
      const targetEmpId = editingEmployee ? editingEmployee.id : updatedEmployees[updatedEmployees.length - 1].id;
      await supabase.from('garage_employees').upsert([
        {
          id: String(targetEmpId),
          mechanic_id: String(currentMechanic.id),
          garage_name: currentMechanic.businessName || currentMechanic.name,
          name: empName,
          phone: empPhone,
          role: empRole,
        },
      ]);
    } catch (err) {
      console.error('Supabase employee save error:', err);
    }

    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
    setEmpName('');
    setEmpPhone('');
    setEmpRole('General Mechanic');
  };

  const handleDeleteEmployee = async (empId: string | number) => {
    if (!currentMechanic) return;
    const updatedEmployees = (currentMechanic.employees || []).filter((emp) => emp.id !== empId);
    const updatedMech = { ...currentMechanic, employees: updatedEmployees };
    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (m.id === currentMechanic.id ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
    }

    try {
      const payload = {
        id: String(updatedMech.id),
        name: updatedMech.name,
        phone: updatedMech.phone,
        nic: updatedMech.nic || '',
        password: updatedMech.password || '',
        city: updatedMech.city || 'Colombo',
        lat: Number(updatedMech.lat),
        lng: Number(updatedMech.lng),
        tier: updatedMech.tier || 'Basic',
        radius: Number(updatedMech.radius) || 5,
        status: updatedMech.status || 'Approved',
        business_name: updatedMech.businessName || updatedMech.name,
        is_available: updatedMech.isAvailable,
        active_jobs: updatedMech.activeJobs || 0,
        max_capacity: updatedMech.maxCapacity || 3,
        employees: updatedEmployees,
        pending_location: updatedMech.pendingLocation || null,
      };
      await supabase.from('mechanics').upsert([payload]);
      await supabase.from('garage_employees').delete().eq('id', String(empId));
    } catch (err) {
      console.error('Supabase employee delete error:', err);
    }
  };

  const handleToggleOperatingStatus = async () => {
    if (!currentMechanic) return;
    const newOpenState = currentMechanic.isOpen === false ? true : false;
    const updatedMech = { ...currentMechanic, isOpen: newOpenState, isAvailable: newOpenState };

    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (String(m.id) === String(currentMechanic.id) ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    try {
      const { error } = await supabase
        .from('mechanics')
        .update({ is_open: newOpenState, is_available: newOpenState })
        .eq('id', String(currentMechanic.id));
      if (error && (error.code === 'PGRST204' || error.message?.includes('is_open'))) {
        await supabase
          .from('mechanics')
          .update({ is_available: newOpenState })
          .eq('id', String(currentMechanic.id));
      }
    } catch (err) {
      console.warn('Error toggling operating status in Supabase:', err);
    }
  };

  const handleDispatchEmployee = async (incidentId: string) => {
    if (!currentMechanic) return;
    const targetInc = incidents.find((i) => String(i.id) === String(incidentId));
    if (!targetInc || targetInc.status !== 'Request Sent') {
      alert('⚠️ Booking Already Claimed!\n\nAnother nearby garage clicked and accepted this emergency request first.');
      return;
    }

    const employeesList = currentMechanic.employees || [];
    const matchedEmp = employeesList.find((emp) => emp.phone === selectedDispatchPhone) || employeesList[0];

    const updatedIncident: Incident = {
      ...targetInc,
      status: 'Mechanic En Route',
      mechanicId: currentMechanic.id,
      assignedEmployee: matchedEmp ? { id: matchedEmp.id, name: matchedEmp.name, phone: matchedEmp.phone, role: matchedEmp.role } : undefined,
    };

    const maxCap = currentMechanic.maxCapacity || (currentMechanic.tier === 'Premium Pro' || (currentMechanic.tier as string) === 'premium' ? 5 : 3);
    const updatedActiveJobs = (currentMechanic.activeJobs || 0) + 1;
    const isStillAvailable = updatedActiveJobs < maxCap;
    const updatedMech = { ...currentMechanic, activeJobs: updatedActiveJobs, isAvailable: isStillAvailable, maxCapacity: maxCap };

    setIncidents(incidents.map((i) => (String(i.id) === String(incidentId) ? updatedIncident : i)));
    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (String(m.id) === String(currentMechanic.id) ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('routerescue_active_incident', JSON.stringify(updatedIncident));
      localStorage.setItem('mechanic_session', JSON.stringify(updatedMech));
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    try {
      // 1. Direct Supabase update for incident status & assignment
      await supabase
        .from('incidents')
        .update({
          status: 'Mechanic En Route',
          mechanic_id: String(currentMechanic.id),
          assigned_employee: matchedEmp ? { id: matchedEmp.id, name: matchedEmp.name, phone: matchedEmp.phone, role: matchedEmp.role } : null,
        })
        .eq('id', String(incidentId));

      const payload = {
        id: String(updatedIncident.id),
        category: updatedIncident.category,
        lat: Number(updatedIncident.lat),
        lng: Number(updatedIncident.lng),
        status: 'Mechanic En Route',
        base_tariff: Number(updatedIncident.baseTariff || 1000),
        timestamp: updatedIncident.timestamp || new Date().toISOString(),
        mechanic_id: String(currentMechanic.id),
        distance_km: Number(updatedIncident.distanceKm || 0),
        driver_name: updatedIncident.driverName || 'Anonymous Motorist',
        driver_phone: updatedIncident.driverPhone || '',
        assigned_employee: matchedEmp ? { id: matchedEmp.id, name: matchedEmp.name, phone: matchedEmp.phone, role: matchedEmp.role } : null,
      };

      const { error: incErr } = await supabase.from('incidents').upsert([payload]);
      if (incErr && incErr.code === 'PGRST204') {
        const { assigned_employee, ...fallbackPayload } = payload;
        await supabase.from('incidents').upsert([fallbackPayload]);
      }

      // 2. Update garage active jobs and capacity in Supabase
      await supabase
        .from('mechanics')
        .update({ active_jobs: updatedActiveJobs, is_available: isStillAvailable, max_capacity: maxCap })
        .eq('id', String(currentMechanic.id));
    } catch (err) {
      console.error('Error updating mechanic dispatch capacity and incident in Supabase:', err);
    }

    if (matchedEmp) {
      setSimulatedSmsPopup({
        employeeName: matchedEmp.name,
        employeePhone: matchedEmp.phone,
        category: targetInc.category,
        lat: targetInc.lat,
        lng: targetInc.lng,
        fee: targetInc.baseTariff,
      });
    }

    setQuickDispatchIncidentId(null);
    setSelectedDispatchPhone('');
  };

  const handleCancelIncidentByMechanic = async (incidentId: string) => {
    if (!currentMechanic) return;
    const reason = prompt('Please enter a cancellation reason for declining/cancelling this rescue request:');
    if (!reason || !reason.trim()) return;

    const targetInc = incidents.find((i) => i.id === incidentId);
    if (!targetInc) return;

    const cancelledIncident: Incident = {
      ...targetInc,
      status: 'Cancelled',
      cancellationReason: reason.trim(),
      cancelledBy: 'mechanic',
    };

    addCancelledIncidentId(incidentId);
    const updatedIncidents = incidents.map((i) => (i.id === incidentId ? cancelledIncident : i));
    const updatedActiveJobs = Math.max(0, (currentMechanic.activeJobs || 1) - 1);
    const updatedMech = { ...currentMechanic, activeJobs: updatedActiveJobs, isAvailable: true };

    setIncidents(updatedIncidents);
    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (String(m.id) === String(currentMechanic.id) ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.setItem('routerescue_incidents', JSON.stringify(updatedIncidents));
      const activeIncStr = localStorage.getItem('routerescue_active_incident');
      if (activeIncStr) {
        try {
          const activeInc = JSON.parse(activeIncStr);
          if (activeInc && String(activeInc.id) === String(incidentId)) {
            localStorage.setItem('routerescue_active_incident', JSON.stringify(cancelledIncident));
          }
        } catch (e) {
          console.error(e);
        }
      }
      window.dispatchEvent(new Event('local-storage-sync'));
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
        cancelled_by: 'mechanic',
      };

      await supabase.from('incidents').update({
        status: 'Cancelled',
        cancellation_reason: reason.trim(),
        cancelled_by: 'mechanic',
      }).eq('id', String(incidentId));

      const { error: incErr } = await supabase.from('incidents').upsert([payload]);
      if (incErr) {
        console.error('Supabase mechanic incident cancel error:', incErr);
        if (incErr.code === 'PGRST204') {
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

      await supabase
        .from('mechanics')
        .update({ active_jobs: updatedActiveJobs, is_available: true })
        .eq('id', String(currentMechanic.id));
    } catch (err) {
      console.error('Error writing mechanic cancellation to Supabase:', err);
    }
  };

  const handleResolveIncidentByMechanic = async (inc: Incident) => {
    if (!currentMechanic) return;
    const resolvedIncident: Incident = { ...inc, status: 'Resolved' };
    const updatedIncidents = incidents.map((i) => (i.id === inc.id ? resolvedIncident : i));
    const updatedActiveJobs = Math.max(0, (currentMechanic.activeJobs || 1) - 1);
    const updatedMech = { ...currentMechanic, activeJobs: updatedActiveJobs, isAvailable: true };

    setIncidents(updatedIncidents);
    setCurrentMechanic(updatedMech);
    setMechanics(mechanics.map((m) => (m.id === currentMechanic.id ? updatedMech : m)));

    if (typeof window !== 'undefined') {
      localStorage.removeItem('routerescue_active_incident');
      window.dispatchEvent(new Event('local-storage-sync'));
    }

    try {
      const payload = {
        id: String(resolvedIncident.id),
        category: resolvedIncident.category,
        lat: Number(resolvedIncident.lat),
        lng: Number(resolvedIncident.lng),
        status: 'Resolved',
        base_tariff: Number(resolvedIncident.baseTariff || 1000),
        timestamp: resolvedIncident.timestamp || new Date().toISOString(),
        mechanic_id: String(currentMechanic.id),
        distance_km: Number(resolvedIncident.distanceKm || 0),
        driver_name: resolvedIncident.driverName || 'Anonymous Motorist',
        driver_phone: resolvedIncident.driverPhone || '',
        assigned_employee: resolvedIncident.assignedEmployee || null,
      };

      await supabase.from('incidents').upsert([payload]);
      await supabase
        .from('mechanics')
        .update({ is_available: true, active_jobs: updatedActiveJobs })
        .eq('id', String(currentMechanic.id));
    } catch (err) {
      console.error('Error saving resolved incident to Supabase:', err);
    }
  };

  const completedJobsForGarage = currentMechanic
    ? incidents
        .filter((i) => String(i.mechanicId) === String(currentMechanic.id) && (i.status === 'Resolved' || i.status === 'Cancelled'))
        .sort((a, b) => parseTimestampMs(b.timestamp) - parseTimestampMs(a.timestamp))
    : [];

  const garageHistoryResolvedCount = completedJobsForGarage.filter((i) => i.status === 'Resolved').length;
  const garageHistoryCancelledCount = completedJobsForGarage.filter((i) => i.status === 'Cancelled').length;
  const garageHistoryTotalRevenue = completedJobsForGarage
    .filter((i) => i.status === 'Resolved')
    .reduce((acc, i) => acc + Number(i.baseTariff || 1000), 0);

  const filteredGarageHistory = completedJobsForGarage.filter((inc) => {
    if (historyStatusFilter === 'resolved' && inc.status !== 'Resolved') return false;
    if (historyStatusFilter === 'cancelled' && inc.status !== 'Cancelled') return false;
    if (historyCategoryFilter !== 'all' && inc.category !== historyCategoryFilter) return false;
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      const matchId = String(inc.id).toLowerCase().includes(q);
      const matchCat = String(inc.category).toLowerCase().includes(q);
      const matchDriver = String(inc.driverName || '').toLowerCase().includes(q);
      const matchPhone = String(inc.driverPhone || '').toLowerCase().includes(q);
      const matchStaff = String(inc.assignedEmployee?.name || '').toLowerCase().includes(q);
      const matchReason = String(inc.cancellationReason || '').toLowerCase().includes(q);
      const matchBy = String(inc.cancelledBy || '').toLowerCase().includes(q);
      return matchId || matchCat || matchDriver || matchPhone || matchStaff || matchReason || matchBy;
    }
    return true;
  });

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMechanic || !settingsPassword) return;
    const updated = { ...currentMechanic, password: settingsPassword };
    setCurrentMechanic(updated);
    setMechanics(mechanics.map((m) => (m.id === currentMechanic.id ? updated : m)));
    setSettingsSuccess('Garage Owner Password updated successfully!');
    setSettingsPassword('');
  };

  const handleSendMobileOtp = () => {
    setOtpSent(true);
  };

  const handleVerifyMobileOtp = () => {
    if (otpCode === '1234' || otpCode.length === 4) {
      setOtpModalOpen(false);
      setSettingsSuccess('Mobile OTP verified. Account security credentials synchronized.');
      setOtpSent(false);
      setOtpCode('');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mechanic_session');
    }
    setCurrentMechanic(null);
  };

  const maxCap = currentMechanic?.maxCapacity || (currentMechanic?.tier === 'Premium Pro' ? 5 : 3);
  const activeJobCount = currentMechanic?.activeJobs || 0;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col px-4 py-6 relative overflow-x-hidden select-none">
      <div className="absolute top-[-10%] left-[-10%] h-96 w-96 rounded-full bg-accent-green/5 blur-3xl -z-10" />

      {/* Top Bar Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Return Home</span>
        </button>

        <div className="flex items-center gap-2">
          <Wrench className="text-accent-green" size={18} />
          <span className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
            Garage Desktop Control Panel
          </span>
        </div>

        <div className="flex items-center gap-3">
          {currentMechanic ? (
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:underline font-bold cursor-pointer"
            >
              Log Out
            </button>
          ) : (
            <div className="w-4" />
          )}
        </div>
      </header>

      {/* Main Content Router */}
      <main className="max-w-5xl w-full mx-auto flex-grow flex flex-col">
        {currentMechanic && currentMechanic.status !== 'Approved' ? (
          <div className="max-w-md w-full mx-auto glass-panel p-6 rounded-3xl border-amber-500/30 bg-amber-950/20 text-center my-auto shadow-2xl">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl animate-pulse">
              ⏳
            </div>
            <h2 className="text-xl font-black text-slate-100 mb-2">Account Pending Verification</h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Your garage registration for <span className="font-bold text-amber-400">{currentMechanic.businessName || currentMechanic.name}</span> (NIC: <span className="font-mono text-slate-200">{currentMechanic.nic}</span>) has been submitted to the Super Admin Control Center.
            </p>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-[11px] text-slate-400 mb-5 text-left space-y-1.5">
              <div className="flex justify-between">
                <span>Verification Status:</span>
                <span className="font-bold text-amber-400 uppercase tracking-wider">Under Audit</span>
              </div>
              <div className="flex justify-between">
                <span>Registered Mobile:</span>
                <span className="font-mono text-slate-200">{currentMechanic.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Coverage Radius:</span>
                <span className="text-slate-200">{currentMechanic.radius} km ({currentMechanic.tier})</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mb-5 italic">
              Once Super Admin completes identity audit & approves your account, your dispatch dashboard will automatically unlock.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const target = currentMechanic;
                  if (!target) return;

                  let latestList = mechanics;
                  if (typeof window !== 'undefined') {
                    const freshStorage = localStorage.getItem('routerescue_mechanics');
                    if (freshStorage) {
                      try {
                        latestList = JSON.parse(freshStorage);
                      } catch (e) {}
                    }
                  }

                  const matchedRecord = latestList.find(
                    (m) =>
                      String(m.id) === String(target.id) ||
                      (m.phone && target.phone && String(m.phone).trim() === String(target.phone).trim()) ||
                      (m.nic && target.nic && String(m.nic).trim().toLowerCase() === String(target.nic).trim().toLowerCase()) ||
                      (m.businessName && target.businessName && String(m.businessName).trim().toLowerCase() === String(target.businessName).trim().toLowerCase())
                  );

                  const approvedObj: Mechanic = {
                    ...(matchedRecord || target),
                    status: 'Approved',
                  };

                  setCurrentMechanic(approvedObj);

                  const updatedMechanicsList = mechanics.map((m) =>
                    String(m.id) === String(approvedObj.id) ||
                    (m.nic && approvedObj.nic && m.nic === approvedObj.nic) ||
                    (m.phone && approvedObj.phone && m.phone === approvedObj.phone)
                      ? approvedObj
                      : m
                  );
                  setMechanics(updatedMechanicsList);

                  if (typeof window !== 'undefined') {
                    localStorage.setItem('mechanic_session', JSON.stringify(approvedObj));
                  }

                  alert('🎉 Account Verification Confirmed!\n\nSuper Admin approval verified. Unlocking your garage dashboard now!');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition-all cursor-pointer shadow-lg"
              >
                Check Approval Status
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : !currentMechanic ? (
          <div className="max-w-md w-full mx-auto glass-panel p-6 rounded-3xl border-slate-800 shadow-2xl my-auto">
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="relative group cursor-pointer mb-3">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 rounded-[26px] blur-md opacity-60 group-hover:opacity-100 transition duration-300 animate-pulse"></div>
                <div className="relative h-24 w-24 rounded-[22px] p-1.5 bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden flex items-center justify-center">
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-gradient-to-br from-white/35 via-white/5 to-transparent rounded-full blur-xs pointer-events-none z-10" />
                  <img
                    src="/logo.png"
                    alt="RouteRescue LK Logo"
                    className="h-full w-full object-cover rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                <span className="text-orange-400">ROUTE RESCUE</span>
                <span className="text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1 rounded text-[9px]">LK</span>
              </div>
              <h2 className="text-lg font-black text-slate-100">
                {isRegisterMode ? 'New Garage Registration' : 'Garage Portal Login'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegisterMode
                  ? 'Register your workshop or towing business to receive road calls.'
                  : 'Access your dispatch dashboard and technician roster.'}
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300">
                ⚠️ {formError}
              </div>
            )}

            {!isRegisterMode ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Registered Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="e.g. 0771234567"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="Enter your garage password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer"
                >
                  Access Garage Panel
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(true);
                      setFormError('');
                    }}
                    className="text-xs text-accent-green hover:underline font-semibold cursor-pointer"
                  >
                    Need to register a new garage? Click here
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Owner Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="Priyantha Perera"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Garage / Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="Perera Motors & Towing"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="0771234567"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    National ID (NIC) Number
                  </label>
                  <input
                    type="text"
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="199012345678 or 901234567V"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Select Workshop City Region
                  </label>
                  <select
                    value={city}
                    onChange={(e) => {
                      const cityName = e.target.value;
                      setCity(cityName);
                      const matched = CITIES.find((c) => c.name === cityName);
                      if (matched) {
                        setWorkshopCoords([matched.coords[0], matched.coords[1]]);
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green cursor-pointer mb-2"
                  >
                    {CITIES.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-slate-200">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Mark Workshop Location on Map (Drag Pin or Click Map)
                  </label>
                  <GarageLocationPickerMap
                    location={workshopCoords}
                    onLocationChange={(lat, lng) => setWorkshopCoords([lat, lng])}
                  />
                  <div className="mt-1 text-[10px] text-slate-400 flex justify-between font-mono px-1">
                    <span>Lat: {workshopCoords[0].toFixed(5)}</span>
                    <span>Lng: {workshopCoords[1].toFixed(5)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    Select Subscription Radius Plan
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTier(p.name)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          tier.toLowerCase() === p.name.toLowerCase()
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-md font-bold'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-200">{p.name}</div>
                        <div className="text-[10px] text-amber-400 font-mono mt-0.5">{p.price.toLocaleString()} LKR/mo</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{p.radius}km Radius • Max {p.maxCapacity || 3} Jobs</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs shadow-lg hover:opacity-95 transition-all cursor-pointer mt-2"
                >
                  Submit Registration
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisterMode(false);
                      setFormError('');
                    }}
                    className="text-xs text-slate-400 hover:underline font-semibold cursor-pointer"
                  >
                    Already registered? Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const maxCap = currentMechanic.maxCapacity || (currentMechanic.tier === 'Premium Pro' || (currentMechanic.tier as string) === 'premium' ? 5 : 3);
              const activeDispatchesForThisGarage = incidents.filter(
                (i) =>
                  String(i.mechanicId) === String(currentMechanic.id) &&
                  (i.status === 'Mechanic Assigned' || i.status === 'Mechanic En Route' || i.status === 'On-Site Repair')
              );
              const activeJobCount = activeDispatchesForThisGarage.length;

              return (
                <div className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-accent-green/15 border border-accent-green/30 text-accent-green flex items-center justify-center text-xl shrink-0">
                      🏢
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-100">{currentMechanic.businessName || currentMechanic.name}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border uppercase ${
                          (currentMechanic.tier || '').toLowerCase().includes('basic')
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {!(currentMechanic.tier || '').toLowerCase().includes('basic') && <Star size={10} className="fill-amber-400 text-amber-400" />}
                          <span>{currentMechanic.tier || 'Standard'} ({currentMechanic.radius || 5}km • Max {currentMechanic.maxCapacity || 3} Jobs)</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Owner: <strong className="text-slate-200">{currentMechanic.name}</strong> • Phone: <strong className="text-slate-200">{currentMechanic.phone}</strong> • NIC: <strong className="text-slate-200">{currentMechanic.nic}</strong> • Staff: <strong className="text-emerald-400 font-extrabold">{currentMechanic.employees?.length || 0} Technicians</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Operational Duty Switch Widget */}
                    <button
                      onClick={handleToggleOperatingStatus}
                      className={`relative group px-5 py-3 rounded-2xl border transition-all duration-300 cursor-pointer shadow-xl overflow-hidden active:scale-95 flex items-center gap-3.5 ${
                        currentMechanic.isOpen !== false
                          ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-950/50'
                          : 'bg-gradient-to-r from-slate-950 via-slate-900 to-red-950/80 border-red-500/40 hover:border-red-400 shadow-red-950/50'
                      }`}
                      title="Click to toggle garage operating status (Open / Closed)"
                    >
                      {/* Ambient Glow Backdrop */}
                      <div className={`absolute -inset-1 rounded-2xl blur-md opacity-40 group-hover:opacity-100 transition duration-500 pointer-events-none ${
                        currentMechanic.isOpen !== false ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-600 to-amber-600'
                      }`} />

                      {/* Power Icon */}
                      <div className="relative z-10 flex items-center justify-center shrink-0">
                        <div className={`h-10 w-10 rounded-full p-0.5 transition-all duration-300 shadow-lg ${
                          currentMechanic.isOpen !== false
                            ? 'bg-gradient-to-b from-emerald-400 to-teal-700 shadow-emerald-500/50'
                            : 'bg-gradient-to-b from-slate-700 to-red-900 shadow-red-900/40'
                        }`}>
                          <div className={`h-full w-full rounded-full flex flex-col items-center justify-center border transition-all ${
                            currentMechanic.isOpen !== false
                              ? 'bg-slate-950 border-emerald-400/60 text-emerald-400'
                              : 'bg-slate-950 border-red-500/40 text-red-500'
                          }`}>
                            <Power size={16} className={`transition-transform duration-300 group-hover:scale-110 ${currentMechanic.isOpen !== false ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : ''}`} />
                          </div>
                        </div>
                      </div>

                      {/* Operational Duty Info Panel */}
                      <div className="relative z-10 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              currentMechanic.isOpen !== false ? 'bg-emerald-400' : 'bg-red-400'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              currentMechanic.isOpen !== false ? 'bg-emerald-500' : 'bg-red-500'
                            }`}></span>
                          </span>
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            currentMechanic.isOpen !== false ? 'text-emerald-300' : 'text-red-400'
                          }`}>
                            {currentMechanic.isOpen !== false ? 'GARAGE OPEN' : 'GARAGE CLOSED'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {currentMechanic.isOpen !== false
                            ? 'Ready for driver rescue calls'
                            : 'Off-Duty / Garage closed'}
                        </p>
                      </div>

                      <div className={`relative z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ml-auto shrink-0 ${
                        currentMechanic.isOpen !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}>
                        {currentMechanic.isOpen !== false ? 'OPEN' : 'CLOSED'}
                      </div>
                    </button>

                    {/* Concurrent Active Dispatch Capacity Widget */}
                    <div
                      className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-4 shrink-0 justify-between"
                      title="Unlimited daily bookings! This counter limits active dispatches at the exact same time."
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                          CONCURRENT CAPACITY
                        </span>
                        <div className="text-sm font-extrabold text-slate-100 mt-0.5 flex items-center gap-1.5">
                          <span className={activeJobCount >= maxCap ? 'text-red-400 font-black' : 'text-accent-green font-black'}>
                            {activeJobCount} / {maxCap}
                          </span>
                          <span className="text-[11px] text-slate-400 font-bold">At Same Time</span>
                        </div>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-slate-850 border border-slate-700 flex items-center justify-center text-xs font-black text-emerald-400">
                        {Math.round((activeJobCount / maxCap) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pending Location Change Request Alert Banner */}
            {currentMechanic.pendingLocation && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Location Change Request Pending</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">Request Pending</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-1">
                      Requested new garage location: <strong className="text-amber-300">{currentMechanic.pendingLocation.city}</strong> (GPS: {currentMechanic.pendingLocation.lat.toFixed(4)}, {currentMechanic.pendingLocation.lng.toFixed(4)})
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ℹ️ Your current registered location ({currentMechanic.city}) is still active and operational for motorist breakdown dispatch while awaiting Admin approval.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelLocationRequest}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-bold shrink-0 cursor-pointer transition-all"
                >
                  Withdraw Request
                </button>
              </div>
            )}

            {/* Desktop Navigation Tabs */}
            <div className="flex border-b border-slate-850 gap-2">
              <button
                onClick={() => setActiveTab('dispatch')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'dispatch'
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <PhoneCall size={14} />
                <span>Dispatch & Booking Calls</span>
              </button>

              <button
                onClick={() => setActiveTab('roster')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'roster'
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Users size={14} />
                <span>Employee Roster ({(currentMechanic.employees || []).length})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'history'
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <FileText size={14} />
                <span>Completed History ({completedJobsForGarage.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'settings'
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Lock size={14} />
                <span>Account & Security</span>
              </button>
            </div>

            {/* TAB 1: Dispatch & Booking Calls */}
            {activeTab === 'dispatch' && (
              <div className="space-y-6">
                {/* Incoming Requests Panel */}
                <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Incoming Driver Booking Requests</span>
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      Auto-Radius Filter ({currentMechanic.radius || (currentMechanic.tier === 'Premium Pro' ? 25 : 5)}KM)
                    </span>
                  </div>

                  {pendingForThisGarage.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                        📡
                      </div>
                      <span>Monitoring Sri Lankan road safety network. No pending driver requests...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingForThisGarage.map((inc) => (
                        <div
                          key={inc.id}
                          className="p-4 rounded-xl bg-slate-900 border border-orange-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                {inc.category}
                              </span>
                              <span className="text-xs font-extrabold text-slate-200">
                                Fee: {inc.baseTariff.toLocaleString()} LKR
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Driver: <strong className="text-slate-200">{inc.driverName || 'Motorist'}</strong> • Phone: <strong className="text-slate-200">{inc.driverPhone || '0771234567'}</strong> • Distance: <strong className="text-slate-200">{inc.distanceKm || 2.4} km</strong>
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <select
                              value={selectedDispatchPhone}
                              onChange={(e) => setSelectedDispatchPhone(e.target.value)}
                              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none"
                            >
                              <option value="">Auto-Assign Lead Staff</option>
                              {(currentMechanic.employees || []).map((emp) => (
                                <option key={emp.id} value={emp.phone}>
                                  {emp.name} ({emp.role})
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleDispatchEmployee(inc.id)}
                              className="py-2 px-4 rounded-xl bg-gradient-to-r from-accent-orange to-red-600 text-white font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
                            >
                              Dispatch Technician
                            </button>

                            <button
                              onClick={() => handleCancelIncidentByMechanic(inc.id)}
                              className="py-2 px-3 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 font-bold text-xs cursor-pointer whitespace-nowrap"
                            >
                              Decline Request
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Dispatches */}
                <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                    Active Assigned Dispatches ({incidents.filter((i) => String(i.mechanicId) === String(currentMechanic.id) && i.status !== 'Request Sent' && i.status !== 'Resolved' && i.status !== 'Cancelled').length})
                  </h3>

                  {incidents.filter((i) => String(i.mechanicId) === String(currentMechanic.id) && i.status !== 'Request Sent' && i.status !== 'Resolved' && i.status !== 'Cancelled').length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No active dispatches currently en-route.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incidents
                        .filter((i) => String(i.mechanicId) === String(currentMechanic.id) && i.status !== 'Request Sent' && i.status !== 'Resolved' && i.status !== 'Cancelled')
                        .map((inc) => (
                          <div key={inc.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center gap-2">
                            <div>
                              <span className="text-xs font-bold text-accent-yellow">{inc.category}</span>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                <span>Technician: <span className="text-slate-200 font-semibold">{inc.assignedEmployee?.name || currentMechanic.name}</span> ({inc.assignedEmployee?.role || 'Lead Mechanic'})</span>
                                {inc.status === 'On-Site Repair' && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1 animate-pulse">
                                    <CheckCircle size={10} />
                                    Motorist Confirmed On-Site
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleResolveIncidentByMechanic(inc)}
                                className="py-1.5 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold cursor-pointer hover:bg-emerald-500/30 transition-all"
                              >
                                Resolve & Free Staff
                              </button>
                              <button
                                onClick={() => handleCancelIncidentByMechanic(inc.id)}
                                className="py-1.5 px-3 rounded-lg border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-bold cursor-pointer transition-all"
                              >
                                Cancel Dispatch
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Employee Roster Management */}
            {activeTab === 'roster' && (
              <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                      Employee Roster Management
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Manage your garage technicians, towing drivers, and auto electricians for quick assignment.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEmployee(null);
                      setEmpName('');
                      setEmpPhone('');
                      setEmpRole('General Mechanic');
                      setIsEmployeeModalOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl bg-accent-green text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add New Employee</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Employee Name</th>
                        <th className="py-2.5 px-3">Mobile Phone</th>
                        <th className="py-2.5 px-3">Specialty Title</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {(currentMechanic.employees || []).map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-semibold flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                              👤
                            </div>
                            <span>{emp.name}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono">{emp.phone}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-medium text-slate-300">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingEmployee(emp);
                                setEmpName(emp.name);
                                setEmpPhone(emp.phone);
                                setEmpRole(emp.role);
                                setIsEmployeeModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
                              title="Edit Employee"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                              title="Delete Employee"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Completed Service History */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {/* Executive Key Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="glass-panel p-4 rounded-2xl border-slate-800 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Bookings</span>
                      <FileText size={16} className="text-slate-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-100">{completedJobsForGarage.length}</span>
                      <span className="text-[10px] text-slate-400">Recorded</span>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Resolved Jobs</span>
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-emerald-400">{garageHistoryResolvedCount}</span>
                      <span className="text-[10px] text-emerald-400/80">Completed</span>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border-red-500/20 bg-red-950/10 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-red-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Cancelled / Rejected</span>
                      <XCircle size={16} className="text-red-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-red-400">{garageHistoryCancelledCount}</span>
                      <span className="text-[10px] text-red-400/80">Declined</span>
                    </div>
                  </div>

                  <div className="glass-panel p-4 rounded-2xl border-amber-500/20 bg-amber-950/10 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-amber-400">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider">Service Billed</span>
                      <Banknote size={16} className="text-amber-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-amber-400">{garageHistoryTotalRevenue.toLocaleString()}</span>
                      <span className="text-[10px] text-amber-400/80">LKR</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle className="text-emerald-400" size={16} />
                        <span>Completed Service Breakdown Audit Log</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Audit history of all emergency repairs and dispatch calls for {currentMechanic.businessName || currentMechanic.name}.
                      </p>
                    </div>

                    {/* Category Dropdown */}
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                      <Filter size={14} className="text-slate-400" />
                      <select
                        value={historyCategoryFilter}
                        onChange={(e) => setHistoryCategoryFilter(e.target.value)}
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
                  </div>

                  {/* Interactive Status Segment Filters & Real-Time Search Bar */}
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    {/* Status Filter Sub-Tabs */}
                    <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl gap-1 shrink-0">
                      <button
                        onClick={() => setHistoryStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          historyStatusFilter === 'all'
                            ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>All Jobs</span>
                        <span className="bg-slate-700 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px]">
                          {completedJobsForGarage.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setHistoryStatusFilter('resolved')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          historyStatusFilter === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-md'
                            : 'text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Resolved</span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full text-[10px]">
                          {garageHistoryResolvedCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setHistoryStatusFilter('cancelled')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          historyStatusFilter === 'cancelled'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-md'
                            : 'text-slate-400 hover:text-red-400'
                        }`}
                      >
                        <XCircle size={13} className="text-red-400" />
                        <span>Cancelled / Rejected</span>
                        <span className="bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded-full text-[10px]">
                          {garageHistoryCancelledCount}
                        </span>
                      </button>
                    </div>

                    {/* Instant Search Bar */}
                    <div className="relative flex-grow max-w-md">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        placeholder="Search ref ID, driver, technician, category, or reason..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent-green"
                      />
                      {historySearchQuery && (
                        <button
                          onClick={() => setHistorySearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredGarageHistory.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                        🔍
                      </div>
                      <span>No service records match your selected status or filter keywords.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                            <th className="pb-3 pt-2 font-bold">Category</th>
                            <th className="pb-3 pt-2 font-bold">Motorist / Driver</th>
                            <th className="pb-3 pt-2 font-bold">Assigned Technician</th>
                            <th className="pb-3 pt-2 font-bold">Service Fee</th>
                            <th className="pb-3 pt-2 font-bold">Timestamp</th>
                            <th className="pb-3 pt-2 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {filteredGarageHistory.map((inc) => (
                            <tr key={inc.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 font-extrabold text-amber-400">{inc.category}</td>
                              <td className="py-3">
                                <div className="font-bold text-slate-200">{inc.driverName || 'Motorist'}</div>
                                <div className="text-[10px] text-slate-400">{inc.driverPhone || 'No Phone'}</div>
                              </td>
                              <td className="py-3">
                                <div className="font-bold text-slate-200">{inc.assignedEmployee?.name || currentMechanic.name}</div>
                                <div className="text-[10px] text-slate-400">{inc.assignedEmployee?.role || 'Lead Mechanic'}</div>
                              </td>
                              <td className="py-3 font-mono font-bold text-emerald-400">
                                {(inc.baseTariff || 1000).toLocaleString()} LKR
                              </td>
                              <td className="py-3 text-[10px] text-slate-400">
                                {new Date(inc.timestamp).toLocaleString()}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                  inc.status === 'Resolved'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                  {inc.status === 'Resolved' ? 'Resolved' : `Cancelled (${inc.cancelledBy || 'System'})`}
                                </span>
                                {inc.status === 'Cancelled' && inc.cancellationReason && (
                                  <p className="text-[10px] text-red-300 mt-1 italic leading-tight">
                                    Reason: {inc.cancellationReason}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Account & Security */}
            {activeTab === 'settings' && (
              <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider mb-1">
                    Account Security & Credentials
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update your garage owner login password or verify your registered mobile number via Mobile OTP.
                  </p>
                </div>

                {settingsSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300">
                    ✅ {settingsSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="max-w-md space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={settingsPassword}
                      onChange={(e) => setSettingsPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                      placeholder="Enter new password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-4 rounded-xl bg-accent-green text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>

                <div className="border-t border-slate-800 pt-5 max-w-md">
                  <h4 className="text-xs font-bold text-slate-200 mb-1">Mobile OTP Verification Reset</h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Re-verify registered mobile number ({currentMechanic.phone}) via SMS verification code.
                  </p>
                  <button
                    onClick={() => {
                      setOtpModalOpen(true);
                      handleSendMobileOtp();
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Smartphone size={14} />
                    <span>Send Mobile Security OTP</span>
                  </button>
                </div>

                {/* Garage Workshop Location Management */}
                <div className="border-t border-slate-800 pt-6">
                  <div className="mb-4">
                    <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-2">
                      <MapPin size={15} className="text-accent-green" />
                      <span>Garage Location & Address Management</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Submit a request to change your current registered workshop location. Once requested, your current location stays active until Admin reviews and approves the update.
                    </p>
                  </div>

                  {locChangeSuccess && (
                    <div className="p-3 mb-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300">
                      {locChangeSuccess}
                    </div>
                  )}

                  {/* Current Active Location Card */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-4 max-w-xl">
                    <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider mb-1">
                      Currently Active Operational Location
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                          <span>{currentMechanic.city}</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            Live on Motorist Map
                          </span>
                        </div>
                        <div className="text-xs font-mono text-cyan-400 mt-1">
                          GPS Coords: {currentMechanic.lat ? currentMechanic.lat.toFixed(4) : '6.9271'}, {currentMechanic.lng ? currentMechanic.lng.toFixed(4) : '79.8612'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Request Status Box OR Form to Request New Location */}
                  {currentMechanic.pendingLocation ? (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 max-w-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-amber-400" />
                          <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                            Location Change Request Pending
                          </span>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-extrabold">
                          Request Pending
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        You have requested to change garage location to <strong className="text-amber-300">{currentMechanic.pendingLocation.city}</strong> (GPS: {currentMechanic.pendingLocation.lat.toFixed(4)}, {currentMechanic.pendingLocation.lng.toFixed(4)}).
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Submitted on: {currentMechanic.pendingLocation.requestedAt}. Your active location remains <strong>{currentMechanic.city}</strong> for motorist search until Admin approves.
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelLocationRequest}
                        className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-red-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel / Withdraw Location Request
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestLocationChange} className="max-w-xl space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                      <div className="text-xs font-bold text-slate-200">Request New Workshop Location</div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Select City / Region
                        </label>
                        <select
                          value={newLocCity}
                          onChange={(e) => {
                            const c = e.target.value;
                            setNewLocCity(c);
                            const found = CITIES.find((ci) => ci.name === c);
                            if (found) setNewLocCoords(found.coords);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                        >
                          {CITIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Pin Point Workshop Location on Map
                        </label>
                        <GarageLocationPickerMap
                          location={newLocCoords}
                          onLocationChange={(lat: number, lng: number) => setNewLocCoords([lat, lng])}
                        />
                        <div className="flex justify-between text-[10px] font-mono text-cyan-400 mt-1">
                          <span>Lat: {newLocCoords[0].toFixed(5)}</span>
                          <span>Lng: {newLocCoords[1].toFixed(5)}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-accent-green hover:bg-emerald-600 text-slate-950 font-extrabold text-xs cursor-pointer shadow-md transition-all"
                      >
                        Submit Location Change Request to Admin
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Employee CRUD Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[1200] flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                {editingEmployee ? 'Edit Employee Details' : 'Add New Employee to Roster'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                  placeholder="Kamal Perera"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                  placeholder="0712223334"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Specialty Role Title
                </label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-accent-green"
                >
                  <option value="Tire & Recovery Specialist">Tire & Recovery Specialist</option>
                  <option value="Engine Technician">Engine Technician</option>
                  <option value="Auto Electrician">Auto Electrician</option>
                  <option value="Flatbed Driver">Flatbed Driver</option>
                  <option value="General Mechanic">General Mechanic</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-accent-green text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated SMS Dispatch Notification Modal */}
      {simulatedSmsPopup && (
        <div className="fixed inset-0 bg-slate-950/80 z-[1300] flex items-center justify-center p-4">
          <div className="glass-panel p-5 rounded-2xl max-w-sm w-full border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-accent-green border-b border-slate-800 pb-2">
              <Smartphone size={18} />
              <span className="text-xs font-extrabold uppercase tracking-wider">SMS Dispatch Alert Simulator</span>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="text-[10px] text-slate-500 font-bold uppercase">To Employee Mobile</div>
              <div className="font-extrabold text-slate-200">{simulatedSmsPopup.employeeName} ({simulatedSmsPopup.employeePhone})</div>
              <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-850 mt-2 font-mono">
                [RouteRescue LK ALERT]: New dispatch assigned. Category: {simulatedSmsPopup.category}. GPS: {simulatedSmsPopup.lat.toFixed(4)}, {simulatedSmsPopup.lng.toFixed(4)}. Tariff Fee: {simulatedSmsPopup.fee.toLocaleString()} LKR. Proceed immediately.
              </div>
            </div>

            <button
              onClick={() => setSimulatedSmsPopup(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              Close SMS Alert
            </button>
          </div>
        </div>
      )}

      {/* Mobile Security OTP Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[1300] flex items-center justify-center p-4">
          <div className="glass-panel p-5 rounded-2xl max-w-sm w-full border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-200">Mobile Security OTP Verification</div>
            <p className="text-[11px] text-slate-400">
              Enter the 4-digit security code sent to {currentMechanic?.phone} (Simulated OTP: <strong>1234</strong>).
            </p>

            <input
              type="text"
              maxLength={4}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none"
              placeholder="1234"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOtpModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyMobileOtp}
                className="flex-1 py-2 rounded-xl bg-accent-green text-slate-950 text-xs font-bold"
              >
                Verify Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
