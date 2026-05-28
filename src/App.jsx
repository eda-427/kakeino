import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List as ListIcon, PieChart, Settings, X, Trash2, ArrowDownCircle, ArrowUpCircle, Download, Database, Copy, Check, Folder, ChevronDown, ChevronUp } from 'lucide-react';

// --- 初期データ ---
const INITIAL_CATEGORIES = [
  { id: 'inc-1', name: '給料', type: 'income', color: 'bg-blue-500' },
  { id: 'inc-2', name: 'お小遣い', type: 'income', color: 'bg-teal-500' },
  { id: 'inc-3', name: 'その他収入', type: 'income', color: 'bg-gray-500' },
  { id: 'exp-1', name: '食費', type: 'expense', color: 'bg-orange-500' },
  { id: 'exp-2', name: '交通費', type: 'expense', color: 'bg-cyan-500' },
  { id: 'exp-3', name: '日用品', type: 'expense', color: 'bg-yellow-500' },
  { id: 'exp-4', name: '交際費', type: 'expense', color: 'bg-pink-500' },
  { id: 'exp-5', name: '趣味', type: 'expense', color: 'bg-purple-500' },
  { id: 'exp-6', name: 'その他支出', type: 'expense', color: 'bg-gray-500' },
];

const COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'];

// --- ユーティリティ ---
const getLocalYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
};

