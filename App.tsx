
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBasket, 
  CalendarDays, 
  Plus, 
  Trash2, 
  ChevronRight, 
  TrendingUp, 
  BrainCircuit, 
  FileText, 
  X, 
  Printer, 
  Edit2, 
  Save, 
  Calendar, 
  ChevronLeft,
  Menu as MenuIcon,
  Download,
  CheckCircle2,
  Table as TableIcon,
  Cloud,
  Settings,
  RefreshCw,
  AlertCircle,
  Tag,
  Lock,
  CalendarRange
} from 'lucide-react';
import { Product, Client, Order, DayOfWeek, OrderItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, DAYS } from './constants';
import { parseOrderWithAI, getProductionInsights } from './services/geminiService';
import { syncToSheets } from './services/sheetsService';

// Utility to get YYYY-MM-DD
const formatDateToISO = (date: Date) => date.toISOString().split('T')[0];
const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
};

// Get the start and end of the week for a given date
const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { 
    start: formatDateToISO(monday), 
    end: formatDateToISO(sunday) 
  };
};

// CSV Export Utility
const downloadCSV = (filename: string, rows: string[][]) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'production' | 'config'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('bakery_products_v2');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('bakery_clients_v2');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('bakery_orders_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [sheetsUrl, setSheetsUrl] = useState(() => localStorage.getItem('bakery_sheets_url') || '');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error' | 'idle'>(sheetsUrl ? 'idle' : 'pending');
  const [isSyncing, setIsSyncing] = useState(false);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [lastSyncedOrder, setLastSyncedOrder] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('bakery_orders_v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('bakery_products_v2', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('bakery_clients_v2', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('bakery_sheets_url', sheetsUrl);
  }, [sheetsUrl]);

  // Sync Logic
  const triggerSheetsSync = useCallback(async (currentOrders: Order[]) => {
    if (!sheetsUrl) {
      setSyncStatus('pending');
      return;
    }
    setIsSyncing(true);
    const result = await syncToSheets(sheetsUrl, currentOrders, products, clients);
    if (result.success) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
    setIsSyncing(false);
  }, [sheetsUrl, products, clients]);

  // Initial sync on load if URL exists
  useEffect(() => {
    if (sheetsUrl && orders.length > 0) {
      triggerSheetsSync(orders);
    }
  }, []);

  const addOrder = (order: Order) => {
    const newOrders = [...orders, order];
    setOrders(newOrders);
    setLastSyncedOrder(order.id);
    triggerSheetsSync(newOrders);
    setTimeout(() => setLastSyncedOrder(null), 3000);
  };

  const updateOrder = (updatedOrder: Order) => {
    const newOrders = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(newOrders);
    triggerSheetsSync(newOrders);
  };

  const deleteOrder = (id: string) => {
    const newOrders = orders.filter(o => o.id !== id);
    setOrders(newOrders);
    triggerSheetsSync(newOrders);
    if (selectedOrderId === id) setSelectedOrderId(null);
  };

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId), 
    [orders, selectedOrderId]
  );

  const handleNavClick = (tab: 'dashboard' | 'clients' | 'production' | 'config') => {
    if (tab === 'config' && !isAuthorized) {
      setIsPinModalOpen(true);
      setIsMobileMenuOpen(false);
      return;
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '0300') {
      setIsAuthorized(true);
      setActiveTab('config');
      setIsPinModalOpen(false);
      setPinInput('');
    } else {
      alert('Código incorrecto');
      setPinInput('');
    }
  };

  return (
    <div className="flex min-h-screen bg-emerald-50/30 relative">
      {/* Toast Sync notification */}
      {lastSyncedOrder && (
        <div className="fixed top-20 right-4 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
          <CheckCircle2 size={20} />
          <div className="text-sm font-bold">Pedido Guardado y Sincronizado</div>
        </div>
      )}

      {/* PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-emerald-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Lock size={20} className="text-lime-400" />
                <h3 className="font-bold">Acceso Restringido</h3>
              </div>
              <button onClick={() => setIsPinModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handlePinSubmit} className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-emerald-600 font-medium">Ingresa el código de maestro para acceder a la configuración.</p>
              </div>
              <input 
                type="password"
                maxLength={4}
                autoFocus
                className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl py-4 text-center text-3xl font-bold tracking-[1em] text-emerald-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                Verificar Código
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-emerald-50 shadow-2xl transition-transform duration-300 ease-in-out transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:w-60
      `}>
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBasket className="w-7 h-7 text-lime-400" />
            <h1 className="text-lg font-bold tracking-tight">Silvestre Pro</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 hover:bg-emerald-900 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <nav className="mt-4 px-3 space-y-1">
          <SidebarItem 
            icon={<LayoutDashboard size={18} />} 
            label="Panel General" 
            active={activeTab === 'dashboard'} 
            onClick={() => handleNavClick('dashboard')} 
          />
          <SidebarItem 
            icon={<Users size={18} />} 
            label="Clientes" 
            active={activeTab === 'clients'} 
            onClick={() => handleNavClick('clients')} 
          />
          <SidebarItem 
            icon={<CalendarDays size={18} />} 
            label="Producción" 
            active={activeTab === 'production'} 
            onClick={() => handleNavClick('production')} 
          />
          <SidebarItem 
            icon={<Settings size={18} />} 
            label="Configuración" 
            active={activeTab === 'config'} 
            onClick={() => handleNavClick('config')} 
          />
        </nav>
        
        <div className="absolute bottom-6 left-0 w-full px-4">
          <div className="p-4 bg-emerald-900/40 rounded-2xl border border-emerald-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-emerald-300 uppercase font-bold tracking-widest">Estado Online</p>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-emerald-400 hover:text-white transition-colors"
              >
                <Settings size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                syncStatus === 'synced' ? 'bg-lime-400' : 
                syncStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              } ${isSyncing ? 'animate-pulse' : ''}`} />
              <p className="text-xs text-emerald-100 font-medium">
                {isSyncing ? 'Sincronizando...' : 
                 syncStatus === 'synced' ? 'Sheets Conectado' : 
                 syncStatus === 'error' ? 'Error de Conexión' : 'Sync Pendiente'}
              </p>
            </div>
            
            <button 
              onClick={() => triggerSheetsSync(orders)}
              className="w-full flex items-center justify-center gap-2 py-1.5 bg-emerald-800/50 hover:bg-emerald-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
              Sincronizar ahora
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60 transition-all duration-300">
        {/* Mobile Header */}
        <header className="lg:hidden bg-emerald-950 text-white p-4 flex items-center justify-between sticky top-0 z-20 shadow-lg">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="w-6 h-6 text-lime-400" />
            <span className="font-bold">Silvestre Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-lime-400' : 'bg-yellow-500'}`} />
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-emerald-900 rounded-lg">
              <MenuIcon size={24} />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-8 flex-1">
          {activeTab === 'dashboard' && (
            <Dashboard 
              clients={clients} 
              products={products} 
              orders={orders} 
              onAddOrder={addOrder}
              onDeleteOrder={deleteOrder}
              onSelectOrder={setSelectedOrderId}
              syncStatus={syncStatus}
            />
          )}
          {activeTab === 'clients' && (
            <ClientList 
              clients={clients} 
              orders={orders} 
              products={products} 
              onSelectOrder={setSelectedOrderId}
            />
          )}
          {activeTab === 'production' && (
            <ProductionPlan 
              orders={orders}
              products={products} 
              clients={clients}
              onGetInsights={async (data) => {
                setIsAiLoading(true);
                const insight = await getProductionInsights(data);
                setAiInsight(insight || null);
                setIsAiLoading(false);
              }}
              aiInsight={aiInsight}
              isAiLoading={isAiLoading}
              onSelectOrder={setSelectedOrderId}
            />
          )}
          {activeTab === 'config' && (
            <ConfigSection 
              products={products}
              clients={clients}
              onSetProducts={setProducts}
              onSetClients={setClients}
              onLogout={() => {
                setIsAuthorized(false);
                setActiveTab('dashboard');
              }}
            />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-emerald-900">Conexión con Sheets</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  Para que funcione, debes publicar un Google Apps Script como "Web App" y pegar la URL aquí. Los pedidos se actualizarán automáticamente.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 ml-1">Webhook URL (Apps Script)</label>
                <div className="relative">
                  <Cloud className="absolute left-3 top-3.5 text-emerald-400" size={18} />
                  <input 
                    type="text"
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  triggerSheetsSync(orders);
                  setIsSettingsOpen(false);
                }}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                Guardar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          client={clients.find(c => c.id === selectedOrder.clientId)!}
          products={products}
          clients={clients}
          onClose={() => setSelectedOrderId(null)}
          onDelete={() => deleteOrder(selectedOrder.id)}
          onUpdate={updateOrder}
        />
      )}
    </div>
  );
};

const SidebarItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-emerald-100 text-emerald-900 font-bold shadow-md' 
        : 'text-emerald-200 hover:bg-emerald-900/60 hover:text-white'
    }`}
  >
    <span className={`${active ? 'text-emerald-700' : 'text-emerald-400'}`}>{icon}</span>
    <span className="text-sm">{label}</span>
  </button>
);

const OrderDetailModal: React.FC<{
  order: Order;
  client: Client;
  products: Product[];
  clients: Client[];
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (o: Order) => void;
}> = ({ order, client, products, clients, onClose, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-emerald-950 p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{isEditing ? 'Editar Pedido' : 'Detalle del Pedido'}</h3>
            <p className="text-emerald-400 text-xs opacity-80">ID: {order.id.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-900 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {!isEditing ? (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-emerald-50">
                <div>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Cliente</p>
                  <h4 className="text-xl font-bold text-emerald-900">{client.name}</h4>
                  <p className="text-sm text-emerald-600">{client.address || 'Sin dirección registrada'}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Entrega</p>
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold text-xs inline-flex items-center gap-1">
                    <Calendar size={12} /> {order.date} ({order.day})
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Productos</p>
                <div className="bg-emerald-50/50 rounded-xl p-4 space-y-2 border border-emerald-100">
                  {order.items.map((item, idx) => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-emerald-100 last:border-0">
                        <span className="font-medium text-emerald-900 text-sm">{product?.name}</span>
                        <div className="font-bold text-emerald-950 text-sm">
                          {item.quantity} <span className="text-[10px] font-normal text-emerald-500 uppercase">{product?.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button 
                  onClick={() => {
                    const header = ["Producto", "Cantidad", "Unidad"];
                    const rows = order.items.map(it => {
                      const p = products.find(prod => prod.id === it.productId);
                      return [p?.name || '', it.quantity.toString(), p?.unit || ''];
                    });
                    downloadCSV(`pedido_${client.name}_${order.date}.csv`, [header, ...rows]);
                  }} 
                  className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm border border-emerald-200"
                >
                  <Download size={16} /> Descargar CSV
                </button>
                <button 
                  onClick={() => {
                    if(confirm('¿Estás seguro de eliminar este pedido?')) {
                      onDelete();
                      onClose();
                    }
                  }}
                  className="px-5 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100 flex items-center justify-center"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <OrderForm 
                clients={clients} 
                products={products} 
                initialOrder={order}
                onSubmit={(o) => {
                  onUpdate(o);
                  setIsEditing(false);
                }} 
              />
              <button 
                onClick={() => setIsEditing(false)}
                className="w-full mt-4 text-emerald-400 hover:text-emerald-600 text-sm font-medium py-2 transition-colors"
              >
                Volver sin guardar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ 
  clients: Client[]; 
  products: Product[]; 
  orders: Order[];
  onAddOrder: (o: Order) => void;
  onDeleteOrder: (id: string) => void;
  onSelectOrder: (id: string) => void;
  syncStatus: string;
}> = ({ clients, products, orders, onAddOrder, onDeleteOrder, onSelectOrder, syncStatus }) => {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-emerald-900 tracking-tight">Panel General</h2>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-sm text-emerald-600">Gestión de pedidos.</p>
             {syncStatus === 'synced' && (
               <span className="flex items-center gap-1 text-[10px] font-bold text-lime-700 uppercase bg-lime-50 px-2 py-0.5 rounded-full border border-lime-200 animate-in fade-in zoom-in">
                 <Cloud size={10} /> Online
               </span>
             )}
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all font-bold"
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cerrar' : 'Nuevo Pedido'}
        </button>
      </div>

      {showForm && (
        <div className="mb-10 animate-in slide-in-from-top duration-300">
          <OrderForm 
            clients={clients} 
            products={products} 
            onSubmit={(o) => {
              onAddOrder(o);
              setShowForm(false);
            }} 
          />
        </div>
      )}

      <div className="grid gap-4">
        <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2 px-1">
          <FileText className="text-emerald-500" size={20} /> Pedidos Recientes
        </h3>
        {orders.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-12 text-center">
            <ShoppingBasket className="mx-auto text-emerald-200 mb-4" size={48} />
            <p className="text-emerald-400 font-medium italic">No hay pedidos registrados aún.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {[...orders].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10).map(order => (
              <div 
                key={order.id} 
                onClick={() => onSelectOrder(order.id)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 flex justify-between items-center group cursor-pointer hover:border-emerald-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="bg-emerald-50 text-emerald-700 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-[10px] transition-colors group-hover:bg-emerald-600 group-hover:text-white shrink-0">
                    <span className="uppercase">{order.day.slice(0,3)}</span>
                    <span className="text-xs">{order.date.split('-')[2]}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm sm:text-base leading-tight">
                      {clients.find(c => c.id === order.clientId)?.name}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-emerald-500 font-medium">
                      {order.items.length} prod. • {order.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={18} className="text-emerald-300 group-hover:text-emerald-600 transform transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const OrderForm: React.FC<{ 
  clients: Client[]; 
  products: Product[]; 
  onSubmit: (o: Order) => void;
  initialOrder?: Order;
}> = ({ clients, products, onSubmit, initialOrder }) => {
  const [clientId, setClientId] = useState(initialOrder?.clientId || '');
  const [date, setDate] = useState(initialOrder?.date || formatDateToISO(new Date()));
  const [items, setItems] = useState<OrderItem[]>(initialOrder?.items || [{ productId: '', quantity: 1 }]);
  const [aiInput, setAiInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);

  const handleAiParse = async () => {
    if (!aiInput.trim()) return;
    setIsAiParsing(true);
    const result = await parseOrderWithAI(aiInput, products);
    if (result && result.length > 0) {
      setItems(result);
    }
    setIsAiParsing(false);
  };

  const addItem = () => setItems([...items, { productId: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return alert('Selecciona un cliente');
    if (items.some(i => !i.productId)) return alert('Selecciona los productos');
    
    const dayName = getDayName(date);
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1) as DayOfWeek;

    onSubmit({
      id: initialOrder?.id || Math.random().toString(36).substr(2, 9),
      clientId,
      date,
      day: capitalizedDay,
      items
    });
  };

  return (
    <div className={`bg-white rounded-2xl ${initialOrder ? '' : 'shadow-xl p-5 sm:p-8 border border-emerald-100'}`}>
      {!initialOrder && (
        <div className="mb-6 pb-6 border-b border-emerald-50">
          <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
            <BrainCircuit className="text-lime-600" size={18} /> Carga Inteligente (IA)
          </h3>
          <div className="flex flex-col gap-2">
            <textarea 
              className="w-full border border-emerald-100 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none bg-emerald-50/20"
              placeholder="Ej: Hola! para mañana mandame 10 mignon, 2 docenas medialunas y 5 pan integral..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <button 
              type="button"
              onClick={handleAiParse}
              disabled={isAiParsing}
              className="w-full bg-teal-600 text-white py-2.5 rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs font-bold shadow-md shadow-teal-100"
            >
              <BrainCircuit size={16} />
              {isAiParsing ? 'Procesando pedido...' : 'Cargar texto de WhatsApp'}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 ml-1">Cliente</label>
            <select 
              className="w-full border border-emerald-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30 appearance-none"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 ml-1">Fecha</label>
            <input 
              type="date"
              className="w-full border border-emerald-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 ml-1">Productos</label>
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2">
                <div className="flex-1 min-w-0">
                  <select 
                    className="w-full border border-emerald-100 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30"
                    value={item.productId}
                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                  >
                    <option value="">Producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                </div>
                <div className="w-20 sm:w-24">
                  <input 
                    type="number" 
                    min="0.1"
                    step="any"
                    className="w-full border border-emerald-100 rounded-xl p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/30 text-center font-bold text-emerald-900"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeItem(idx)}
                  className="p-2 text-emerald-200 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <button 
            type="button"
            onClick={addItem}
            className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 mt-2 transition-colors ml-1"
          >
            <Plus size={14} /> Agregar otro producto
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-emerald-50">
          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 group"
          >
            {initialOrder ? <Save size={20} /> : <CheckCircle2 size={20} className="group-active:scale-90 transition-transform" />}
            {initialOrder ? 'Guardar Cambios' : 'Confirmar y Sincronizar'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ClientList: React.FC<{ 
  clients: Client[]; 
  orders: Order[];
  products: Product[];
  onSelectOrder: (id: string) => void;
}> = ({ clients, orders, products, onSelectOrder }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl lg:text-3xl font-bold text-emerald-950 mb-6 tracking-tight">Base de Clientes</h2>
      <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
        {clients.map(client => {
          const clientOrders = orders
            .filter(o => o.clientId === client.id)
            .sort((a,b) => b.date.localeCompare(a.date));

          return (
            <div key={client.id} className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-emerald-50">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-bold text-lg">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 leading-tight">{client.name}</h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{clientOrders.length} pedidos</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-2">Pedidos Recientes</h4>
                <div className="grid gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                  {clientOrders.slice(0, 5).map(order => (
                    <button 
                      key={order.id} 
                      onClick={() => onSelectOrder(order.id)}
                      className="flex justify-between items-center text-xs py-2 px-3 rounded-xl hover:bg-emerald-50 group transition-colors text-left border border-emerald-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-700">{order.date}</span>
                        <span className="text-[9px] text-emerald-400 uppercase font-medium">{order.day}</span>
                      </div>
                      <ChevronRight size={14} className="text-emerald-300 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                  {clientOrders.length === 0 && <p className="text-xs text-emerald-200 italic text-center py-4">Sin actividad registrada.</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProductionPlan: React.FC<{ 
  orders: Order[]; 
  products: Product[];
  clients: Client[];
  onGetInsights: (data: string) => void;
  aiInsight: string | null;
  isAiLoading: boolean;
  onSelectOrder: (id: string) => void;
}> = ({ orders, products, clients, onGetInsights, aiInsight, isAiLoading, onSelectOrder }) => {
  const [selectedDate, setSelectedDate] = useState(formatDateToISO(new Date()));

  const filteredOrders = useMemo(() => orders.filter(o => o.date === selectedDate), [orders, selectedDate]);
  
  const dailySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        summary[item.productId] = (summary[item.productId] || 0) + item.quantity;
      });
    });
    return summary;
  }, [filteredOrders]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateToISO(d));
  };

  const exportDailyToCSV = () => {
    if (Object.keys(dailySummary).length === 0) return;
    const header = ["Producto", "Total", "Unidad", "Fecha"];
    const rows = Object.entries(dailySummary).map(([pid, qty]) => {
      const p = products.find(prod => prod.id === pid);
      return [p?.name || '', qty.toString(), p?.unit || '', selectedDate];
    });
    downloadCSV(`produccion_diaria_${selectedDate}.csv`, [header, ...rows]);
  };

  const exportWeeklyToCSV = () => {
    const { start, end } = getWeekRange(selectedDate);
    const weeklyOrders = orders.filter(o => o.date >= start && o.date <= end);
    if (weeklyOrders.length === 0) return alert('No hay pedidos en esta semana');

    const weeklySummary: Record<string, number> = {};
    weeklyOrders.forEach(o => {
      o.items.forEach(item => {
        weeklySummary[item.productId] = (weeklySummary[item.productId] || 0) + item.quantity;
      });
    });

    const header = ["Producto", "Total Semanal", "Unidad", "Desde", "Hasta"];
    const rows = Object.entries(weeklySummary).map(([pid, qty]) => {
      const p = products.find(prod => prod.id === pid);
      return [p?.name || '', qty.toString(), p?.unit || '', start, end];
    });
    downloadCSV(`produccion_semanal_${start}_${end}.csv`, [header, ...rows]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-emerald-950 tracking-tight">Plan de Producción</h2>
          <p className="text-sm text-emerald-600">Total de mercadería por fecha.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={exportDailyToCSV}
            disabled={filteredOrders.length === 0}
            className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs font-bold border border-emerald-200"
          >
            <Download size={16} />
            CSV Diario
          </button>
          <button 
            onClick={exportWeeklyToCSV}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all text-xs font-bold"
          >
            <CalendarRange size={16} />
            CSV Semanal
          </button>
          <button 
            onClick={() => onGetInsights(JSON.stringify(dailySummary))}
            disabled={isAiLoading || filteredOrders.length === 0}
            className="flex-1 sm:flex-none bg-lime-600 hover:bg-lime-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-lime-100 transition-all disabled:opacity-50 text-xs font-bold"
          >
            <BrainCircuit size={16} />
            {isAiLoading ? 'Analizando...' : 'Análisis IA'}
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between mb-8 overflow-hidden">
        <button onClick={() => changeDate(-1)} className="p-3 hover:bg-emerald-50 rounded-xl text-emerald-300 hover:text-emerald-600 transition-colors"><ChevronLeft size={24}/></button>
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2 text-emerald-900 bg-emerald-50 px-4 py-1.5 rounded-xl font-bold text-base sm:text-lg uppercase tracking-tight border border-emerald-200 shrink-0">
            <Calendar size={18} className="text-emerald-500" />
            {getDayName(selectedDate)} {selectedDate.split('-')[2]}/{selectedDate.split('-')[1]}
          </div>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-[10px] text-emerald-300 font-bold bg-transparent outline-none cursor-pointer hover:text-emerald-600 mt-1 uppercase tracking-widest"
          />
        </div>
        <button onClick={() => changeDate(1)} className="p-3 hover:bg-emerald-50 rounded-xl text-emerald-300 hover:text-emerald-600 transition-colors"><ChevronRight size={24}/></button>
      </div>

      {aiInsight && (
        <div className="mb-8 bg-lime-50 border border-lime-100 p-5 rounded-2xl animate-in zoom-in-95 duration-300 relative">
          <button onClick={() => onGetInsights('')} className="absolute top-4 right-4 text-lime-300 hover:text-lime-600"><X size={16} /></button>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-lime-700" size={18} />
            <h4 className="font-bold text-lime-900 text-sm">Sugerencias del Maestro</h4>
          </div>
          <p className="text-lime-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed italic">{aiInsight}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-emerald-50 bg-emerald-50/30 flex justify-between items-center">
              <h3 className="font-bold text-emerald-500 uppercase tracking-wider text-[10px]">Mercadería Consolidada (Día)</h3>
              <span className="text-[10px] font-bold text-emerald-400">{filteredOrders.length} pedidos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-emerald-50">
                  {Object.entries(dailySummary).length === 0 ? (
                    <tr>
                      <td className="px-6 py-12 text-center text-emerald-200 italic text-sm">Sin producción programada.</td>
                    </tr>
                  ) : (
                    Object.entries(dailySummary).map(([productId, quantity]) => {
                      const product = products.find(p => p.id === productId);
                      return (
                        <tr key={productId} className="hover:bg-emerald-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-emerald-800 text-sm">{product?.name}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono font-bold text-emerald-600 text-lg">{quantity}</span>
                            <span className="ml-2 text-[10px] text-emerald-400 uppercase font-medium">{product?.unit}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-emerald-50 bg-emerald-50/30">
              <h3 className="font-bold text-emerald-500 uppercase tracking-wider text-[10px]">Detalle por Cliente</h3>
            </div>
            <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto scrollbar-hide flex-1">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-emerald-100">
                  <ShoppingBasket size={32} />
                  <p className="text-xs mt-2 italic">Sin pedidos</p>
                </div>
              ) : (
                filteredOrders.map(o => (
                  <button 
                    key={o.id}
                    onClick={() => onSelectOrder(o.id)}
                    className="w-full text-left p-3.5 rounded-xl border border-emerald-50 hover:border-emerald-200 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-emerald-800 text-sm leading-tight">{clients.find(c => c.id === o.clientId)?.name}</span>
                      <ChevronRight size={14} className="text-emerald-300 group-hover:text-emerald-500 shrink-0 ml-1" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {o.items.slice(0, 4).map((it, idx) => (
                        <span key={idx} className="text-[9px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 font-medium">
                          {products.find(p => p.id === it.productId)?.name.split(' ')[0]}..
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfigSection: React.FC<{
  products: Product[];
  clients: Client[];
  onSetProducts: (p: Product[]) => void;
  onSetClients: (c: Client[]) => void;
  onLogout: () => void;
}> = ({ products, clients, onSetProducts, onSetClients, onLogout }) => {
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState<'unidades' | 'kg'>('unidades');
  const [newClientName, setNewClientName] = useState('');

  const addProduct = () => {
    if (!newProductName.trim()) return;
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProductName,
      category: 'General',
      unit: newProductUnit
    };
    onSetProducts([...products, newProduct]);
    setNewProductName('');
  };

  const addClient = () => {
    if (!newClientName.trim()) return;
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClientName,
    };
    onSetClients([...clients, newClient]);
    setNewClientName('');
  };

  const removeProduct = (id: string) => {
    if(confirm('¿Seguro quieres eliminar este producto?')) {
      onSetProducts(products.filter(p => p.id !== id));
    }
  };

  const removeClient = (id: string) => {
    if(confirm('¿Seguro quieres eliminar este cliente?')) {
      onSetClients(clients.filter(c => c.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-emerald-950 mb-2 tracking-tight">Configuración del Maestro</h2>
          <p className="text-sm text-emerald-600">Administra tus productos y base de clientes.</p>
        </div>
        <button 
          onClick={onLogout}
          className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-200 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Products Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-50 overflow-hidden flex flex-col">
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
            <Tag className="text-emerald-500" size={20} />
            <h3 className="font-bold text-emerald-700">Productos</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Nombre del producto..."
                className="w-full border border-emerald-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <div className="flex gap-2">
                <select 
                  className="flex-1 border border-emerald-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50 text-emerald-900"
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value as 'unidades' | 'kg')}
                >
                  <option value="unidades">Unidades</option>
                  <option value="kg">Kg</option>
                </select>
                <button 
                  onClick={addProduct}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {products.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-emerald-50 bg-emerald-50/30 group hover:border-emerald-200 transition-all">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-emerald-900">{p.name}</span>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">{p.unit}</span>
                  </div>
                  <button 
                    onClick={() => removeProduct(p.id)}
                    className="p-2 text-emerald-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clients Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-50 overflow-hidden flex flex-col">
          <div className="p-6 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
            <Users className="text-emerald-500" size={20} />
            <h3 className="font-bold text-emerald-700">Clientes</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nombre del cliente..."
                className="flex-1 border border-emerald-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/50"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button 
                onClick={addClient}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg shadow-emerald-100"
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {clients.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 rounded-xl border border-emerald-50 bg-emerald-50/30 group hover:border-emerald-200 transition-all">
                  <span className="text-sm font-bold text-emerald-900">{c.name}</span>
                  <button 
                    onClick={() => removeClient(c.id)}
                    className="p-2 text-emerald-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
