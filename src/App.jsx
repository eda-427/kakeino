import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, List as ListIcon, Settings, X, Trash2, ArrowDownCircle, ArrowUpCircle, Download } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  
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

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

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

  // --- PWA対応設定 ---
  useEffect(() => {
    // 1. 動的Manifestの生成
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

    // 2. Service Workerの動的登録
    // 注意: 現在のプレビュー環境ではblob URLからのService Worker登録が
    // セキュリティ制約によりエラーになるため、無効化しています。
    // 実際にPWAとして公開する場合は、別途 sw.js をサーバーに配置してください。
    /*
    const swCode = `
      self.addEventListener('install', (e) => self.skipWaiting());
      self.addEventListener('activate', (e) => self.clients.claim());
      self.addEventListener('fetch', (e) => {});
    `;
    const swBlob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(swBlob);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(swUrl).catch(console.error);
    }
    */

    // 3. インストールイベントの捕捉
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

  // --- カレンダーロジック ---
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
  const handleAddTransaction = (newTx) => {
    setTransactions(prev => [...prev, { ...newTx, id: Date.now().toString() }]);
    setIsTxModalOpen(false);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const handleAddCategory = (newCat) => {
    setCategories(prev => [...prev, { ...newCat, id: `cat-${Date.now()}`, color: COLORS[Math.floor(Math.random() * COLORS.length)] }]);
  };

  const handleDeleteCategory = (id) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
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
              return (
                <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${category?.color || 'bg-gray-200'} text-white`}>
                      {tx.type === 'income' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{category ? category.name : '不明'}</div>
                      {tx.memo && <div className="text-xs text-gray-500 mt-0.5">{tx.memo}</div>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-semibold ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-800'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <button onClick={() => handleDeleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              const txDate = new Date(tx.date);
              return (
                <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group border-b border-gray-50 pb-3 last:border-0 last:pb-2">
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
                      {tx.memo && <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{tx.memo}</div>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-bold ${tx.type === 'income' ? 'text-blue-600' : 'text-gray-800'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <button onClick={() => handleDeleteTransaction(tx.id)} className="text-gray-300 hover:text-red-500 p-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24 selection:bg-blue-100">
      
      {/* ヘッダー: 年月ナビゲーション */}
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
          <div className="flex bg-gray-200/60 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon size={16} />
              <span>カレンダー</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ListIcon size={16} />
              <span>リスト</span>
            </button>
          </div>
          <button 
            onClick={() => setIsCatModalOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-xl transition-colors"
            title="ジャンル設定"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {viewMode === 'calendar' ? (
            <>
              {renderCalendar()}
              {renderDayTransactions()}
            </>
          ) : (
            renderList()
          )}
        </div>

        {/* 広告エリア (Google AdSenseを想定) */}
        <AdBanner />

      </main>

      {/* フローティング追加ボタン */}
      <button 
        onClick={() => setIsTxModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-2xl shadow-lg shadow-gray-400/30 flex items-center justify-center hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus size={28} />
      </button>

      {/* モーダル: トランザクション入力 */}
      {isTxModalOpen && (
        <TransactionModal 
          onClose={() => setIsTxModalOpen(false)}
          onSubmit={handleAddTransaction}
          categories={categories}
          initialDate={viewMode === 'calendar' ? selectedDate : new Date()}
        />
      )}

      {/* モーダル: カテゴリー管理 */}
      {isCatModalOpen && (
        <CategoryModal 
          onClose={() => setIsCatModalOpen(false)}
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
        />
      )}

    </div>
  );
}

// --- サブコンポーネント: 広告バナー ---
function AdBanner() {
  // 実際のAdSenseスクリプトを読み込む処理（公開時に有効化します）
  useEffect(() => {
    // try {
    //   (window.adsbygoogle = window.adsbygoogle || []).push({});
    // } catch (e) {
    //   console.error("AdSense error", e);
    // }
  }, []);

  return (
    <div className="mt-8 mb-4">
      {/* 【公開時の手順】
        1. Google AdSenseの審査に通ったら、以下のダミー広告枠を消します。
        2. コメントアウトされている <ins> タグのコメントを外します。
        3. data-ad-client と data-ad-slot を自分のIDに書き換えます。
      */}
      
      {/* 実際の広告タグ (現在はコメントアウト) */}
      {/*
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
           data-ad-slot="YYYYYYYYYY"
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
      */}

      {/* プレビュー用のダミー広告枠 */}
      <div className="w-full h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
        <span className="text-xs font-bold mb-1">スポンサーリンク</span>
        <span className="text-[10px]">公開後にここに広告が表示されます</span>
      </div>
    </div>
  );
}

// --- サブコンポーネント: トランザクション入力モーダル ---
function TransactionModal({ onClose, onSubmit, categories, initialDate }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalYMD(initialDate));
  const [categoryId, setCategoryId] = useState('');
  const [memo, setMemo] = useState('');

  const filteredCategories = categories.filter(c => c.type === type);

  // デフォルトカテゴリーの設定
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
      memo
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">記録を追加</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 種類切り替え */}
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

          <button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-md transition-colors mt-2">
            保存する
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