// --- メインアプリケーション ---
export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list' | 'report' | 'events'
  
  // LocalStorageから初期データを読み込む
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('kakeibo_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('kakeibo_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch (e) {
      return INITIAL_CATEGORIES;
    }
  });

  // まとめ(イベント)データ
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('kakeibo_events');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  
  // 新規イベント入力用
  const [newEventName, setNewEventName] = useState('');
  // イベントの開閉状態を管理
  const [expandedEvents, setExpandedEvents] = useState({});

  // PWAインストールのためのステート
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // --- データの永続化 (LocalStorage) ---
  useEffect(() => {
    localStorage.setItem('kakeibo_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('kakeibo_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('kakeibo_events', JSON.stringify(events));
  }, [events]);

  // --- PWA対応設定 ---
  useEffect(() => {
    const manifest = {
      name: "シンプル家計簿",
      short_name: "家計簿",
      start_url: ".",
      display: "standalone",
      background_color: "#f9fafb",
      theme_color: "#ffffff",
      icons: [
        {
          src: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%232563eb' rx='100'/%3E%3Cpath fill='white' d='M396.6 160H115.4c-19.5 0-35.4 15.9-35.4 35.4v120.8c0 19.5 15.9 35.4 35.4 35.4h281.2c19.5 0 35.4-15.9 35.4-35.4V195.4c0-19.5-15.9-35.4-35.4-35.4zM256 320c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z'/%3E%3C/svg%3E",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);
    
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestUrl;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // --- データ計算 ---
  const currentMonthTx = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === currentDate.getFullYear() &&
             txDate.getMonth() === currentDate.getMonth();
    });
  }, [transactions, currentDate]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    currentMonthTx.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') expense += tx.amount;
    });
    return { income, expense, total: income - expense };
  }, [currentMonthTx]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  // --- ハンドラー ---
  const handleAddNewClick = () => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  };

  const handleEditClick = (tx) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (txData) => {
    if (editingTx) {
      setTransactions(prev => prev.map(tx => tx.id === editingTx.id ? { ...txData, id: tx.id } : tx));
    } else {
      setTransactions(prev => [...prev, { ...txData, id: Date.now().toString() }]);
    }
    setIsTxModalOpen(false);
    setEditingTx(null);
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('この記録を削除してもよろしいですか？')) {
      setTransactions(prev => prev.filter(tx => tx.id !== id));
    }
  };

  const handleAddCategory = (newCat) => {
    setCategories(prev => [...prev, { ...newCat, id: `cat-${Date.now()}`, color: COLORS[Math.floor(Math.random() * COLORS.length)] }]);
  };

  const handleDeleteCategory = (id) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  // まとめのハンドラー
  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    const newEvtId = `evt-${Date.now()}`;
    setEvents(prev => [...prev, { id: newEvtId, name: newEventName.trim() }]);
    setNewEventName('');
    // 追加したばかりのまとめは自動で開いておく
    setExpandedEvents(prev => ({ ...prev, [newEvtId]: true }));
  };

  const handleDeleteEvent = (id) => {
    if (window.confirm('このまとめを削除しますか？\n（※中に入っている記録のデータ自体は消えません）')) {
      setEvents(prev => prev.filter(evt => evt.id !== id));
      setTransactions(prev => prev.map(tx => tx.eventId === id ? { ...tx, eventId: '' } : tx));
    }
  };

  const toggleEventExpansion = (id) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 引継ぎデータを反映するハンドラー
  const handleImportData = (importedTransactions, importedCategories, importedEvents) => {
    setTransactions(importedTransactions);
    setCategories(importedCategories);
    setEvents(importedEvents || []);
  };

  // --- コンポーネント: カレンダービュー ---
  const renderCalendar = () => {
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-white">
          {calendarDays.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="border-b border-r border-gray-50 p-1"></div>;
            
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTxs = currentMonthTx.filter(tx => tx.date === dateStr);
            
            let inc = 0, exp = 0;
            dayTxs.forEach(tx => {
              if(tx.type === 'income') inc += tx.amount;
              else exp += tx.amount;
            });

            const isSelected = dateStr === getLocalYMD(selectedDate);
            const isToday = dateStr === getLocalYMD(new Date());

            return (
              <div 
                key={day}
                onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                className={`flex flex-col h-16 sm:h-20 border-b border-r border-gray-50 p-1 cursor-pointer active:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-400' : ''}`}
              >
                <div className="flex justify-center mb-0.5">
                  <span className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {day}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden space-y-[1px] px-0.5">
                  {inc > 0 && <div className="text-[9px] text-blue-600 font-medium truncate leading-tight">+{inc.toLocaleString()}</div>}
                  {exp > 0 && <div className="text-[9px] text-red-500 font-medium truncate leading-tight">-{exp.toLocaleString()}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- コンポーネント: 選択日の履歴（カレンダー下部） ---
  const renderDayTransactions = () => {
    const dateStr = getLocalYMD(selectedDate);
    const dayTxs = currentMonthTx.filter(tx => tx.date === dateStr);

    return (
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center justify-between">
          <span>{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日の記録</span>
          <span className="text-xs font-normal text-gray-500">{dayTxs.length}件</span>
        </h3>
        
        {dayTxs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">この日の記録はありません</p>
        ) : (
          <div className="space-y-3">
            {dayTxs.map(tx => {
              const category = categories.find(c => c.id === tx.categoryId);
              const event = events.find(e => e.id === tx.eventId);
              return (
                <div 
                  key={tx.id} 
                  onClick={() => handleEditClick(tx)}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${category?.color || 'bg-gray-200'} text-white`}>
                      {tx.type === 'income' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{category ? category.name : '不明'}</div>
                      <div className="flex items-center flex-wrap">
                        {event && <span className="inline-block text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded mt-0.5 mr-1.5"><Folder size={10} className="inline mr-0.5 mb-0.5" />{event.name}</span>}
                        {tx.memo && <span className="text-xs text-gray-500 mt-0.5">{tx.memo}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-semibold ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-800'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }} 
                      className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- コンポーネント: 月の全履歴リスト ---
  const renderList = () => {
    const sortedTxs = [...currentMonthTx].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {sortedTxs.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3 text-gray-400">
              <ListIcon size={24} />
            </div>
            <p className="text-gray-500 text-sm">今月の記録はまだありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTxs.map(tx => {
              const category = categories.find(c => c.id === tx.categoryId);
              const event = events.find(e => e.id === tx.eventId);
              const txDate = new Date(tx.date);
              return (
                <div 
                  key={tx.id} 
                  onClick={() => handleEditClick(tx)}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group border-b border-gray-50 pb-3 last:border-0 last:pb-2 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col items-center justify-center w-10 text-center">
                      <span className="text-[10px] text-gray-400 font-medium leading-none">{txDate.getMonth() + 1}月</span>
                      <span className="text-lg font-bold text-gray-700 leading-none mt-0.5">{txDate.getDate()}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${category?.color || 'bg-gray-200'} text-white shadow-sm`}>
                      {tx.type === 'income' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{category ? category.name : '不明'}</div>
                      <div className="flex items-center flex-wrap">
                        {event && <span className="inline-block text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded mt-0.5 mr-1.5"><Folder size={10} className="inline mr-0.5 mb-0.5" />{event.name}</span>}
                        {tx.memo && <span className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{tx.memo}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-800'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }} 
                      className="text-gray-300 hover:text-red-500 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // --- コンポーネント: ジャンル別内訳 ---
  const renderReport = () => {
    const expenseTotals = categories.filter(c => c.type === 'expense').map(c => {
      const amount = currentMonthTx.filter(tx => tx.categoryId === c.id).reduce((sum, tx) => sum + tx.amount, 0);
      return { ...c, amount };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const incomeTotals = categories.filter(c => c.type === 'income').map(c => {
      const amount = currentMonthTx.filter(tx => tx.categoryId === c.id).reduce((sum, tx) => sum + tx.amount, 0);
      return { ...c, amount };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
            <ArrowUpCircle size={16} className="text-red-500 mr-1.5" />
            支出の内訳
          </h3>
          {expenseTotals.length === 0 ? (
             <p className="text-center text-gray-400 text-sm py-4">今月の支出はありません</p>
          ) : (
            <div className="space-y-4">
              {expenseTotals.map(cat => {
                const percentage = summary.expense > 0 ? Math.round((cat.amount / summary.expense) * 100) : 0;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="text-xs text-gray-400">{percentage}%</span>
                      </div>
                      <span className="font-bold text-gray-800">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
            <ArrowDownCircle size={16} className="text-blue-600 mr-1.5" />
            収入の内訳
          </h3>
          {incomeTotals.length === 0 ? (
             <p className="text-center text-gray-400 text-sm py-4">今月の収入はありません</p>
          ) : (
            <div className="space-y-4">
              {incomeTotals.map(cat => {
                const percentage = summary.income > 0 ? Math.round((cat.amount / summary.income) * 100) : 0;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="text-xs text-gray-400">{percentage}%</span>
                      </div>
                      <span className="font-bold text-gray-800">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- コンポーネント: まとめ（イベント）表示 ---
  const renderEvents = () => {
    return (
      <div className="space-y-4">
        {/* 新規まとめ追加 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">新しいまとめ（旅行など）を作成</h3>
          <form onSubmit={handleAddEvent} className="flex space-x-2">
            <input 
              type="text" 
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              placeholder="例: 北海道旅行、12月の飲み会..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button type="submit" disabled={!newEventName.trim()} className="bg-gray-900 text-white px-4 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
              作成
            </button>
          </form>
        </div>

        {/* まとめ一覧 */}
        {events.length === 0 ? (
           <p className="text-center text-gray-400 text-sm py-6">まとめはまだありません</p>
        ) : (
          <div className="space-y-4">
            {/* 新しく作ったものが上に来るように逆順で表示 */}
            {[...events].reverse().map(evt => {
              const evTxs = transactions.filter(tx => tx.eventId === evt.id).sort((a, b) => new Date(b.date) - new Date(a.date));
              let inc = 0, exp = 0;
              evTxs.forEach(tx => {
                if(tx.type === 'income') inc += tx.amount;
                else exp += tx.amount;
              });

              // このイベントが開いているかどうか
              const isExpanded = expandedEvents[evt.id];

              return (
                <div key={evt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* ヘッダー部分（タップで開閉） */}
                  <div 
                    onClick={() => toggleEventExpansion(evt.id)}
                    className="p-4 bg-gray-50/80 flex items-center justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="font-bold text-gray-800 flex items-center">
                      <Folder size={18} className="mr-2 text-indigo-500" />
                      {evt.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); // 開閉が発動しないようにする
                          handleDeleteEvent(evt.id); 
                        }} 
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="このまとめを削除"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                  
                  {/* 中身（開いている時だけ表示） */}
                  {isExpanded && (
                    <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex space-x-4 mb-4 text-sm">
                        <div className="flex-1 bg-red-50 text-red-700 rounded-xl p-3 text-center border border-red-100">
                          <span className="block text-xs font-bold opacity-80 mb-0.5">総支出</span>
                          <span className="font-bold text-lg">{formatCurrency(exp)}</span>
                        </div>
                        <div className="flex-1 bg-blue-50 text-blue-700 rounded-xl p-3 text-center border border-blue-100">
                          <span className="block text-xs font-bold opacity-80 mb-0.5">総収入</span>
                          <span className="font-bold text-lg">{formatCurrency(inc)}</span>
                        </div>
                      </div>
                      
                      {evTxs.length === 0 ? (
                        <p className="text-xs text-center text-gray-400 py-2">まだ記録がありません</p>
                      ) : (
                        <div className="space-y-1.5 mt-2 border-t border-gray-100 pt-3">
                          {evTxs.map(tx => {
                            const category = categories.find(c => c.id === tx.categoryId);
                            const txDate = new Date(tx.date);
                            return (
                              <div key={tx.id} onClick={() => handleEditClick(tx)} className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                                <div className="flex items-center space-x-2.5">
                                  <span className="text-[10px] text-gray-400 font-medium w-8 text-center">{txDate.getMonth()+1}/{txDate.getDate()}</span>
                                  <div className={`w-2.5 h-2.5 rounded-full ${category?.color || 'bg-gray-200'}`}></div>
                                  <span className="text-gray-700 font-medium">{category ? category.name : '不明'}</span>
                                  {tx.memo && <span className="text-xs text-gray-400 line-clamp-1 max-w-[100px]">({tx.memo})</span>}
                                </div>
                                <span className={`font-bold ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-800'}`}>
                                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24 selection:bg-blue-100">
      
      {/* ヘッダー */}
      <header className="bg-white px-4 py-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h1>
        <div className="flex items-center">
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors mr-1"
              title="アプリとしてインストール"
            >
              <Download size={20} />
            </button>
          )}
          <button 
            onClick={() => setIsTransferModalOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-full transition-colors mr-1"
            title="データのお引越し"
          >
            <Database size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-5">
        
        {/* サマリーカード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 font-medium mb-1">今月の収支</p>
          <div className={`text-3xl font-bold tracking-tight mb-5 ${summary.total >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {summary.total >= 0 ? '+' : ''}{formatCurrency(summary.total)}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-50/50">
              <div className="flex items-center text-blue-600 mb-1">
                <ArrowDownCircle size={14} className="mr-1" />
                <span className="text-xs font-semibold">収入</span>
              </div>
              <div className="text-sm font-bold text-gray-800">{formatCurrency(summary.income)}</div>
            </div>
            <div className="bg-red-50/50 rounded-xl p-3 border border-red-50/50">
              <div className="flex items-center text-red-500 mb-1">
                <ArrowUpCircle size={14} className="mr-1" />
                <span className="text-xs font-semibold">支出</span>
              </div>
              <div className="text-sm font-bold text-gray-800">{formatCurrency(summary.expense)}</div>
            </div>
          </div>
        </div>

        {/* タブ切り替え & 設定ボタン */}
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-200/60 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon size={16} />
              <span>カレンダー</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ListIcon size={16} />
              <span>リスト</span>
            </button>
            <button 
              onClick={() => setViewMode('report')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${viewMode === 'report' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <PieChart size={16} />
              <span>内訳</span>
            </button>
            <button 
              onClick={() => setViewMode('events')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${viewMode === 'events' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Folder size={16} />
              <span>まとめ</span>
            </button>
          </div>
          <button 
            onClick={() => setIsCatModalOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-colors shrink-0 ml-2"
            title="ジャンル設定"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {viewMode === 'calendar' && (
            <>
              {renderCalendar()}
              {renderDayTransactions()}
            </>
          )}
          {viewMode === 'list' && renderList()}
          {viewMode === 'report' && renderReport()}
          {viewMode === 'events' && renderEvents()}
        </div>

        <AdBanner />

      </main>

      {/* フローティング追加ボタン */}
      <button 
        onClick={handleAddNewClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-2xl shadow-lg shadow-gray-400/30 flex items-center justify-center hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={28} />
      </button>

      {/* モーダル群 */}
      {isTxModalOpen && (
        <TransactionModal 
          onClose={() => setIsTxModalOpen(false)}
          onSubmit={handleSaveTransaction}
          categories={categories}
          events={events}
          initialDate={viewMode === 'calendar' ? selectedDate : new Date()}
          editingTx={editingTx}
        />
      )}

      {isCatModalOpen && (
        <CategoryModal 
          onClose={() => setIsCatModalOpen(false)}
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      )}

      {isTransferModalOpen && (
        <TransferModal 
          onClose={() => setIsTransferModalOpen(false)}
          transactions={transactions}
          categories={categories}
          events={events}
          onImport={handleImportData}
        />
      )}

    </div>
  );
}

// --- サブコンポーネント: 広告バナー ---
function AdBanner() {
  useEffect(() => {
    // try {
    //   (window.adsbygoogle = window.adsbygoogle || []).push({});
    // } catch (e) {
    //   console.error("AdSense error", e);
    // }
  }, []);

  return (
    <div className="mt-8 mb-4">
      <div className="w-full h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
        <span className="text-xs font-bold mb-1">スポンサーリンク</span>
        <span className="text-[10px]">公開後にここに広告が表示されます</span>
      </div>
    </div>
  );
}

// --- サブコンポーネント: データお引越し(バックアップ/復元)モーダル ---
function TransferModal({ onClose, transactions, categories, events, onImport }) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const exportDataStr = JSON.stringify({ transactions, categories, events });

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(exportDataStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      const textArea = document.getElementById('export-textarea');
      if(textArea) {
        textArea.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleImport = () => {
    if(!importText.trim()) return alert('データが入力されていません。');
    
    try {
      const parsed = JSON.parse(importText);
      if (parsed.transactions && Array.isArray(parsed.transactions) && parsed.categories && Array.isArray(parsed.categories)) {
        if (window.confirm('現在のデータはすべて消去され、入力したデータで上書きされます。本当によろしいですか？')) {
          onImport(parsed.transactions, parsed.categories, parsed.events || []);
          alert('データの復元が完了しました！');
          onClose();
        }
      } else {
        alert('正しい形式のデータではありません。コピーした文字をそのまま貼り付けてください。');
      }
    } catch (e) {
      alert('正しいデータではありません。不要な文字が混ざっていないか確認してください。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">データのお引越し</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-5 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'export' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            データを書き出す
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'import' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            データを読み込む
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              今のデータを別の端末に引き継ぐために、下の文字をすべてコピーしてください。
            </p>
            <div className="relative">
              <textarea 
                id="export-textarea"
                readOnly 
                value={exportDataStr}
                className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-400 font-mono focus:outline-none resize-none"
              />
              <button 
                onClick={handleCopy}
                className={`absolute bottom-3 right-3 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${copied ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-800'}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'コピーしました' : 'コピーする'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              古い端末で「コピー」した文字を、下の枠の中に貼り付けてください。
            </p>
            <textarea 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='ここに貼り付け'
              className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <button 
              onClick={handleImport}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
            >
              <Database size={18} />
              <span>データを復元する</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- サブコンポーネント: トランザクション入力モーダル ---
function TransactionModal({ onClose, onSubmit, categories, events, initialDate, editingTx }) {
  const [type, setType] = useState(editingTx ? editingTx.type : 'expense');
  const [amount, setAmount] = useState(editingTx ? editingTx.amount.toString() : '');
  const [date, setDate] = useState(editingTx ? editingTx.date : getLocalYMD(initialDate));
  const [categoryId, setCategoryId] = useState(editingTx ? editingTx.categoryId : '');
  const [memo, setMemo] = useState(editingTx ? editingTx.memo : '');
  const [eventId, setEventId] = useState(editingTx?.eventId || '');

  const filteredCategories = categories.filter(c => c.type === type);

  React.useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, categoryId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return alert('正しい金額を入力してください');
    if (!categoryId) return alert('ジャンルを選択してください');

    onSubmit({
      type,
      amount: Number(amount),
      date,
      categoryId,
      memo,
      eventId
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">{editingTx ? '記録を編集' : '記録を追加'}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'income' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              収入
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">日付</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">ジャンル</label>
            <div className="grid grid-cols-3 gap-2">
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`py-2 px-1 text-sm font-medium rounded-xl border transition-all ${categoryId === cat.id ? `border-transparent text-white ${cat.color} shadow-md` : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">金額</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder:font-normal"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">メモ (任意)</label>
            <input 
              type="text" 
              value={memo} 
              onChange={e => setMemo(e.target.value)}
              placeholder="何に使った？"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>

          {events && events.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">まとめに含める (任意)</label>
              <div className="relative">
                <select
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all appearance-none"
                >
                  <option value="">設定しない</option>
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                  <Folder size={16} />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-md transition-colors mt-2">
            {editingTx ? '更新する' : '保存する'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- サブコンポーネント: カテゴリー管理モーダル ---
function CategoryModal({ onClose, categories, onAdd, onDelete }) {
  const [activeTab, setActiveTab] = useState('expense');
  const [newCatName, setNewCatName] = useState('');

  const filteredCategories = categories.filter(c => c.type === activeTab);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAdd({ name: newCatName.trim(), type: activeTab });
    setNewCatName('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">ジャンル設定</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-xl mb-5 shrink-0">
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'expense' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            支出ジャンル
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'income' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            収入ジャンル
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2 space-y-2 mb-5">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${cat.color}`}></div>
                <span className="font-medium text-gray-700">{cat.name}</span>
              </div>
              <button 
                onClick={() => onDelete(cat.id)}
                className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">ジャンルがありません</p>
          )}
        </div>

        <form onSubmit={handleAdd} className="mt-auto shrink-0 border-t border-gray-100 pt-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">新しいジャンルを追加</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="ジャンル名"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <button type="submit" disabled={!newCatName.trim()} className="bg-gray-900 text-white px-5 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-gray-900 transition-colors">
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}