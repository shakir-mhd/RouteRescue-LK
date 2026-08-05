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

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  passcode: '1234',
  flatRate: 1000,
  perKmRate: 150,
};

export const SEED_MECHANICS: Mechanic[] = [];

export function useSharedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
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
          supabase.from('drivers').upsert(payload).then(() => {});
        } else if (key === 'routerescue_mechanics' && Array.isArray(valueToStore)) {
          supabase.from('mechanics').upsert(valueToStore).then(() => {});
        } else if (key === 'routerescue_incidents' && Array.isArray(valueToStore)) {
          supabase.from('incidents').upsert(valueToStore).then(() => {});
        } else if (key === 'routerescue_admin_settings' && valueToStore) {
          const payload = {
            id: 1,
            passcode: (valueToStore as any).passcode,
            flat_rate: (valueToStore as any).flatRate,
            per_km_rate: (valueToStore as any).perKmRate,
          };
          supabase.from('admin_settings').upsert(payload).then(() => {});
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
            if (data && data.length > 0) {
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
            if (data && data.length > 0) {
              setState(data as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(data));
            }
          } else if (key === 'routerescue_incidents') {
            const { data } = await supabase.from('incidents').select('*');
            if (data && data.length > 0) {
              setState(data as unknown as T);
              window.localStorage.setItem(key, JSON.stringify(data));
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
