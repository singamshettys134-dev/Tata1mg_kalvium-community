"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { PortalLayout } from './PortalLayout';
import {
  LayoutDashboard, Users, CheckCircle, XCircle,
  Bell, User, X, Stethoscope, Search, Plus,
  FileText, Heart, TrendingUp, Activity,
  Download, Eye, Star, Phone, Mail,
  PenLine, ClipboardList, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

type DoctorView = 'dashboard' | 'patients' | 'approved' | 'rejected' | 'history' | 'notifications' | 'profile';

interface DoctorPortalProps {
  onBack?: () => void;
}

type WeeklyData = { day: string; prescriptions: number };
type PatientData = { id: string; name: string; age: number; gender: string; condition: string; lastVisit: string; status: string; phone?: string };
type ApprovedRxData = { id: string; patient: string; approvedAt: string; medicines: string; duration: string };
type RejectedRxData = { id: string; patient: string; rejectedAt: string; reason: string; medicines: string };
type NotificationData = { id: string; type: string; title: string; body: string; time: string; read: boolean; color: string };

const weeklyData: WeeklyData[] = [];
const patients: PatientData[] = [];
const approvedRx: ApprovedRxData[] = [];
const rejectedRx: RejectedRxData[] = [];
const notifications: NotificationData[] = [];

const statusColor = (status: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    Active: { bg: '#F0FDF4', text: '#22C55E' },
    Critical: { bg: '#FFF5F5', text: '#FF6B6B' },
    'Follow-up': { bg: '#FFFBEB', text: '#F59E0B' },
    Confirmed: { bg: '#F0FDF4', text: '#22C55E' },
    Pending: { bg: '#FFFBEB', text: '#F59E0B' },
    Urgent: { bg: '#FFF5F5', text: '#FF6B6B' },
    Normal: { bg: '#EFF6FF', text: '#2563EB' },
  };
  return map[status] || { bg: '#F9FAFB', text: '#6B7280' };
};

