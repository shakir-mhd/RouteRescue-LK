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

export const SEED_MECHANICS: Mechanic[] = [
  {
    id: 1,
    name: "Silva Auto Care",
    city: "Colombo",
    lat: 6.9271,
    lng: 79.8612,
    tier: "Basic",
    radius: 5,
    phone: "0771234567",
    status: "Approved",
    businessName: "Silva Auto Care",
    nic: "881234567V",
    password: "1234",
    isAvailable: true,
    activeJobs: 1,
    maxCapacity: 3,
    employees: [
      { id: "e101", name: "Kasun Silva", phone: "0771112223", role: "General Mechanic" }
    ]
  },
  {
    id: 2,
    name: "Lanka Fleet & Heavy Towing",
    city: "Colombo",
    lat: 6.9147,
    lng: 79.8731,
    tier: "Premium Pro",
    radius: 25,
    phone: "0719876543",
    status: "Approved",
    businessName: "Lanka Fleet & Heavy Towing",
    nic: "791987654V",
    password: "1234",
    isAvailable: true,
    activeJobs: 2,
    maxCapacity: 5,
    employees: [
      { id: "e201", name: "Kamal Perera", phone: "0712223334", role: "Tire & Recovery Specialist" },
      { id: "e202", name: "Nimal Fernando", phone: "0713334445", role: "Auto Electrician" },
      { id: "e203", name: "Sahan Jayasinghe", phone: "0714445556", role: "Flatbed Driver" }
    ]
  },
  {
    id: 3,
    name: "Senkadagala Motor Mechanics",
    city: "Kandy",
    lat: 7.2906,
    lng: 80.6337,
    tier: "Basic",
    radius: 5,
    phone: "0751122334",
    status: "Approved",
    businessName: "Senkadagala Motor Mechanics",
    nic: "825112233V",
    password: "1234",
    isAvailable: true,
    activeJobs: 0,
    maxCapacity: 3,
    employees: [
      { id: "e301", name: "Ruwan Bandara", phone: "0755556667", role: "Mechanic" }
    ]
  },
  {
    id: 4,
    name: "Hill Country Breakdown Rescue",
    city: "Kandy",
    lat: 7.2955,
    lng: 80.6380,
    tier: "Premium Pro",
    radius: 25,
    phone: "0704455667",
    status: "Approved",
    businessName: "Hill Country Service Center",
    nic: "900445566V",
    password: "1234",
    isAvailable: true,
    activeJobs: 1,
    maxCapacity: 5,
    employees: [
      { id: "e401", name: "Dinesh Rathnayake", phone: "0701119999", role: "Engine Specialist" },
      { id: "e402", name: "Pradeep Kumara", phone: "0702228888", role: "Towing Operator" }
    ]
  },
  {
    id: 5,
    name: "Southern Coastal Tire & Repair",
    city: "Galle",
    lat: 6.0535,
    lng: 80.2210,
    tier: "Basic",
    radius: 5,
    phone: "0789988776",
    status: "Approved",
    businessName: "Coastal Tire Service",
    nic: "898998877V",
    password: "1234",
    isAvailable: true,
    activeJobs: 0,
    maxCapacity: 3,
    employees: [
      { id: "e501", name: "Sunil De Silva", phone: "0783334441", role: "Tire Repairer" }
    ]
  },
  {
    id: 6,
    name: "Ruhuna Highway Express Recovery",
    city: "Galle",
    lat: 6.0367,
    lng: 80.2170,
    tier: "Premium Pro",
    radius: 25,
    phone: "0723344556",
    status: "Approved",
    businessName: "Ruhuna Highway Rescue",
    nic: "722334455V",
    password: "1234",
    isAvailable: true,
    activeJobs: 1,
    maxCapacity: 5,
    employees: [
      { id: "e601", name: "Nuwan Abeyratne", phone: "0721112233", role: "Recovery Specialist" },
      { id: "e602", name: "Chaminda Silva", phone: "0724445566", role: "Towing Operator" }
    ]
  },
  {
    id: 7,
    name: "Dinesh Wickramasinghe",
    city: "Ratnapura",
    lat: 6.6815,
    lng: 80.4080,
    tier: "Basic",
    radius: 5,
    phone: "0765544332",
    status: "Approved",
    businessName: "Sabaragamuwa Auto Tech",
    nic: "965544332V",
    password: "1234",
    isAvailable: true,
    activeJobs: 0,
    maxCapacity: 3,
    employees: [
      { id: "e701", name: "Asela Gunawardena", phone: "0767778899", role: "Auto Electrician" }
    ]
  },
  {
    id: 8,
    name: "Gem City Flatbed Services",
    city: "Ratnapura",
    lat: 6.6900,
    lng: 80.3950,
    tier: "Premium Pro",
    radius: 25,
    phone: "0746677889",
    status: "Approved",
    businessName: "Gem City Flatbeds",
    nic: "946677889V",
    password: "1234",
    isAvailable: true,
    activeJobs: 1,
    maxCapacity: 5,
    employees: [
      { id: "e801", name: "Mahela Jayawardene", phone: "0741239876", role: "Flatbed Driver" }
    ]
  },
  {
    id: 9,
    name: "Northern Light Auto Works",
    city: "Jaffna",
    lat: 9.6615,
    lng: 80.0255,
    tier: "Basic",
    radius: 5,
    phone: "0778899001",
    status: "Approved",
    businessName: "Northern Light Works",
    nic: "978899001V",
    password: "1234",
    isAvailable: true,
    activeJobs: 0,
    maxCapacity: 3,
    employees: [
      { id: "e901", name: "K. Thanabalasingam", phone: "0773332211", role: "Mechanic" }
    ]
  },
  {
    id: 10,
    name: "Peninsula Heavy Recovery",
    city: "Jaffna",
    lat: 9.6680,
    lng: 80.0120,
    tier: "Premium Pro",
    radius: 25,
    phone: "0719900112",
    status: "Approved",
    businessName: "Peninsula Towing",
    nic: "919900112V",
    password: "1234",
    isAvailable: true,
    activeJobs: 1,
    maxCapacity: 5,
    employees: [
      { id: "e1001", name: "S. Sivakumar", phone: "0715556677", role: "Tire Specialist" },
      { id: "e1002", name: "T. Rajan", phone: "0718889900", role: "Flatbed Driver" }
    ]
  }
];

