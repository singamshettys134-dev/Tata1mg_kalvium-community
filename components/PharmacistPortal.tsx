"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { PortalLayout } from './PortalLayout';
import {
  LayoutDashboard, Clock, CheckCircle, Package, ShoppingCart,
  Users, Bell, User, BarChart2, X, Heart,
  Search, TrendingUp, AlertCircle, Truck, FileText,
  Eye, Check, XCircle, DollarSign, Plus, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

type PharmView = 'dashboard' | 'incoming' | 'verified' | 'inventory' | 'orders' | 'customers' | 'notifications' | 'reports' | 'profile';

interface PharmacistPortalProps {
  onBack?: () => void;
}

type WeeklyOrders = { day: string; orders: number; revenue: number };
type MonthlyRevenue = { month: string; revenue: number };
type CategoryData = { name: string; value: number; color: string };
type InventoryItem = { id: string; name: string; category: string; stock: number; minStock: number; price: string; expiry?: string; status: string };
type IncomingPrescription = { id: string; patient: string; doctor: string; receivedAt: string; medicines: string[]; total: string; status: string };
type OrderItem = { id: string; patient: string; rx: string; date: string; total: string; status: string; address: string };
type CustomerItem = { id: string; name: string; phone: string; orders: number; lastOrder: string; totalSpend: string };
type NotificationItem = { id: string; title: string; body: string; time: string; read: boolean; color: string };

const weeklyOrders: WeeklyOrders[] = [];
const monthlyRevenue: MonthlyRevenue[] = [];
const categoryData: CategoryData[] = [];
const inventory: InventoryItem[] = [];
const incomingPrescriptions: IncomingPrescription[] = [];
const orders: OrderItem[] = [];
const customers: CustomerItem[] = [];
const pharmNotifications: NotificationItem[] = [];

const statusColor = (status: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    'In Stock': { bg: '#F0FDF4', text: '#22C55E' },
    'Low Stock': { bg: '#FFFBEB', text: '#F59E0B' },
    'Out of Stock': { bg: '#FFF5F5', text: '#FF6B6B' },
    'Pending': { bg: '#EFF6FF', text: '#2563EB' },
    'Under Review': { bg: '#FFFBEB', text: '#F59E0B' },
    'Verified': { bg: '#F0FDF4', text: '#22C55E' },
    'Packing': { bg: '#F5F3FF', text: '#8B5CF6' },
    'Ready for Delivery': { bg: '#F0FDF4', text: '#00B894' },
    'Out for Delivery': { bg: '#EFF6FF', text: '#2563EB' },
    'Delivered': { bg: '#F0FDF4', text: '#22C55E' },
  };
  return map[status] || { bg: '#F9FAFB', text: '#6B7280' };
};

