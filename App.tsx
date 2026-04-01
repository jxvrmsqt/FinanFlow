
import React, { useState, useMemo, useEffect } from 'react';
import { initialData } from './mockData';
import { FinancialState, Debt, HistoryPoint, AppSettings, FixedExpense, UserProfile, Income, DebtPayment, DebtStatus } from './types';
import Card from './components/Card.tsx';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  LayoutDashboard, List, Calendar, History, TrendingDown, 
  ArrowUpCircle, AlertCircle, CheckCircle2, Zap, Sparkles, Heart,
  Home, Target, DollarSign, Wallet, Save, Settings, RefreshCw, Link2, ExternalLink,
  CheckCircle, ChevronRight, AlertTriangle, Edit3, ArrowRight,
  Plus, Smile, ShoppingBag, Clock, Calculator, BrainCircuit, Layers, BarChart3,
  CreditCard, TrendingUp, Bell, Trash2, ShieldAlert, Award, Flame, AlertOctagon,
  LifeBuoy, HeartHandshake, Sunrise, UserPlus, Users, Mail, LogOut, PartyPopper, Trophy, Cloud,
  ArrowDownCircle, Scale, ZapOff, DownloadCloud, UploadCloud, Handshake, Percent, Coins, Banknote, FolderSync, CalendarClock
} from 'lucide-react';
import { getFinancialAdvice } from './geminiService';
import { fetchSheetData, saveSheetData } from './sheetsService';
import { syncWithDrive, fetchFromDrive, DriveSyncConfig } from './driveService';

// Interfaces for component state
interface OnboardingState {
  step: 'LOGIN' | 'PERSONAL_INFO' | 'FAMILY_CHECK' | 'FAMILY_FORM' | 'RESTORE_CHECK' | 'COMPLETED';
  tempName: string;
  tempIncome: string;
  tempEmail: string;
  tempFamilyMember: {
    email: string;
    name: string;
    income: string;
  };
}

interface DebtFormState {
  id?: string;
  name: string;
  originalValue: string;
  totalBalance: string;
  monthlyInstallment: string;
  type: any;
  dueDate: string;
  interestRate: string;
  status: DebtStatus;
  isAgreement: boolean;
  agreementValue?: string;
  remainingInstallments: string;
}

interface ExpenseFormState {
  description: string;
  amount: string;
  dueDate: string;
  category: any;
}

interface PaymentModalState {
  visible: boolean;
  debt: Debt | null;
  type: 'TOTAL' | 'PARCIAL' | 'ANTECIPACAO' | 'NORMAL';
  amount: string;
  discount: string;
}

// Motivational Phrases
const MOTIVATIONAL_PHRASES = [
  "A riqueza consiste muito mais em desfrutar do que em possuir. — Aristóteles",
  "Onde quer que haja um ser humano, há uma oportunidade para a bondade e para a coragem. — Sêneca",
  "A felicidade não é algo pronto. Ela vem de suas próprias ações. — Dalai Lama",
  "A disciplina é a alma de um exército. Torna grandes as pequenas quantidades. — George Washington",
  "Não é que temos pouco tempo, é que perdemos muito. — Sêneca",
  "Sorte é o que acontece quando a preparação encontra a oportunidade. — Sêneca",
  "O homem que move uma montanha começa carregando pequenas pedras. — Confúcio",
  "O segredo do sucesso é a constância do propósito. — Benjamin Disraeli",
  "Nossa maior glória não reside em jamais cair, mas em levantarmo-nos cada vez que caímos. — Confúcio",
  "Quem tem um porquê suporta quase qualquer como. — Viktor Frankl"
];

