"use client";

import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { PortalLayout } from './PortalLayout';
import {
  LayoutDashboard, Stethoscope, Pill, Building2, Bell,
  Settings, X, Heart, Users, FileText,
  TrendingUp, Shield, CheckCircle, XCircle, Clock,
  Eye, Download, Search, Activity, DollarSign, Check,
  ShoppingCart, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

type AdminView = 'overview' | 'doctors' | 'pharmacists' | 'pharmacies' | 'analytics' | 'notifications' | 'settings';

interface AdminPortalProps {
  onBack?: () => void;
}

const dailyPrescriptions = [
  { date: 'Jan 10', count: 245 }, { date: 'Jan 11', count: 312 },
  { date: 'Jan 12', count: 289 }, { date: 'Jan 13', count: 358 },
  { date: 'Jan 14', count: 401 }, { date: 'Jan 15', count: 376 },
  { date: 'Jan 16', count: 428 },
];

const monthlyRevenue = [
  { month: 'Aug', revenue: 1450000 }, { month: 'Sep', revenue: 1620000 },
  { month: 'Oct', revenue: 1580000 }, { month: 'Nov', revenue: 1780000 },
  { month: 'Dec', revenue: 1920000 }, { month: 'Jan', revenue: 2150000 },
];

const topDoctors = [
  { name: 'Dr. Rajesh Kumar', prescriptions: 142 },
  { name: 'Dr. Anjali Patel', prescriptions: 128 },
  { name: 'Dr. Vikram Singh', prescriptions: 115 },
  { name: 'Dr. Meena Rao', prescriptions: 98 },
  { name: 'Dr. Arjun Nair', prescriptions: 87 },
];

const categoryData = [
  { name: 'Cardiac', value: 28, color: '#FF6B6B' },
  { name: 'Diabetes', value: 22, color: '#2563EB' },
  { name: 'Antibiotics', value: 18, color: '#00B894' },
  { name: 'Pain Relief', value: 15, color: '#F59E0B' },
  { name: 'Thyroid', value: 10, color: '#8B5CF6' },
  { name: 'Others', value: 7, color: '#EC4899' },
];

type DoctorProfile = {
  id: string;
  name: string;
  regNo: string;
  hospital: string;
  specialization: string;
  licenseFile?: string;
  status: string;
};

type PharmacistProfile = {
  id: string;
  name: string;
  pharmacyLicense?: string;
  regNo: string;
  experience?: string;
  status: string;
};

type PharmacyProfile = {
  id: string;
  name: string;
  drugLicense?: string;
  gst?: string;
  address?: string;
  owner?: string;
  status: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  color: string;
};

const doctors: DoctorProfile[] = [];
const pharmacists: PharmacistProfile[] = [];
const pharmacies: PharmacyProfile[] = [];
const adminNotifications: NotificationItem[] = [];

const statusColor = (status: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    // Prisma enum values
    PENDING:      { bg: '#FFFBEB', text: '#F59E0B' },
    UNDER_REVIEW: { bg: '#EFF6FF', text: '#2563EB' },
    VERIFIED:     { bg: '#F0FDF4', text: '#22C55E' },
    REJECTED:     { bg: '#FFF5F5', text: '#FF6B6B' },
    // Legacy display labels (fallback)
    Pending:        { bg: '#FFFBEB', text: '#F59E0B' },
    'Under Review': { bg: '#EFF6FF', text: '#2563EB' },
    Verified:       { bg: '#F0FDF4', text: '#22C55E' },
    Rejected:       { bg: '#FFF5F5', text: '#FF6B6B' },
  };
  return map[status] || { bg: '#F9FAFB', text: '#6B7280' };
};

const statusIcon = (status: string) => {
  if (status === 'VERIFIED' || status === 'Verified') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'REJECTED' || status === 'Rejected') return <XCircle className="w-3.5 h-3.5" />;
  if (status === 'UNDER_REVIEW' || status === 'Under Review') return <Eye className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