export function PharmacistPortal({}: PharmacistPortalProps) {
  const [activeView, setActiveView] = useState<PharmView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingList, setIncomingList] = useState<IncomingPrescription[]>(incomingPrescriptions);
  const [notifList, setNotifList] = useState<NotificationItem[]>(pharmNotifications);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(inventory);
  const [orderList, setOrderList] = useState<OrderItem[]>(orders);

  const [weeklyData, setWeeklyData] = useState<WeeklyOrders[]>(weeklyOrders);

  React.useEffect(() => {
    async function loadPharmData() {
      try {
        const [rxRes, invRes, ordRes, notifRes, repRes] = await Promise.all([
          fetch('/api/pharmacist/prescriptions').then((r) => r.json()),
          fetch('/api/pharmacist/inventory').then((r) => r.json()),
          fetch('/api/pharmacist/orders').then((r) => r.json()),
          fetch('/api/pharmacist/notifications').then((r) => r.json()),
          fetch('/api/pharmacist/reports').then((r) => r.json()),
        ]);

        if (Array.isArray(rxRes.data)) setIncomingList(rxRes.data);
        if (Array.isArray(invRes.data)) setInventoryList(invRes.data);
        if (Array.isArray(ordRes.data)) setOrderList(ordRes.data);
        if (Array.isArray(notifRes.data)) setNotifList(notifRes.data);
        if (repRes.data?.weeklyOrders) setWeeklyData(repRes.data.weeklyOrders);
      } catch (e) {
        console.error('Failed to load pharmacist portal data', e);
      }
    }
    loadPharmData();
  }, []);

  const navItems = [
    { id: 'dashboard' as PharmView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incoming' as PharmView, label: 'Incoming Prescriptions', icon: FileText, badge: incomingList.filter(r => r.status === 'Pending').length },
    { id: 'verified' as PharmView, label: 'Verified Prescriptions', icon: CheckCircle },
    { id: 'inventory' as PharmView, label: 'Medicine Inventory', icon: Package },
    { id: 'orders' as PharmView, label: 'Orders', icon: ShoppingCart, badge: 3 },
    { id: 'customers' as PharmView, label: 'Customers', icon: Users },
    { id: 'notifications' as PharmView, label: 'Notifications', icon: Bell, badge: notifList.filter(n => !n.read).length },
    { id: 'reports' as PharmView, label: 'Reports', icon: BarChart2 },
    { id: 'profile' as PharmView, label: 'Profile', icon: User },
  ];

  const sidebarMeta = {
    brandLabel: 'Medi',
    brandAccent: 'Track',
    brandTextColor: 'white',
    brandAccentColor: '#00B894',
    background: '#134e4a',
    borderColor: '#0f3d39',
    userName: 'Priya Sharma',
    userRole: 'Senior Pharmacist',
    userSubtitle: 'MedPlus Pharmacy',
    userIcon: <Package className="w-5 h-5 text-white" />,
    userIconBg: '#00B894',
    navTextColor: '#99D6CC',
    navHoverBg: '#0f3d39',
    activeBg: '#00B894',
    activeTextColor: 'white',
  };

  const unreadNotifications = notifList.filter(n => !n.read).length;

  const DashboardView = () => (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Good Morning, Priya 👋</h2>
        <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Tuesday, 16 January 2024 · MedPlus Pharmacy, Koramangala</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Orders', value: String(orderList.filter(o => o.status === 'Processing' || o.status === 'PENDING').length), icon: Clock, color: '#F59E0B', bg: '#FFFBEB', change: 'Awaiting fulfillment' },
          { label: 'Ready / Completed', value: String(orderList.filter(o => o.status === 'Ready' || o.status === 'COMPLETED' || o.status === 'Delivered').length), icon: Package, color: '#00B894', bg: '#F0FDF4', change: 'Processed orders' },
          { label: 'Low Stock Medicines', value: String(inventoryList.filter(i => i.status === 'Low Stock' || i.status === 'Out of Stock').length), icon: AlertCircle, color: '#FF6B6B', bg: '#FFF5F5', change: 'Needs reorder' },
          { label: "Total Inventory Items", value: String(inventoryList.length), icon: DollarSign, color: '#2563EB', bg: '#EFF6FF', change: 'In catalog' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Weekly Orders & Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="orders" fill="#00B894" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Medicine Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventoryList.filter(m => m.status !== 'In Stock').map((med, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1A1A2E' }}>{med.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{med.category}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(med.status).bg, color: statusColor(med.status).text }}>
                    {med.status}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>{med.stock} units</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
 
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderList.slice(0, 4).map((order, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1A1A2E' }}>{order.patient}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{order.id} · {order.total}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(order.status).bg, color: statusColor(order.status).text }}>
                  {order.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const IncomingView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Incoming Prescriptions</h2>
        <Badge style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{incomingList.length} Received</Badge>
      </div>
      <div className="space-y-4">
        {incomingList.map(rx => (
          <Card key={rx.id} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A2E' }}>{rx.patient}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor(rx.status).bg, color: statusColor(rx.status).text }}>{rx.status}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Doctor: {rx.doctor} · {rx.id}</p>
                      <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Received: {rx.receivedAt}</p>
                    </div>
                    <p style={{ fontWeight: 700, color: '#00B894', fontSize: '1rem' }}>{rx.total}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Medicines:</p>
                    <div className="flex flex-wrap gap-2">
                      {rx.medicines.map((med, i) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#F0FDF4', color: '#00B894', border: '1px solid #BBF7D0' }}>{med}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex lg:flex-col gap-2">
                  <Button onClick={() => setIncomingList(list => list.map(r => r.id === rx.id ? { ...r, status: 'Verified' } : r))}
                    style={{ backgroundColor: '#22C55E' }} className="text-white flex-1 lg:flex-none gap-2">
                    <Check className="w-4 h-4" /> Accept
                  </Button>
                  <Button onClick={() => setIncomingList(list => list.filter(r => r.id !== rx.id))}
                    variant="outline" className="border-red-200 text-red-500 hover:bg-red-50 flex-1 lg:flex-none gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                  <Button variant="outline" className="flex-1 lg:flex-none gap-2">
                    <Eye className="w-4 h-4" /> View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const VerifiedView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Verified Prescriptions</h2>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  {['Rx ID', 'Patient', 'Doctor', 'Medicines', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incomingList.filter(r => r.status === 'Verified' || r.status === 'FILLED' || r.status === 'APPROVED').map((rx, i, arr) => (
                  <tr key={rx.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#00B894', fontWeight: 600 }}>{rx.id}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#1A1A2E', fontWeight: 500 }}>{rx.patient}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280' }}>{rx.doctor}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280' }}>{rx.medicines[0]}...</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#00B894', fontWeight: 600 }}>{rx.total}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#F0FDF4', color: '#22C55E' }}>Verified</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Bill</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">Dispatch</Button>
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

  const InventoryView = () => {
    const filtered = inventoryList.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Medicine Inventory</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <Input placeholder="Search medicine..." className="pl-9" style={{ width: '200px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button style={{ backgroundColor: '#00B894' }} className="text-white gap-2">
              <Plus className="w-4 h-4" /> Add Stock
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                    {['ID', 'Medicine', 'Category', 'Stock', 'Min Stock', 'Price', 'Expiry', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((med, i) => (
                    <tr key={med.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td className="px-4 py-3" style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{med.id}</td>
                      <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#1A1A2E', fontWeight: 600 }}>{med.name}</td>
                      <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280' }}>{med.category}</td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: med.stock === 0 ? '#FF6B6B' : med.stock < med.minStock ? '#F59E0B' : '#22C55E' }}>
                          {med.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{med.minStock}</td>
                      <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{med.price}</td>
                      <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{med.expiry}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: statusColor(med.status).bg, color: statusColor(med.status).text }}>
                          {med.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1">
                          <RefreshCw className="w-3 h-3" /> Restock
                        </Button>
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
  };

  const OrdersView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Orders</h2>
      <div className="space-y-4">
        {orderList.map(order => (
          <Card key={order.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontWeight: 700, color: '#1A1A2E' }}>{order.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor(order.status).bg, color: statusColor(order.status).text }}>{order.status}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#374151' }}>Patient: {order.patient}</p>
                  <p style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Rx: {order.rx} · {order.date}</p>
                  <div className="flex items-center gap-1 mt-1" style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                    <Truck className="w-3.5 h-3.5" />
                    <span>{order.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#00B894' }}>{order.total}</span>
                  <div className="flex gap-2">
                    {order.status === 'Packing' && (
                      <Button size="sm" style={{ backgroundColor: '#00B894' }} className="text-white text-xs">Mark Ready</Button>
                    )}
                    {order.status === 'Ready for Delivery' && (
                      <Button size="sm" style={{ backgroundColor: '#2563EB' }} className="text-white text-xs">Dispatch</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs gap-1"><FileText className="w-3 h-3" /> Bill</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const CustomersView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Customers</h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <Input placeholder="Search customer..." className="pl-9" style={{ width: '200px' }} />
        </div>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  {['Customer', 'Phone', 'Total Orders', 'Last Order', 'Total Spend', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                          <User className="w-4 h-4" style={{ color: '#00B894' }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E' }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#6B7280' }}>{c.phone}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{c.orders}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{c.lastOrder}</td>
                    <td className="px-4 py-3" style={{ fontSize: '0.875rem', color: '#00B894', fontWeight: 600 }}>{c.totalSpend}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs">View History</Button>
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

  const ReportsView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>Reports & Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#00B894" strokeWidth={2} dot={{ fill: '#00B894', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Order Completion Rate</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="orders" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Performance Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Orders Processed', value: '1,248', color: '#2563EB' },
                { label: 'Total Revenue', value: '₹2.15L', color: '#00B894' },
                { label: 'Average Order Value', value: '₹342', color: '#F59E0B' },
                { label: 'Customer Satisfaction', value: '4.8/5', color: '#22C55E' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl text-center" style={{ backgroundColor: s.color + '10' }}>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ProfileView = () => (
    <div className="space-y-6">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1A1A2E' }}>My Profile</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F0FDF4' }}>
              <Package className="w-12 h-12" style={{ color: '#00B894' }} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1A1A2E' }}>Priya Sharma</h3>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Pharm.D, Senior Pharmacist</p>
            <div className="mt-3 flex justify-center">
              <span className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: '#F0FDF4', color: '#22C55E' }}>✓ Certified Pharmacist</span>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2"><CardTitle style={{ fontSize: '1rem', fontWeight: 600 }}>Professional Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Full Name', value: 'Priya Sharma' },
                { label: 'License Number', value: 'PCI-KA-2018-56789' },
                { label: 'Pharmacy', value: 'MedPlus Pharmacy, Koramangala' },
                { label: 'Experience', value: '8 years' },
                { label: 'Specialization', value: 'Clinical Pharmacy' },
                { label: 'Contact', value: '+91 87654 32109' },
                { label: 'Email', value: 'priya@medplus.com' },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>{f.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A1A2E' }}>{f.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const views: Record<PharmView, React.ReactNode> = {
    dashboard: <DashboardView />,
    incoming: <IncomingView />,
    verified: <VerifiedView />,
    inventory: <InventoryView />,
    orders: <OrdersView />,
    customers: <CustomersView />,
    notifications: <NotificationsView />,
    reports: <ReportsView />,
    profile: <ProfileView />,
  };

  return (
    <PortalLayout
      title="Pharmacist Portal"
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
    </PortalLayout>
  );
}