const App: React.FC = () => {
  const [data, setData] = useState<FinancialState>(initialData);
  const [activeTab, setActiveTab] = useState<'home' | 'debts' | 'month' | 'history' | 'settings' | 'advisor'>('home');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('finanflow_settings');
    return saved ? JSON.parse(saved) : { googleSheetsUrl: '', lastSync: null };
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('finanflow_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [onboarding, setOnboarding] = useState<OnboardingState>({
    step: 'LOGIN',
    tempName: '',
    tempIncome: '',
    tempEmail: '',
    tempFamilyMember: { email: '', name: '', income: '' }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFound, setBackupFound] = useState<FinancialState | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(false);
  const [showCelebration, setShowCelebration] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState<DebtFormState>({
    name: '', originalValue: '', totalBalance: '', monthlyInstallment: '', type: 'Cartão', dueDate: '10', interestRate: '0', status: 'EM ANDAMENTO', isAgreement: false, remainingInstallments: ''
  });
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({ description: '', amount: '', dueDate: '5', category: 'Moradia' });

  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    visible: false, debt: null, type: 'NORMAL', amount: '', discount: ''
  });
  
  // Backup Automático Diário
  useEffect(() => {
    const checkAutoBackup = async () => {
      if (!currentUser || isSyncing || isRestoring) return;

      const accessToken = localStorage.getItem('google_access_token');
      if (!accessToken) return;

      const lastSyncStr = settings.lastSync;
      const now = new Date();

      if (lastSyncStr) {
        const lastSyncDate = new Date(lastSyncStr);
        const diffInHours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
        
        // Se o último backup foi há mais de 24 horas, sincroniza automaticamente
        if (diffInHours >= 24) {
          console.log('Iniciando backup automático diário...');
          handleDriveSync();
        }
      } else {
        // Primeiro backup se nunca foi feito
        handleDriveSync();
      }
    };

    const timeoutId = setTimeout(checkAutoBackup, 5000); // Aguarda 5s após carregar o app
    return () => clearTimeout(timeoutId);
  }, [currentUser, settings.lastSync]);

  useEffect(() => { localStorage.setItem('finanflow_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (currentUser) { localStorage.setItem('finanflow_user', JSON.stringify(currentUser)); localStorage.setItem('finanflow_data', JSON.stringify(data)); } }, [currentUser, data]);
  useEffect(() => { const localData = localStorage.getItem('finanflow_data'); if (localData && currentUser) setData(JSON.parse(localData)); }, []);
  useEffect(() => { const interval = setInterval(() => { setFadeQuote(true); setTimeout(() => { setCurrentQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length); setFadeQuote(false); }, 800); }, 12000); return () => clearInterval(interval); }, []);
  useEffect(() => { if (showCelebration.visible) { const timer = setTimeout(() => setShowCelebration({ ...showCelebration, visible: false }), 6000); return () => clearTimeout(timer); } }, [showCelebration]);

  const handleDriveSync = async () => {
    if (!currentUser || isSyncing) return;
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) return;
    setIsSyncing(true);
    const familyMember = data.users.find(u => u.role === 'MEMBER');
    const config: DriveSyncConfig = { accessToken, userEmail: currentUser.email, familyEmail: familyMember?.email };
    const success = await syncWithDrive(config, data);
    if (success) setSettings(prev => ({ ...prev, lastSync: new Date().toISOString() }));
    setIsSyncing(false);
  };

  const handleDriveRestore = async () => {
    if (!currentUser || isRestoring) return;
    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) return alert("Sessão expirada. Por favor, faça login novamente.");
    setIsRestoring(true);
    const restoredData = await fetchFromDrive(accessToken, currentUser.email);
    if (restoredData) { setData(restoredData); alert("Dados restaurados com sucesso!"); } 
    else alert("Nenhum backup encontrado.");
    setIsRestoring(false);
  };

  const handleGetAdvice = async () => {
    if (loadingAdvice) return;
    setLoadingAdvice(true);
    setAiAdvice(null);
    try {
      const advice = await getFinancialAdvice(data);
      setAiAdvice(advice);
    } catch (error) {
      setAiAdvice("Não foi possível carregar os conselhos.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleLogin = () => setOnboarding(prev => ({ ...prev, step: 'PERSONAL_INFO' }));
  const handlePersonalInfoSubmit = async () => { 
    if (!onboarding.tempName || !onboarding.tempIncome || !onboarding.tempEmail) return alert("Preencha todos os campos."); 
    localStorage.setItem('google_access_token', 'simulated_token_for_demo');
    setIsRestoring(true);
    const existingBackup = await fetchFromDrive('simulated_token_for_demo', onboarding.tempEmail);
    setIsRestoring(false);
    if (existingBackup) { setBackupFound(existingBackup); setOnboarding(prev => ({ ...prev, step: 'RESTORE_CHECK' })); } 
    else setOnboarding(prev => ({ ...prev, step: 'FAMILY_CHECK' })); 
  };

  const handleRestoreChoice = (restore: boolean) => {
    if (restore && backupFound) {
      const mainUser = backupFound.users.find(u => u.role === 'ADMIN') || { id: '1', name: onboarding.tempName, email: onboarding.tempEmail, income: parseFloat(onboarding.tempIncome), role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=' + onboarding.tempName };
      setCurrentUser(mainUser as UserProfile);
      setData(backupFound);
      setOnboarding(prev => ({ ...prev, step: 'COMPLETED' }));
    } else setOnboarding(prev => ({ ...prev, step: 'FAMILY_CHECK' }));
  };

  const handleFamilyCheck = (addMember: boolean) => addMember ? setOnboarding(prev => ({ ...prev, step: 'FAMILY_FORM' })) : finishOnboarding();
  const handleFamilyFormSubmit = () => { if (!onboarding.tempFamilyMember.email || !onboarding.tempFamilyMember.name || !onboarding.tempFamilyMember.income) return alert("Preencha todos os dados."); finishOnboarding(true); };

  const finishOnboarding = (hasFamily = false) => {
    const mainUser: UserProfile = { id: '1', name: onboarding.tempName, email: onboarding.tempEmail, income: parseFloat(onboarding.tempIncome), role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=' + onboarding.tempName };
    const users = [mainUser];
    const incomes: Income[] = [{ id: 'inc_1', source: `Salário - ${mainUser.name}`, amount: mainUser.income }];
    if (hasFamily) {
      const familyUser: UserProfile = { id: '2', name: onboarding.tempFamilyMember.name, email: onboarding.tempFamilyMember.email, income: parseFloat(onboarding.tempFamilyMember.income), role: 'MEMBER', avatar: 'https://ui-avatars.com/api/?name=' + onboarding.tempFamilyMember.name };
      users.push(familyUser);
      incomes.push({ id: 'inc_2', source: `Salário - ${familyUser.name}`, amount: familyUser.income });
    }
    const newData: FinancialState = { users: users, debts: [], incomes: incomes, fixedExpenses: [], history: [] };
    setCurrentUser(mainUser); setData(newData); setOnboarding(prev => ({ ...prev, step: 'COMPLETED' }));
  };

  const handleLogout = () => { 
    localStorage.removeItem('finanflow_user'); 
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('finanflow_data');
    setCurrentUser(null); 
    setOnboarding({ step: 'LOGIN', tempName: '', tempIncome: '', tempEmail: '', tempFamilyMember: { email: '', name: '', income: '' } }); 
  };

  const handleAddDebt = () => {
    const newDebt: Debt = {
      id: isEditingDebt ? debtForm.id! : Math.random().toString(36).substr(2, 9),
      name: debtForm.name,
      originalValue: parseFloat(debtForm.originalValue),
      totalBalance: parseFloat(debtForm.totalBalance),
      monthlyInstallment: debtForm.status === 'CORRENTE' ? 0 : parseFloat(debtForm.monthlyInstallment),
      remainingInstallments: debtForm.status === 'CORRENTE' ? 0 : parseInt(debtForm.remainingInstallments),
      type: debtForm.type,
      status: debtForm.status,
      priorityScore: 0,
      dueDate: parseInt(debtForm.dueDate),
      interestRate: parseFloat(debtForm.interestRate),
      isAgreement: debtForm.isAgreement || debtForm.status === 'ACORDO',
      agreementValue: debtForm.agreementValue ? parseFloat(debtForm.agreementValue) : undefined,
      payments: isEditingDebt ? data.debts.find(d => d.id === debtForm.id)?.payments || [] : [],
      createdAt: new Date().toISOString()
    };
    if (isEditingDebt) setData({ ...data, debts: data.debts.map(d => d.id === newDebt.id ? newDebt : d) });
    else setData({ ...data, debts: [...data.debts, newDebt] });
    setShowDebtModal(false);
    setDebtForm({ name: '', originalValue: '', totalBalance: '', monthlyInstallment: '', type: 'Cartão', dueDate: '10', interestRate: '0', status: 'EM ANDAMENTO', isAgreement: false, remainingInstallments: '' });
  };

  const handleProcessPayment = () => {
    if (!paymentModal.debt) return;
    const amount = parseFloat(paymentModal.amount);
    const discount = parseFloat(paymentModal.discount || '0');
    const debtId = paymentModal.debt.id;
    const updatedDebts = data.debts.map(d => {
      if (d.id === debtId) {
        const newBalance = d.totalBalance - amount - discount;
        const newStatus = newBalance <= 0 ? 'QUITADA' : d.status;
        const newPayments = [...(d.payments || []), { id: Math.random().toString(36).substr(2, 9), date: new Date().toISOString(), amount, discount, type: paymentModal.type }];
        return { ...d, totalBalance: Math.max(0, newBalance), status: newStatus as DebtStatus, remainingInstallments: d.remainingInstallments > 0 ? d.remainingInstallments - 1 : 0, payments: newPayments };
      }
      return d;
    });
    const lastHistory = data.history[data.history.length - 1];
    const newHistoryPoint: HistoryPoint = { date: new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }), balance: updatedDebts.reduce((acc, curr) => acc + curr.totalBalance, 0), savingsFromNegotiation: (lastHistory?.savingsFromNegotiation || 0) + discount };
    setData({ ...data, debts: updatedDebts, history: [...data.history, newHistoryPoint] });
    if (amount + discount >= paymentModal.debt.totalBalance) setShowCelebration({ visible: true, message: `Dívida quitada: ${paymentModal.debt.name}!` });
    setPaymentModal({ visible: false, debt: null, type: 'NORMAL', amount: '', discount: '' });
  };

  const totals = useMemo(() => {
    const totalIncome = data.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const paidFixedExpenses = data.fixedExpenses.filter(e => e.paid).reduce((acc, curr) => acc + (curr.actualAmount !== undefined ? curr.actualAmount : curr.amount), 0);
    const unpaidFixedExpenses = data.fixedExpenses.filter(e => !e.paid).reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyDebtCommitment = data.debts.filter(d => d.status === 'EM ANDAMENTO' || d.status === 'ACORDO').reduce((acc, curr) => acc + curr.monthlyInstallment, 0);
    return { totalIncome, paidFixedExpenses, unpaidFixedExpenses, monthlyDebtCommitment, surplus: totalIncome - paidFixedExpenses - unpaidFixedExpenses - monthlyDebtCommitment };
  }, [data]);

  const debtMetrics = useMemo(() => {
    const totalOwed = data.debts.reduce((acc, d) => acc + d.totalBalance, 0);
    const currentDebts = data.debts.filter(d => d.status === 'CORRENTE').reduce((acc, d) => acc + d.totalBalance, 0);
    const totalSavings = data.history.reduce((acc, h) => acc + (h.savingsFromNegotiation || 0), 0);
    return { totalOwed, currentDebts, totalSavings };
  }, [data]);

  const monthItems = useMemo(() => {
    const expenses = data.fixedExpenses.map(e => ({ ...e, type: 'EXPENSE' as const }));
    const debtInstallments = data.debts.filter(d => d.status === 'EM ANDAMENTO' || d.status === 'ACORDO').map(d => ({ ...d, type: 'DEBT' as const }));
    return [...expenses, ...debtInstallments].sort((a, b) => a.dueDate - b.dueDate);
  }, [data]);

  if (!currentUser) {
      return (
          <div className="min-h-screen bg-[#f8f9fe] flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
                  <div className="flex justify-center mb-8">
                      <div className="w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center text-white shadow-lg float-animation">
                         <Zap size={40} fill="currentColor" />
                      </div>
                  </div>
                  {onboarding.step === 'LOGIN' && (
                      <div className="text-center space-y-8">
                          <h1 className="text-4xl font-black text-gray-800">FinanFlow</h1>
                          <p className="text-gray-400 font-medium">Sua jornada para a liberdade começa com um passo disciplinado.</p>
                          <button onClick={handleLogin} className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-5 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-sm">
                              <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6" /> Entrar com Google
                          </button>
                      </div>
                  )}
                  {onboarding.step === 'PERSONAL_INFO' && (
                      <div className="space-y-6">
                          <h2 className="text-2xl font-black text-center">Boas-vindas!</h2>
                          <input type="text" value={onboarding.tempName} onChange={e => setOnboarding({...onboarding, tempName: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Como quer ser chamado?" />
                          <input type="email" value={onboarding.tempEmail} onChange={e => setOnboarding({...onboarding, tempEmail: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Seu E-mail Google" />
                          <input type="number" value={onboarding.tempIncome} onChange={e => setOnboarding({...onboarding, tempIncome: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Renda Média Mensal" />
                          <button onClick={handlePersonalInfoSubmit} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50" disabled={isRestoring}>
                            {isRestoring ? <RefreshCw className="animate-spin" /> : "Próximo"} <ArrowRight size={18} />
                          </button>
                      </div>
                  )}
                  {onboarding.step === 'RESTORE_CHECK' && (
                      <div className="space-y-8 text-center">
                          <Cloud size={48} className="mx-auto text-blue-500 animate-bounce" />
                          <h2 className="text-2xl font-black">Backup Encontrado!</h2>
                          <p className="text-gray-400">Encontramos dados salvos no seu Google Drive. Deseja restaurá-los agora?</p>
                          <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => handleRestoreChoice(false)} className="bg-gray-100 py-4 rounded-2xl font-bold">Começar Novo</button>
                              <button onClick={() => handleRestoreChoice(true)} className="bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"><DownloadCloud size={18} /> Restaurar</button>
                          </div>
                      </div>
                  )}
                  {onboarding.step === 'FAMILY_CHECK' && (
                      <div className="space-y-8 text-center">
                          <Users size={48} className="mx-auto text-blue-500" />
                          <h2 className="text-2xl font-black">Adicionar Família?</h2>
                          <p className="text-gray-400">Gerencie finanças conjuntas somando as rendas.</p>
                          <div className="grid grid-cols-2 gap-4">
                              <button onClick={() => handleFamilyCheck(false)} className="bg-gray-100 py-4 rounded-2xl font-bold">Só eu</button>
                              <button onClick={() => handleFamilyCheck(true)} className="bg-blue-500 text-white py-4 rounded-2xl font-bold">Adicionar</button>
                          </div>
                      </div>
                  )}
                  {onboarding.step === 'FAMILY_FORM' && (
                      <div className="space-y-6">
                          <h2 className="text-xl font-black">Membro da Família</h2>
                          <input type="email" value={onboarding.tempFamilyMember.email} onChange={e => setOnboarding({...onboarding, tempFamilyMember: {...onboarding.tempFamilyMember, email: e.target.value}})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="E-mail" />
                          <input type="text" value={onboarding.tempFamilyMember.name} onChange={e => setOnboarding({...onboarding, tempFamilyMember: {...onboarding.tempFamilyMember, name: e.target.value}})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Nome" />
                          <input type="number" value={onboarding.tempFamilyMember.income} onChange={e => setOnboarding({...onboarding, tempFamilyMember: {...onboarding.tempFamilyMember, income: e.target.value}})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Renda" />
                          <button onClick={handleFamilyFormSubmit} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">Concluir</button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800 bg-[#f8f9fe]">
      <nav className="w-full md:w-[280px] bg-white flex flex-col md:fixed h-full z-20 border-r border-gray-100">
        <div className="p-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center text-white shadow-lg"><Zap size={20} fill="currentColor" /></div>
          <h1 className="text-2xl font-black tracking-tight">FinanFlow</h1>
        </div>
        <div className="px-10 mb-8 flex items-center gap-3">
            <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-pink-100" />
            <div><p className="text-sm font-bold">{currentUser.name}</p><p className="text-[10px] text-gray-400 uppercase tracking-tighter">Foco na Liberdade</p></div>
        </div>
        <div className="flex-1 px-6 space-y-2">
          {[
            { id: 'home', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
            { id: 'debts', label: 'Dívidas', icon: <List size={20} /> },
            { id: 'month', label: 'Mês Atual', icon: <Calendar size={20} /> },
            { id: 'history', label: 'Evolução', icon: <TrendingUp size={20} /> },
            { id: 'advisor', label: 'Consultoria', icon: <BrainCircuit size={20} /> },
            { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id ? 'bg-gray-50 text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="p-8">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-bold"><LogOut size={16} /> Sair</button>
              {(isSyncing || isRestoring) && <div className="flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase animate-pulse"><Cloud size={12}/> {isRestoring ? 'Restoring' : 'Syncing'}</div>}
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white text-center shadow-xl cursor-pointer" onClick={() => setActiveTab('advisor')}>
              <Sparkles className="mx-auto mb-2" />
              <h4 className="font-bold">IA Advisor</h4>
            </div>
        </div>
      </nav>

      <main className="flex-1 md:ml-[280px] p-6 md:p-12 overflow-x-hidden">
        {activeTab === 'home' && (
          <div className="space-y-12">
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-primary rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Total Devido</p><p className="text-4xl font-black">R$ {debtMetrics.totalOwed.toLocaleString('pt-BR')}</p></div>
                </div>
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Comprometimento Mês</p><p className="text-3xl font-black">R$ {totals.monthlyDebtCommitment.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100">
                    <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">Economia Gerada</p>
                    <p className="text-3xl font-black text-emerald-700">R$ {debtMetrics.totalSavings.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Sobra Estratégica</p><p className="text-3xl font-black text-blue-600">R$ {totals.surplus.toLocaleString('pt-BR')}</p>
                </div>
            </section>
          </div>
        )}

        {activeTab === 'month' && (
          <div className="space-y-12">
            <h2 className="text-4xl font-black">Mês Atual</h2>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
              <div className="space-y-4">
                {monthItems.map((item: any) => (
                  <div key={item.id} className={`flex items-center justify-between p-6 rounded-3xl border ${item.paid ? 'bg-emerald-50 opacity-60' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${item.type === 'EXPENSE' ? 'bg-blue-500' : 'bg-indigo-500'}`}>
                        {item.type === 'EXPENSE' ? <ShoppingBag /> : <CreditCard />}
                      </div>
                      <div>
                        <h4 className="font-black text-lg">{item.description || item.name}</h4>
                        <p className="text-xs font-bold text-gray-400 uppercase">Vence dia {item.dueDate}</p>
                      </div>
                    </div>
                    <p className="text-xl font-black">R$ {(item.amount || item.monthlyInstallment).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-12">
                <h2 className="text-4xl font-black">Ajustes & Backup Automático</h2>
                <Card title="Sincronização com Google Drive" icon={<FolderSync size={24}/>} className="bg-white">
                    <div className="space-y-6">
                      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                        <label className="text-xs font-black uppercase text-blue-400 ml-2">E-mail para Backup</label>
                        <div className="flex gap-4 mt-2">
                          <input 
                            type="email" 
                            value={currentUser.email} 
                            onChange={e => setCurrentUser({...currentUser, email: e.target.value})}
                            className="flex-1 bg-white border-0 rounded-xl p-4 font-bold text-blue-900 focus:ring-2 ring-blue-500"
                            placeholder="seuemail@gmail.com"
                          />
                          <button onClick={() => alert("E-mail atualizado!")} className="bg-blue-600 text-white px-6 rounded-xl font-bold">Salvar</button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-500"><CalendarClock size={24}/></div>
                          <div>
                            <p className="font-black text-emerald-900">Backup Diário Ativo</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Sincroniza automaticamente a cada 24h.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-400"><Cloud size={24}/></div>
                          <div>
                            <p className="font-black text-gray-900">Última Sincronização</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{settings.lastSync ? new Date(settings.lastSync).toLocaleString('pt-BR') : 'Nunca sincronizado'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={handleDriveSync} disabled={isSyncing} className="bg-black text-white px-8 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg disabled:opacity-50">
                          <UploadCloud size={20} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? "Sincronizando..." : "Sincronizar Agora"}
                        </button>
                        <button onClick={handleDriveRestore} disabled={isRestoring} className="bg-white border-2 border-black text-black px-8 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-sm disabled:opacity-50">
                          <DownloadCloud size={20} className={isRestoring ? "animate-spin" : ""} /> {isRestoring ? "Restaurar da Nuvem" : "Baixar Backup"}
                        </button>
                      </div>
                    </div>
                </Card>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
