'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface Employee {
  id: string | number;
  name: string;
  phone: string;
  role: string;
}

export interface PendingLocationRequest {
  city: string;
  lat: number;
  lng: number;
  requestedAt: string;
}

export interface Mechanic {
  id: number | string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: 'Basic' | 'Premium Pro';
  radius: number;
  phone: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  businessName: string;
  nic: string;
  password?: string;
  isAvailable?: boolean;
  isOpen?: boolean;
  employees: Employee[];
  activeJobs?: number;
  maxCapacity?: number;
  pendingLocation?: PendingLocationRequest;
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  nic: string;
  password?: string;
}

export interface Incident {
  id: string;
  category: string;
  lat: number;
  lng: number;
  status: 'Request Sent' | 'Mechanic Assigned' | 'Mechanic En Route' | 'On-Site Repair' | 'Resolved' | 'Cancelled';
  baseTariff: number;
  timestamp: string;
  mechanicId: string | number;
  distanceKm: number;
  driverName?: string;
  driverPhone?: string;
  assignedEmployee?: {
    name: string;
    phone: string;
    role: string;
  };
}

export interface AdminSettings {
  passcode: string;
  flatRate: number;
  perKmRate: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  radius: number;
  features: string[];
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  passcode: '1234',
  flatRate: 1000,
  perKmRate: 150,
};

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-basic',
    name: 'Basic',
    price: 1500,
    radius: 5,
    features: ['5km Dispatch Radius', '1 Active Emergency Job', 'Standard Directory Listing'],
  },
  {
    id: 'plan-pro',
    name: 'Premium Pro',
    price: 5000,
    radius: 25,
    features: ['25km Dispatch Radius', 'Unlimited Active Jobs', 'Priority Triage Banner', 'Fleet Analytics'],
  },
];

export interface SriLankanRegion {
  name: string;
  coords: [number, number];
}

export const SRI_LANKA_REGIONS: SriLankanRegion[] = [
  { name: 'Colombo Region', coords: [6.9271, 79.8612] },
  { name: 'Gampaha Region', coords: [7.0840, 79.9930] },
  { name: 'Kalutara Region', coords: [6.5854, 79.9607] },
  { name: 'Kandy Region', coords: [7.2906, 80.6337] },
  { name: 'Matale Region', coords: [7.4675, 80.6234] },
  { name: 'Nuwara Eliya Region', coords: [6.9497, 80.7891] },
  { name: 'Galle Region', coords: [6.0535, 80.2210] },
  { name: 'Matara Region', coords: [5.9549, 80.5550] },
  { name: 'Hambantota Region', coords: [6.1247, 81.1185] },
  { name: 'Jaffna Region', coords: [9.6615, 80.0255] },
  { name: 'Kilinochchi Region', coords: [9.3803, 80.3770] },
  { name: 'Mannar Region', coords: [8.9810, 79.9044] },
  { name: 'Vavuniya Region', coords: [8.7542, 80.4982] },
  { name: 'Mullaitivu Region', coords: [9.2671, 80.8142] },
  { name: 'Batticaloa Region', coords: [7.7310, 81.6747] },
  { name: 'Ampara Region', coords: [7.2912, 81.6724] },
  { name: 'Trincomalee Region', coords: [8.5874, 81.2152] },
  { name: 'Kurunegala Region', coords: [7.4863, 80.3647] },
  { name: 'Puttalam Region', coords: [8.0362, 79.8283] },
  { name: 'Anuradhapura Region', coords: [8.3114, 80.4037] },
  { name: 'Polonnaruwa Region', coords: [7.9403, 81.0188] },
  { name: 'Badulla Region', coords: [6.9934, 81.0550] },
  { name: 'Monaragala Region', coords: [6.8718, 81.3487] },
  { name: 'Ratnapura Region', coords: [6.6828, 80.4014] },
  { name: 'Kegalle Region', coords: [7.2513, 80.3464] },
  { name: 'Negombo Region', coords: [7.2008, 79.8737] },
  { name: 'SLTC Padukka Campus', coords: [6.8524, 80.0934] },
  { name: 'Malabe / Kaduwela', coords: [6.9061, 79.9647] },
];