export function useSharedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      if (!item && key === 'routerescue_mechanics') {
        window.localStorage.setItem(key, JSON.stringify(SEED_MECHANICS));
        return SEED_MECHANICS as unknown as T;
      }
      if (!item && key === 'routerescue_admin_settings') {
        window.localStorage.setItem(key, JSON.stringify(DEFAULT_ADMIN_SETTINGS));
        return DEFAULT_ADMIN_SETTINGS as unknown as T;
      }
      if (item && key === 'routerescue_mechanics') {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          // Auto-repair stale local storage entries for seed mechanics (e.g. Garage 7 coordinate overlap)
          const merged = SEED_MECHANICS.map((seed) => {
            const found = parsed.find((p: any) => String(p.id) === String(seed.id) || (p.phone && p.phone === seed.phone));
            if (found) {
              // If found item had overlapping lat/lng (6.6828, 80.4014), update to non-overlapping seed position (6.6815, 80.4080)
              if (seed.id === 7 && found.lat === 6.6828 && found.lng === 80.4014) {
                return { ...found, lat: seed.lat, lng: seed.lng, status: 'Approved', isAvailable: true };
              }
              return found;
            }
            return seed;
          });

          // Retain custom registered garages
          parsed.forEach((p: any) => {
            if (!merged.some((m) => String(m.id) === String(p.id))) {
              merged.push(p);
            }
          });

          window.localStorage.setItem(key, JSON.stringify(merged));
          return merged as unknown as T;
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