/** Human-readable label for Prisma enum status */
const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PENDING: 'Pending', UNDER_REVIEW: 'Under Review',
    VERIFIED: 'Verified', REJECTED: 'Rejected',
  };
  return labels[status] || status;
};

type MetricCounts = { doctors: number; pharmacists: number; pharmacies: number; patients: number; prescriptions: number; orders: number };
type DailyPoint = { date: string; count: number };
type TopDoctorPoint = { name: string; prescriptions: number };

export function AdminPortal({}: AdminPortalProps) {
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorList, setDoctorList] = useState<DoctorProfile[]>(doctors);
  const [pharmList, setPharmList] = useState<PharmacistProfile[]>(pharmacists);
  const [pharmacyList, setPharmacyList] = useState<PharmacyProfile[]>(pharmacies);
  const [notifList, setNotifList] = useState<NotificationItem[]>(adminNotifications);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricCounts | null>(null);
  const [liveDaily, setLiveDaily] = useState<DailyPoint[]>(dailyPrescriptions);
  const [liveTopDoctors, setLiveTopDoctors] = useState<TopDoctorPoint[]>(topDoctors);
  const [adminProfile, setAdminProfile] = useState<{ name: string; employeeId: string; department: string; email?: string; user?: { email: string } } | null>(null);

  // Fetch real DB data
  const refreshData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, pharmsRes, phrmciesRes, notifsRes, metricsRes, profileRes] = await Promise.all([
        fetch('/api/admin/doctors').then((r) => r.json()),
        fetch('/api/admin/pharmacists').then((r) => r.json()),
        fetch('/api/admin/pharmacies').then((r) => r.json()),
        fetch('/api/admin/notifications').then((r) => r.json()),
        fetch('/api/admin/metrics').then((r) => r.json()),
        fetch('/api/admin/profile').then((r) => r.json()),
      ]);

      if (docsRes.data?.data) setDoctorList(docsRes.data.data);
      if (pharmsRes.data?.data) setPharmList(pharmsRes.data.data);
      if (phrmciesRes.data?.data) setPharmacyList(phrmciesRes.data.data);
      if (notifsRes.data?.data) setNotifList(notifsRes.data.data);
      if (metricsRes.data) {
        setMetrics(metricsRes.data.counts);
        if (Array.isArray(metricsRes.data.dailyPrescriptions)) setLiveDaily(metricsRes.data.dailyPrescriptions);
        if (Array.isArray(metricsRes.data.topDoctors)) setLiveTopDoctors(metricsRes.data.topDoctors);
      }
      if (profileRes.data) setAdminProfile(profileRes.data);
    } catch (e) {
      console.error('Failed to fetch admin data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleVerifyDoctor = async (id: string) => {
    try {
      await fetch(`/api/admin/doctors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectDoctor = async (id: string) => {
    try {
      await fetch(`/api/admin/doctors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyPharmacist = async (id: string) => {
    try {
      await fetch(`/api/admin/pharmacists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPharmacist = async (id: string) => {
    try {
      await fetch(`/api/admin/pharmacists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyPharmacy = async (id: string) => {
    try {
      await fetch(`/api/admin/pharmacies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPharmacy = async (id: string) => {
    try {
      await fetch(`/api/admin/pharmacies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [doctorsRes, pharmacistsRes, pharmaciesRes, notificationsRes] = await Promise.all([
          fetch('/api/admin/doctors'),
          fetch('/api/admin/pharmacists'),
          fetch('/api/admin/pharmacies'),
          fetch('/api/admin/notifications'),
        ]);

        const [doctorsPayload, pharmacistsPayload, pharmaciesPayload, notificationsPayload] = await Promise.all([
          doctorsRes.json().catch(() => ({})),
          pharmacistsRes.json().catch(() => ({})),
          pharmaciesRes.json().catch(() => ({})),
          notificationsRes.json().catch(() => ({})),
        ]);

        const normalizeRows = (payload: any) => {
          const list = payload?.data?.data ?? payload?.data ?? payload;
          return Array.isArray(list) ? list : [];
        };

        const mappedDoctors = normalizeRows(doctorsPayload).map((item: any) => ({
          id: item.id,
          name: item.name || item.email || 'Doctor',
          regNo: item.regNo || item.licenseNumber || 'N/A',
          hospital: item.hospital || 'Pending review',
          specialization: item.specialization || 'General Medicine',
          licenseFile: item.licenseFile || 'license.pdf',
          status: item.status ? item.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Pending',
        }));

        const mappedPharmacists = normalizeRows(pharmacistsPayload).map((item: any) => ({
          id: item.id,
          name: item.name || item.email || 'Pharmacist',
          pharmacyLicense: item.pharmacyLicense || item.licenseNumber || 'N/A',
          regNo: item.regNo || 'N/A',
          experience: item.experience || 'Pending review',
          status: item.status ? item.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Pending',
        }));

        const mappedPharmacies = normalizeRows(pharmaciesPayload).map((item: any) => ({
          id: item.id,
          name: item.name || item.email || 'Pharmacy',
          drugLicense: item.drugLicense || item.licenseNumber || 'N/A',
          gst: item.gst || 'N/A',
          address: item.address || item.city || 'Pending review',
          owner: item.owner || 'Pending review',
          status: item.status ? item.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Pending',
        }));

        const mappedNotifications = normalizeRows(notificationsPayload).map((item: any) => ({
          id: item.id || item._id || Date.now(),
          title: item.title || item.message || 'New notification',
          body: item.body || item.message || 'Review pending action',
          time: item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now',
          read: Boolean(item.read),
          color: item.type === 'error' ? '#FF6B6B' : item.type === 'success' ? '#00B894' : '#2563EB',
        }));

        if (mappedDoctors.length) setDoctorList(mappedDoctors);
        if (mappedPharmacists.length) setPharmList(mappedPharmacists);
        if (mappedPharmacies.length) setPharmacyList(mappedPharmacies);
        if (mappedNotifications.length) setNotifList(mappedNotifications);
      } catch {
        // Keep the existing static fallback data when the backend is unavailable.
      }
    };

    loadData();
  }, []);

  const navItems = [
    { id: 'overview' as AdminView, label: 'Overview', icon: LayoutDashboard },
    { id: 'doctors' as AdminView, label: 'Doctor Verification', icon: Stethoscope, badge: doctorList.filter(d => d.status === 'Pending').length },
    { id: 'pharmacists' as AdminView, label: 'Pharmacist Verification', icon: Pill, badge: pharmList.filter(p => p.status === 'Pending').length },
    { id: 'pharmacies' as AdminView, label: 'Pharmacy Verification', icon: Building2, badge: pharmacyList.filter(p => p.status === 'Pending').length },
    { id: 'analytics' as AdminView, label: 'Analytics', icon: TrendingUp },
    { id: 'notifications' as AdminView, label: 'Notifications', icon: Bell, badge: notifList.filter(n => !n.read).length },
    { id: 'settings' as AdminView, label: 'Settings', icon: Settings },
  ];

  const sidebarMeta = {
    brandLabel: 'Medi',
    brandAccent: 'Track',
    brandTextColor: 'white',
    brandAccentColor: '#FF6B6B',
    background: '#1A1A2E',
    borderColor: '#2D2D4E',
    userName: adminProfile?.name || 'Loading…',
    userRole: 'Admin',
    userSubtitle: adminProfile?.email || adminProfile?.user?.email || adminProfile?.department || '',
    userIcon: <Shield className="w-5 h-5 text-white" />,
    userIconBg: '#FF6B6B',
    navTextColor: '#94A3B8',
    navHoverBg: '#2D2D4E',
    activeBg: '#FF6B6B',
    activeTextColor: 'white',
  };

  const unreadNotifications = notifList.filter(n => !n.read).length;

  const OverviewView = () => (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Admin Overview</h2>
        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Platform performance at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Doctors', value: metrics ? metrics.doctors.toLocaleString() : '—', icon: Stethoscope, color: '#2563EB', bg: '#EFF6FF', change: 'Registered doctors' },
          { label: 'Total Pharmacists', value: metrics ? metrics.pharmacists.toLocaleString() : '—', icon: Pill, color: '#00B894', bg: '#F0FDF4', change: 'Registered pharmacists' },
          { label: 'Total Pharmacies', value: metrics ? metrics.pharmacies.toLocaleString() : '—', icon: Building2, color: '#8B5CF6', bg: '#F5F3FF', change: 'Registered pharmacies' },
          { label: 'Total Patients', value: metrics ? metrics.patients.toLocaleString() : '—', icon: Users, color: '#F59E0B', bg: '#FFFBEB', change: 'Registered patients' },
          { label: 'Total Prescriptions', value: metrics ? metrics.prescriptions.toLocaleString() : '—', icon: FileText, color: '#FF6B6B', bg: '#FFF5F5', change: 'All-time prescriptions' },
          { label: 'Total Orders', value: metrics ? metrics.orders.toLocaleString() : '—', icon: ShoppingCart, color: '#22C55E', bg: '#F0FDF4', change: 'All-time orders' },
          { label: 'Pending Doctors', value: doctorList.filter(d => d.status === 'PENDING' || d.status === 'Pending').length.toLocaleString(), icon: DollarSign, color: '#EC4899', bg: '#FDF2F8', change: 'Awaiting verification' },
          { label: 'Pending Pharmacies', value: pharmacyList.filter(p => p.status === 'PENDING' || p.status === 'Pending').length.toLocaleString(), icon: Activity, color: '#06B6D4', bg: '#F0FDFF', change: 'Awaiting verification' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: '#22C55E' }} />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ color: '#6B7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: '0.7rem', marginTop: '0.5rem' }}>{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Daily Prescriptions (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={liveDaily}>
                <defs>
                  <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="stop-1" offset="5%" stopColor="#FF6B6B" stopOpacity={0.2} />
                    <stop key="stop-2" offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#FF6B6B" strokeWidth={2} fill="url(#adminGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Prescription Categories</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Pending Verifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { type: 'Doctor', count: doctorList.filter(d => d.status === 'Pending').length, color: '#2563EB', icon: Stethoscope, view: 'doctors' as AdminView },
              { type: 'Pharmacist', count: pharmList.filter(p => p.status === 'Pending').length, color: '#00B894', icon: Pill, view: 'pharmacists' as AdminView },
              { type: 'Pharmacy', count: pharmacyList.filter(p => p.status === 'Pending').length, color: '#8B5CF6', icon: Building2, view: 'pharmacies' as AdminView },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:opacity-80"
                style={{ backgroundColor: item.color + '10' }}
                onClick={() => setActiveView(item.view)}>
                <div className="flex items-center gap-2">
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{item.type} Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: item.color, color: 'white' }}>{item.count} pending</span>
                  <ChevronRight className="w-4 h-4" style={{ color: item.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Top Performing Doctors</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {liveTopDoctors.map((doc, i) => (
              <div key={i} className="flex items-center gap-3">
                <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '16px' }}>{i + 1}</span>
                <div className="flex-1">
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1A1A2E' }}>{doc.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                      <div className="h-full rounded-full" style={{ backgroundColor: '#2563EB', width: `${(doc.prescriptions / 150) * 100}%` }}></div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF', minWidth: '50px', textAlign: 'right' }}>{doc.prescriptions} Rx</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );  const VerificationTable = ({
    data, onVerify, onReject, columns
  }: {
    data: Array<Record<string, unknown>>,
    onVerify: (id: string) => void,
    onReject: (id: string) => void,
    columns: Array<{ key: string; label: string }>,
  }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>{col.label}</th>
                ))}
                <th className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>Status</th>
                <th className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={String(row.id)} style={{ borderBottom: i < data.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3" style={{ fontSize: '0.8rem', color: col.key === 'name' ? '#1A1A2E' : '#6B7280', fontWeight: col.key === 'name' ? 600 : 400, whiteSpace: 'nowrap' }}>
                      {col.key === 'licenseFile' ? (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                          <Download className="w-3 h-3" /> View
                        </Button>
                      ) : String(row[col.key] || '')}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ backgroundColor: statusColor(String(row.status || '')).bg, color: statusColor(String(row.status || '')).text }}>
                      {statusIcon(String(row.status || ''))} {statusLabel(String(row.status || ''))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {row.status !== 'VERIFIED' && row.status !== 'Verified' && (
                        <Button size="sm" onClick={() => onVerify(String(row.id))} style={{ backgroundColor: '#22C55E', height: '28px', fontSize: '0.75rem', gap: '4px' }} className="text-white px-2">
                          <Check className="w-3 h-3" /> Verify
                        </Button>
                      )}
                      {row.status !== 'REJECTED' && row.status !== 'Rejected' && (
                        <Button size="sm" variant="outline" onClick={() => onReject(String(row.id))} className="border-red-200 text-red-500 hover:bg-red-50 h-7 px-2 text-xs gap-1">
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const DoctorsView = () => {
    const filtered = doctorList.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Doctor Verification</h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
              <span className="text-yellow-600 font-medium">{doctorList.filter(d => d.status === 'Pending').length} Pending</span>
              {' · '}
              <span style={{ color: '#2563EB' }}>{doctorList.filter(d => d.status === 'Under Review').length} Under Review</span>
              {' · '}
              <span style={{ color: '#22C55E' }}>{doctorList.filter(d => d.status === 'Verified').length} Verified</span>
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <Input placeholder="Search doctors..." className="pl-9" style={{ width: '220px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-2">
          {[
            { label: 'Pending', count: doctorList.filter(d => d.status === 'Pending').length, color: '#F59E0B', bg: '#FFFBEB' },
            { label: 'Under Review', count: doctorList.filter(d => d.status === 'Under Review').length, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Verified', count: doctorList.filter(d => d.status === 'Verified').length, color: '#22C55E', bg: '#F0FDF4' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: s.bg }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.count}</p>
              <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <VerificationTable
          data={filtered}
          onVerify={handleVerifyDoctor}
          onReject={handleRejectDoctor}
          columns={[
            { key: 'name', label: 'Doctor Name' },
            { key: 'regNo', label: 'Registration No.' },
            { key: 'hospital', label: 'Hospital' },
            { key: 'specialization', label: 'Specialization' },
            { key: 'licenseFile', label: 'License' },
          ]}
        />
      </div>
    );
  };

  const PharmacistsView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Pharmacist Verification</h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
            <span className="text-yellow-600 font-medium">{pharmList.filter(p => p.status === 'Pending').length} Pending</span>
            {' · '}
            <span style={{ color: '#22C55E' }}>{pharmList.filter(p => p.status === 'Verified').length} Verified</span>
          </p>
        </div>
      </div>
      <VerificationTable
        data={pharmList}
        onVerify={handleVerifyPharmacist}
        onReject={handleRejectPharmacist}
        columns={[
          { key: 'name', label: 'Pharmacist Name' },
          { key: 'pharmacyLicense', label: 'Pharmacy License' },
          { key: 'regNo', label: 'Registration No.' },
          { key: 'experience', label: 'Experience' },
          { key: 'licenseFile', label: 'Documents' },
        ]}
      />
    </div>
  );

  const PharmaciesView = () => (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Pharmacy Verification</h2>
        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
          <span className="text-yellow-600 font-medium">{pharmacyList.filter(p => p.status === 'Pending').length} Pending</span>
          {' · '}
          <span style={{ color: '#22C55E' }}>{pharmacyList.filter(p => p.status === 'Verified').length} Verified</span>
        </p>
      </div>
      <VerificationTable
        data={pharmacyList}
        onVerify={handleVerifyPharmacy}
        onReject={handleRejectPharmacy}
        columns={[
          { key: 'name', label: 'Pharmacy Name' },
          { key: 'drugLicense', label: 'Drug License' },
          { key: 'gst', label: 'GST Number' },
          { key: 'address', label: 'Address' },
          { key: 'owner', label: 'Owner' },
        ]}
      />
    </div>
  );

  const AnalyticsView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Analytics Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Daily Prescriptions Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={liveDaily}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop key="stop-1" offset="5%" stopColor="#FF6B6B" stopOpacity={0.2} />
                    <stop key="stop-2" offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#FF6B6B" strokeWidth={2} fill="url(#grad1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                <Tooltip formatter={(v: number) => [`₹${(v / 100000).toFixed(1)}L`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#00B894" strokeWidth={2} dot={{ fill: '#00B894', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Doctor Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={liveTopDoctors} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="prescriptions" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Prescription by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3} label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Verification Request Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Verification Requests', value: (doctorList.length + pharmList.length + pharmacyList.length).toString(), sub: 'All-time registrations', color: '#FF6B6B' },
              { label: 'Approved', value: [...doctorList, ...pharmList, ...pharmacyList].filter(x => x.status === 'VERIFIED' || x.status === 'Verified').length.toString(), sub: 'Total verified accounts', color: '#22C55E' },
              { label: 'Pending', value: [...doctorList, ...pharmList, ...pharmacyList].filter(x => x.status === 'PENDING' || x.status === 'Pending').length.toString(), sub: 'Awaiting review', color: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} className="p-5 rounded-xl" style={{ backgroundColor: s.color + '10' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginTop: '0.25rem' }}>{s.label}</p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const NotificationsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Notifications</h2>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setNotifList(l => l.map(n => ({ ...n, read: true })))}>Mark all as read</Button>
      </div>
      <div className="space-y-3">
        {notifList.map(notif => (
          <div key={notif.id} className="p-4 rounded-xl border transition-all"
            style={{ backgroundColor: notif.read ? 'white' : '#F8FAFC', borderColor: notif.read ? '#E5E7EB' : notif.color + '30' }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: notif.color + '15' }}>
                <Bell className="w-4 h-4" style={{ color: notif.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p style={{ fontWeight: notif.read ? 500 : 600, fontSize: '0.875rem', color: '#1A1A2E' }}>{notif.title}</p>
                  {!notif.read && <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: notif.color }}></div>}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>{notif.body}</p>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>{notif.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>System Settings</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: 'Verification Settings', items: ['Auto-assign reviews to senior admins', 'Email notifications for new registrations', 'Require 2-factor verification for licenses', 'Auto-expire unreviewed applications in 30 days'] },
          { title: 'Notification Settings', items: ['Daily summary report via email', 'Low stock alerts to pharmacists', 'License expiry reminders (30 days before)', 'New patient registration alerts'] },
          { title: 'Platform Settings', items: ['Maintenance mode', 'API rate limiting', 'Session timeout (30 minutes)', 'Two-factor authentication for admin'] },
          { title: 'Data & Privacy', items: ['HIPAA compliance mode', 'Data encryption at rest', 'Audit log retention (5 years)', 'Patient data anonymization'] },
        ].map((section, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>{section.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {section.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{item}</span>
                  <div className="w-10 h-5 rounded-full relative cursor-pointer" style={{ backgroundColor: j % 2 === 0 ? '#22C55E' : '#E5E7EB' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 shadow-sm transition-all"
                      style={{ left: j % 2 === 0 ? '22px' : '2px' }}></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const views: Record<AdminView, React.ReactNode> = {
    overview: <OverviewView />,
    doctors: <DoctorsView />,
    pharmacists: <PharmacistsView />,
    pharmacies: <PharmaciesView />,
    analytics: <AnalyticsView />,
    notifications: <NotificationsView />,
    settings: <SettingsView />,
  };

  return (
    <PortalLayout
      title="Admin Dashboard"
      activeView={activeView}
      onNavItemClick={(view) => setActiveView(view)}
      navItems={navItems}
      notificationCount={unreadNotifications}
      onNotificationClick={() => setActiveView('notifications')}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      sidebarMeta={sidebarMeta}
    >
      <div style={{ opacity: loading ? 0.5 : 1 }}>{views[activeView]}</div>
    </PortalLayout>
  );
}