export const SEED_MECHANICS: Mechanic[] = [];

export function useSharedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item && key === 'routerescue_mechanics') {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.some((p: any) => p.name === 'Silva Auto Care' || p.name === 'Lanka Fleet & Heavy Towing')) {
          // Purge stale pre-seeded local storage mechanics
          window.localStorage.removeItem(key);
          return [] as unknown as T;
        }
      }
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading localStorage key', key, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event('local-storage-sync'));

        // Asynchronously sync with Supabase Cloud Database
        if (key === 'routerescue_drivers' && Array.isArray(valueToStore)) {
          const payload = valueToStore.map((d: any) => ({
            id: String(d.id),
            name: d.name,
            phone: d.mobile || d.phone,
            nic: d.nic,
            password: d.password,
          }));
          supabase.from('drivers').upsert(payload).then(({ error }) => {
            if (error) console.error('Supabase drivers upsert error:', error);
          });
        } else if (key === 'routerescue_mechanics' && Array.isArray(valueToStore)) {
          const payload = valueToStore.map((m: any) => ({
            id: String(m.id),
            name: m.name,
            phone: m.phone,
            nic: m.nic || '',
            password: m.password || '',
            city: m.city || 'Colombo',
            lat: Number(m.lat),
            lng: Number(m.lng),
            tier: m.tier || 'Basic',
            radius: Number(m.radius) || 5,
            status: m.status || 'Pending',
            business_name: m.businessName || m.business_name || m.name,
            is_available: typeof m.isAvailable === 'boolean' ? m.isAvailable : true,
            active_jobs: Number(m.activeJobs || m.active_jobs || 0),
            max_capacity: Number(m.maxCapacity || m.max_capacity || 3),
            employees: Array.isArray(m.employees) ? m.employees : [],
            pending_location: m.pendingLocation || m.pending_location || null,
          }));
          supabase.from('mechanics').upsert(payload).then(({ error }) => {
            if (error) console.error('Supabase mechanics upsert error:', error);
          });
        } else if (key === 'routerescue_incidents' && Array.isArray(valueToStore)) {
          const payload = valueToStore.map((inc: any) => ({
            id: String(inc.id),
            category: inc.category || 'Breakdown',
            lat: Number(inc.lat),
            lng: Number(inc.lng),
            status: inc.status || 'Request Sent',
            base_tariff: Number(inc.baseTariff || inc.base_tariff || 1000),
            timestamp: inc.timestamp || new Date().toISOString(),
            mechanic_id: String(inc.mechanicId || inc.mechanic_id || ''),
            distance_km: Number(inc.distanceKm || inc.distance_km || 0),
            driver_name: inc.driverName || inc.driver_name || 'Anonymous Motorist',
            driver_phone: inc.driverPhone || inc.driver_phone || '',
            assigned_employee: inc.assignedEmployee || inc.assigned_employee || null,
          }));
          supabase.from('incidents').upsert(payload).then(({ error }) => {
            if (error) console.error('Supabase incidents upsert error:', error);
          });
        } else if (key === 'routerescue_admin_settings' && valueToStore) {
          const payload = {
            passcode: (valueToStore as any).passcode,
            flat_rate: (valueToStore as any).flatRate,
            per_km_rate: (valueToStore as any).perKmRate,
          };
          supabase.from('admin_settings').select('*').then(({ data }) => {
            if (data && data.length > 0) {
              supabase.from('admin_settings').update(payload).eq('id', data[0].id).then(({ error }) => {
                if (error) console.error('Supabase admin_settings update error:', error);
              });
            } else {
              supabase.from('admin_settings').insert([{ id: 1, ...payload }]).then(({ error }) => {
                if (error) console.error('Supabase admin_settings insert error:', error);
              });
            }
          });
        } else if (key === 'routerescue_plans' && Array.isArray(valueToStore)) {
          const payload = valueToStore.map((p: any) => ({
            id: String(p.id),
            name: p.name,
            price: p.price,
            radius: p.radius,
            features: p.features || [],
          }));
          supabase.from('subscription_plans').upsert(payload).then(({ error }) => {
            if (error) console.error('Supabase subscription_plans upsert error:', error);
          });
        }
      }
    } catch (error) {
      console.error('Error setting localStorage key', key, error);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setState(JSON.parse(item));
        }
      } catch (error) {
        console.error('Error synchronizing localStorage key', key, error);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('local-storage-sync', handleSync);

    // Initial fetch from Supabase
    if (typeof window !== 'undefined') {
      const fetchSupabase = async () => {
        try {
          if (key === 'routerescue_drivers') {
            const { data } = await supabase.from('drivers').select('*');
            if (data) {
              const mapped = data.map((d: any) => ({
                id: d.id,
                name: d.name,
                mobile: d.phone,
                nic: d.nic,
                password: d.password,
              }));
              setState(mapped as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(mapped));
            }
          } else if (key === 'routerescue_mechanics') {
            const { data } = await supabase.from('mechanics').select('*');
            let empList: any[] = [];
            try {
              const { data: eData } = await supabase.from('garage_employees').select('*');
              if (eData) empList = eData;
            } catch (e) {}

            if (data) {
              const mapped = data.map((m: any) => {
                const garageEmps = empList
                  .filter((e: any) => String(e.mechanic_id) === String(m.id))
                  .map((e: any) => ({
                    id: String(e.id),
                    name: e.name,
                    phone: e.phone,
                    role: e.role,
                  }));

                const fallbackEmps = Array.isArray(m.employees) ? m.employees : [];
                const finalEmps = garageEmps.length > 0 ? garageEmps : fallbackEmps;

                return {
                  id: m.id,
                  name: m.name,
                  phone: m.phone,
                  nic: m.nic,
                  password: m.password,
                  city: m.city,
                  lat: Number(m.lat),
                  lng: Number(m.lng),
                  tier: m.tier,
                  radius: Number(m.radius),
                  status: m.status,
                  businessName: m.business_name || m.businessName || m.name,
                  isAvailable: typeof m.is_available === 'boolean' ? m.is_available : true,
                  activeJobs: Number(m.active_jobs || m.activeJobs || 0),
                  maxCapacity: Number(m.max_capacity || m.maxCapacity || 3),
                  employees: finalEmps,
                  pendingLocation: m.pending_location || m.pendingLocation || undefined,
                };
              });
              setState(mapped as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(mapped));
            }
          } else if (key === 'routerescue_incidents') {
            const { data } = await supabase.from('incidents').select('*');
            if (data) {
              const mapped = data.map((inc: any) => ({
                id: String(inc.id),
                category: inc.category,
                lat: Number(inc.lat),
                lng: Number(inc.lng),
                status: inc.status,
                baseTariff: Number(inc.base_tariff || inc.baseTariff || 1000),
                timestamp: inc.timestamp,
                mechanicId: inc.mechanic_id || inc.mechanicId,
                distanceKm: Number(inc.distance_km || inc.distanceKm || 0),
                driverName: inc.driver_name || inc.driverName,
                driverPhone: inc.driver_phone || inc.driverPhone,
                assignedEmployee: inc.assigned_employee || inc.assignedEmployee,
              }));
              setState(mapped as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(mapped));
            }
          } else if (key === 'routerescue_admin_settings') {
            const { data } = await supabase.from('admin_settings').select('*');
            if (data && data.length > 0) {
              const s = data[0];
              const mapped: AdminSettings = {
                passcode: s.passcode,
                flatRate: Number(s.flat_rate),
                perKmRate: Number(s.per_km_rate),
              };
              setState(mapped as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(mapped));
            }
          } else if (key === 'routerescue_plans') {
            const { data } = await supabase.from('subscription_plans').select('*');
            if (data && data.length > 0) {
              const mapped: SubscriptionPlan[] = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                radius: Number(p.radius),
                features: Array.isArray(p.features) ? p.features : [],
              }));
              setState(mapped as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(mapped));
            }
          }
        } catch (e) {
          console.error('Supabase fetch error', e);
        }
      };

      fetchSupabase();
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('local-storage-sync', handleSync);
    };
  }, [key]);

  return [state, setValue];
}