export function DoctorPortal({}: DoctorPortalProps) {
  const [activeView, setActiveView] = useState<DoctorView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRx, setShowCreateRx] = useState(false);
  const [notifList, setNotifList] = useState<NotificationData[]>(notifications);
  const [patientList, setPatientList] = useState<PatientData[]>(patients);
  const [approvedRxList, setApprovedRxList] = useState<ApprovedRxData[]>(approvedRx);
  const [rxMedicines, setRxMedicines] = useState([{ name: '', dose: '', freq: '', duration: '' }]);

  const markAllRead = () => {
    setNotifList((list) => list.map((n) => ({ ...n, read: true })));
  };

  React.useEffect(() => {
    async function loadDoctorData() {
      try {
        const [patientsRes, rxRes, notifRes] = await Promise.all([
          fetch('/api/doctor/patients').then((r) => r.json()),
          fetch('/api/doctor/prescriptions').then((r) => r.json()),
          fetch('/api/doctor/notifications').then((r) => r.json()),
        ]);

        if (Array.isArray(patientsRes.data)) setPatientList(patientsRes.data);
        if (Array.isArray(rxRes.data)) setApprovedRxList(rxRes.data);
        if (Array.isArray(notifRes.data)) setNotifList(notifRes.data);
      } catch (e) {
        console.error('Failed to load doctor portal data', e);
      }
    }
    loadDoctorData();
  }, []);

  const navItems = [
    { id: 'dashboard' as DoctorView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients' as DoctorView, label: 'My Patients', icon: Users, badge: 8 },
    { id: 'approved' as DoctorView, label: 'Issued Prescriptions', icon: CheckCircle },
    { id: 'rejected' as DoctorView, label: 'Rejected Prescriptions', icon: XCircle },
    { id: 'history' as DoctorView, label: 'Patient History', icon: ClipboardList },
    { id: 'notifications' as DoctorView, label: 'Notifications', icon: Bell, badge: notifList.filter(n => !n.read).length },
    { id: 'profile' as DoctorView, label: 'Profile', icon: User },
  ];

  const sidebarMeta = {
    brandLabel: 'Medi',
    brandAccent: 'Track',
    brandTextColor: 'white',
    brandAccentColor: '#FF6B6B',
    background: '#1e293b',
    borderColor: '#334155',
    userName: 'Dr. Rajesh Kumar',
    userRole: 'Cardiologist',
    userSubtitle: 'Cardiology',
    userIcon: <Stethoscope className="w-5 h-5 text-white" />,
    userIconBg: '#2563EB',
    navTextColor: '#94A3B8',
    navHoverBg: '#334155',
    activeBg: '#2563EB',
    activeTextColor: 'white',
  };

  const unreadNotifications = notifList.filter(n => !n.read).length;

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Good Morning, Dr. Kumar 👋</h2>
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Tuesday, 16 January 2024</p>
        </div>
        <Button onClick={() => setShowCreateRx(true)} style={{ backgroundColor: '#2563EB' }} className="text-white gap-2">
          <Plus className="w-4 h-4" /> Create Prescription
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: String(patientList.length), icon: Users, color: '#2563EB', bg: '#EFF6FF', change: 'Registered patients' },
          { label: "Active Patients", value: String(patientList.filter(p => p.status === 'Active').length), icon: FileText, color: '#00B894', bg: '#F0FDF4', change: 'Active records' },
          { label: 'Prescriptions Issued', value: String(approvedRxList.length), icon: ClipboardList, color: '#8B5CF6', bg: '#F5F3FF', change: 'Total issued' },
          { label: 'Recent Prescriptions', value: String(approvedRxList.length), icon: CheckCircle, color: '#22C55E', bg: '#F0FDF4', change: 'Total verified' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <TrendingUp className="w-4 h-4" style={{ color: '#22C55E' }} />
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ color: '#6B7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>{stat.label}</p>
              <p style={{ color: stat.color, fontSize: '0.75rem', marginTop: '0.5rem' }}>{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Weekly Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop key="stop-1" offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop key="stop-2" offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="prescriptions" stroke="#2563EB" strokeWidth={2} fill="url(#docGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedRxList.slice(0, 3).map(rx => (
              <div key={rx.id} className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer"
                onClick={() => setActiveView('approved')}>
                <div className="flex items-start justify-between mb-1">
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1A1A2E' }}>{rx.patient}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F0FDF4', color: '#22C55E' }}>Issued</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{rx.medicines}</p>
              </div>
            ))}
            <Button variant="outline" className="w-full text-sm" onClick={() => setActiveView('approved')}>View All</Button>
          </CardContent>
        </Card>
      </div>
 
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patientList.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <User className="w-4 h-4" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1A1A2E' }}>{p.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{p.condition} · Last: {p.lastVisit}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(p.status).bg, color: statusColor(p.status).text }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PatientsView = () => {
    const filtered = patientList.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.condition.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>My Patients</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <Input placeholder="Search patients..." className="pl-9" style={{ width: '220px' }}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                      <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: '#1A1A2E' }}>{p.name}</p>
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{p.age}y · {p.gender} · {p.id}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(p.status).bg, color: statusColor(p.status).text }}>{p.status}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    <Activity className="w-3.5 h-3.5" />
                    <span>{p.condition}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Last visit: {p.lastVisit}</span>
                  </div>
                  <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    <Phone className="w-3.5 h-3.5" />
                    <span>{p.phone}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1 text-xs" style={{ backgroundColor: '#2563EB' }} onClick={() => setShowCreateRx(true)}>
                    New Rx
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs">View History</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };


  const ApprovedView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Issued Prescriptions</h2>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  {['Rx ID', 'Patient', 'Medicines', 'Duration', 'Approved On', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedRxList.map((rx, i) => (
                  <tr key={rx.id} style={{ borderBottom: i < approvedRxList.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: 600 }}>{rx.id}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#1A1A2E', fontWeight: 500 }}>{rx.patient}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280', maxWidth: '200px' }}>{rx.medicines}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280' }}>{rx.duration}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{rx.approvedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"><Eye className="w-3 h-3" /> View</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"><Download className="w-3 h-3" /> PDF</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const RejectedView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Rejected Prescriptions</h2>
      <div className="space-y-4">
        {rejectedRx.map(rx => (
          <Card key={rx.id} className="border-0 shadow-sm border-l-4" style={{ borderLeftColor: '#FF6B6B' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A2E' }}>{rx.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF5F5', color: '#FF6B6B' }}>Rejected</span>
                  </div>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#374151' }}>Patient: {rx.patient}</p>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>Medicine: {rx.medicines}</p>
                  <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: '#FFF5F5' }}>
                    <p style={{ fontSize: '0.8rem', color: '#EF4444' }}><span style={{ fontWeight: 600 }}>Reason:</span> {rx.reason}</p>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>Rejected: {rx.rejectedAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Patient History</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <Input placeholder="Search patient…" className="pl-9" style={{ width: '220px' }} />
        </div>
      </div>
      <div className="space-y-4">
        {patientList.map(p => (
          <Card key={p.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1A1A2E' }}>{p.name}</p>
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{p.age}y · {p.gender} · {p.id}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(p.status).bg, color: statusColor(p.status).text }}>{p.status}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>Condition</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{p.condition}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>Last Visit</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{p.lastVisit}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>Contact</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{p.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowCreateRx(true)}>
                  <Plus className="w-3 h-3" /> New Rx
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  <Eye className="w-3 h-3" /> View All Rx
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  <Download className="w-3 h-3" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const NotificationsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Notifications</h2>
        <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs">Mark all as read</Button>
      </div>
      <div className="space-y-3">
        {notifList.map(notif => (
          <div key={notif.id} className="p-4 rounded-xl border transition-all cursor-pointer"
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

  const ProfileView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>My Profile</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#EFF6FF' }}>
              <Stethoscope className="w-12 h-12" style={{ color: '#2563EB' }} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1A1A2E' }}>Dr. Rajesh Kumar</h3>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>MBBS, MD Cardiology</p>
            <div className="mt-3 flex justify-center">
              <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#F0FDF4', color: '#22C55E' }}>✓ Verified Doctor</span>
            </div>
            <div className="mt-4 flex justify-center gap-1">
              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>4.9/5 (128 reviews)</p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Full Name', value: 'Dr. Rajesh Kumar' },
                { label: 'Specialization', value: 'Cardiology (MD)' },
                { label: 'Registration Number', value: 'MCI-2015-KA-12345' },
                { label: 'Hospital', value: 'Apollo Hospitals, Bangalore' },
                { label: 'Experience', value: '12 years' },
                { label: 'Consultation Fee', value: '₹800 per visit' },
              ].map((field, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>{field.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A2E' }}>{field.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Phone, label: '+91 98765 43210' },
                { icon: Mail, label: 'dr.rajesh@apollohospitals.com' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <item.icon className="w-4 h-4" style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Digital Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <PenLine className="w-8 h-8 mx-auto mb-2" style={{ color: '#2563EB' }} />
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>Your digital signature is active and verified</p>
                <div className="text-center p-3 rounded-xl mb-3" style={{ backgroundColor: '#EFF6FF', fontFamily: 'cursive', fontSize: '1.5rem', color: '#2563EB' }}>
                  Dr. R. Kumar
                </div>
                <Button variant="outline" size="sm" className="text-xs">Update Signature</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const CreatePrescriptionModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1A1A2E' }}>Create Digital Prescription</h3>
          <button onClick={() => setShowCreateRx(false)} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Patient Name</label>
              <Input placeholder="Search patient..." />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Date</label>
              <Input type="date" defaultValue="2024-01-16" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Medicines</label>
              <button className="text-xs flex items-center gap-1" style={{ color: '#2563EB' }}
                onClick={() => setRxMedicines([...rxMedicines, { name: '', dose: '', freq: '', duration: '' }])}>
                <Plus className="w-3 h-3" /> Add Medicine
              </button>
            </div>
            {rxMedicines.map((med, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                <Input placeholder="Medicine name" className="col-span-2" />
                <Input placeholder="Dose" />
                <Input placeholder="Duration" />
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Doctor&apos;s Notes</label>
            <textarea className="w-full p-3 border rounded-xl resize-none" rows={3} placeholder="Special instructions, follow-up notes..."
              style={{ fontSize: '0.875rem', outline: 'none', borderColor: '#E5E7EB' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Digital Signature</label>
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#EFF6FF', fontFamily: 'cursive', fontSize: '1.5rem', color: '#2563EB' }}>
              Dr. R. Kumar
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" style={{ backgroundColor: '#2563EB' }} onClick={() => setShowCreateRx(false)}>
              <FileText className="w-4 h-4 mr-2" /> Issue Prescription
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowCreateRx(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const views: Record<DoctorView, React.ReactNode> = {
    dashboard: <DashboardView />,
    patients: <PatientsView />,
    approved: <ApprovedView />,
    rejected: <RejectedView />,
    history: <HistoryView />,
    notifications: <NotificationsView />,
    profile: <ProfileView />,
  };

  return (
    <PortalLayout
      title="Doctor Portal"
      activeView={activeView}
      onNavItemClick={setActiveView}
      navItems={navItems}
      notificationCount={unreadNotifications}
      onNotificationClick={() => setActiveView('notifications')}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      sidebarMeta={sidebarMeta}
    >
      {views[activeView]}
      {showCreateRx && <CreatePrescriptionModal />}
    </PortalLayout>
  );
}