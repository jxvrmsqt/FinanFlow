
import React, { useState, useMemo, useEffect } from 'react';
import { initialData } from './mockData';
import { FinancialState, Debt, HistoryPoint, AppSettings, FixedExpense, UserProfile, Income } from './types';
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
  LifeBuoy, HeartHandshake, Sunrise, UserPlus, Users, Mail, LogOut, PartyPopper, Trophy, Cloud, X
} from 'lucide-react';
import { getFinancialAdvice } from './geminiService';
import { fetchSheetData, saveSheetData } from './sheetsService';

// Added missing interfaces for component state
interface OnboardingState {
  step: 'LOGIN' | 'EMAIL_LOGIN' | 'PERSONAL_INFO' | 'FAMILY_CHECK' | 'FAMILY_FORM' | 'COMPLETED';
  tempName: string;
  tempEmail: string;
  tempIncome: string;
  tempFamilyMember: {
    email: string;
    name: string;
    income: string;
  };
}

interface DebtFormState {
  id?: string;
  name: string;
  totalBalance: string;
  monthlyInstallment: string;
  type: string;
  dueDate: string;
  interestRate: string;
  isAgreement: boolean;
  hasInstallments: boolean;
  installmentsCount: string;
  status: 'EM ANDAMENTO' | 'QUITADA';
}

interface ExpenseFormState {
  description: string;
  amount: string;
  dueDate: string;
  category: string;
}

// Citações poderosas e estoicas
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
  const [activeTab, setActiveTab] = useState<'home' | 'debts' | 'month' | 'income' | 'history' | 'settings' | 'advisor'>('home');
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
    tempEmail: '',
    tempIncome: '',
    tempFamilyMember: { email: '', name: '', income: '' }
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(false);
  const [showCelebration, setShowCelebration] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState<DebtFormState>({
    name: '', totalBalance: '', monthlyInstallment: '', type: 'Cartão', dueDate: '10', interestRate: '0', isAgreement: false, hasInstallments: true, installmentsCount: '', status: 'EM ANDAMENTO'
  });
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({ description: '', amount: '', dueDate: '5', category: 'Moradia' });
  const [showExtraIncomeModal, setShowExtraIncomeModal] = useState(false);
  const [extraIncomeAmount, setExtraIncomeAmount] = useState('');
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [selectedCrisisDebtId, setSelectedCrisisDebtId] = useState<string>('');
  const [simulationAmount, setSimulationAmount] = useState<string>('');
  const [simulationResult, setSimulationResult] = useState<any[] | null>(null);

  const appLogo = '/logo.png'; // use this logo image from public folder

  const isSecondOfDay = useMemo(() => new Date().getDate() === 2, []);

  useEffect(() => { if (settings.googleSheetsUrl && currentUser) handleSync(); }, [settings.googleSheetsUrl, currentUser]);
  useEffect(() => { localStorage.setItem('finanflow_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (currentUser) { localStorage.setItem('finanflow_user', JSON.stringify(currentUser)); localStorage.setItem('finanflow_data', JSON.stringify(data)); } }, [currentUser, data]);
  useEffect(() => { const localData = localStorage.getItem('finanflow_data'); if (localData && currentUser) setData(JSON.parse(localData)); }, []);
  useEffect(() => { const interval = setInterval(() => { setFadeQuote(true); setTimeout(() => { setCurrentQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length); setFadeQuote(false); }, 800); }, 12000); return () => clearInterval(interval); }, []);
  useEffect(() => { if (showCelebration.visible) { const timer = setTimeout(() => setShowCelebration({ ...showCelebration, visible: false }), 6000); return () => clearTimeout(timer); } }, [showCelebration]);

  const handleSync = async () => {
    if (!settings.googleSheetsUrl) return;
    setIsSyncing(true);
    const remoteData = await fetchSheetData(settings.googleSheetsUrl);
    if (remoteData) {
      setData(remoteData);
      setSettings(prev => ({ ...prev, lastSync: new Date().toLocaleString() }));
    }
    setIsSyncing(false);
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

  const handleLogin = () => setOnboarding(prev => ({ ...prev, step: 'EMAIL_LOGIN' }));
  const handlePersonalInfoSubmit = () => { if (!onboarding.tempName || !onboarding.tempEmail || !onboarding.tempIncome) return alert("Por favor, preencha todos os campos."); setOnboarding(prev => ({ ...prev, step: 'FAMILY_CHECK' })); };
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

  const handleLogout = () => { localStorage.removeItem('finanflow_user'); setCurrentUser(null); setOnboarding({ step: 'LOGIN', tempName: '', tempIncome: '', tempFamilyMember: { email: '', name: '', income: '' } }); };

  const calculateSmartPriorityScore = (isAgreement: boolean, interestRate: number, monthlyInstallment: number) => {
    let score = 0; if (isAgreement) score += 1000; score += interestRate * 20; score += monthlyInstallment * 0.05; return Math.round(score);
  };

  const totals = useMemo(() => {
    const totalIncome = data.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const paidFixedExpenses = data.fixedExpenses.filter(e => e.paid).reduce((acc, curr) => acc + (curr.actualAmount !== undefined ? curr.actualAmount : curr.amount), 0);
    const unpaidFixedExpenses = data.fixedExpenses.filter(e => !e.paid).reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyDebtCommitment = data.debts.filter(d => d.status === 'EM ANDAMENTO').reduce((acc, curr) => acc + curr.monthlyInstallment, 0);
    return { totalIncome, paidFixedExpenses, unpaidFixedExpenses, monthlyDebtCommitment, surplus: totalIncome - paidFixedExpenses - unpaidFixedExpenses - monthlyDebtCommitment };
  }, [data]);

  const debtProgression = useMemo(() => {
    const totalOriginal = data.debts.reduce((acc, d) => acc + d.originalValue, 0);
    const totalRemaining = data.debts.reduce((acc, d) => acc + d.totalBalance, 0);
    const totalPaid = totalOriginal - totalRemaining;
    return { totalOriginal, totalRemaining, totalPaid, progressPercent: totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0 };
  }, [data]);

  const handleSaveDebt = () => {
    if (!debtForm.name || !debtForm.totalBalance) return;
    const rate = parseFloat(debtForm.interestRate) || 0;
    const installment = parseFloat(debtForm.monthlyInstallment) || 0;
    const newDebt: Debt = { id: isEditingDebt && debtForm.id ? debtForm.id : Date.now().toString(), name: debtForm.name, originalValue: parseFloat(debtForm.totalBalance), totalBalance: parseFloat(debtForm.totalBalance), monthlyInstallment: installment, remainingInstallments: debtForm.hasInstallments ? parseInt(debtForm.installmentsCount) || 0 : 0, type: debtForm.type as any, status: debtForm.status || 'EM ANDAMENTO', priorityScore: calculateSmartPriorityScore(debtForm.isAgreement, rate, installment), dueDate: parseInt(debtForm.dueDate) || 10, interestRate: rate, isAgreement: debtForm.isAgreement };
    if (newDebt.status === 'QUITADA' && (!isEditingDebt || data.debts.find(d => d.id === newDebt.id)?.status !== 'QUITADA')) {
        setShowCelebration({ visible: true, message: "Fantástico! Você acabou de eliminar uma pendência do seu futuro. Sua liberdade financeira acaba de ganhar um novo fôlego!" });
    }
    const updatedDebts = isEditingDebt ? data.debts.map(d => d.id === newDebt.id ? newDebt : d) : [...data.debts, newDebt];
    const newData = { ...data, debts: updatedDebts };
    setData(newData); if (settings.googleSheetsUrl) saveSheetData(settings.googleSheetsUrl, newData); setShowDebtModal(false);
  };

  const handleCloseMonth = async () => {
      const surplus = totals.surplus; let remainingSurplus = surplus > 0 ? surplus : 0;
      const sortedDebtsForPayment = [...data.debts].filter(d => d.status === 'EM ANDAMENTO').sort((a, b) => calculateSmartPriorityScore(b.isAgreement, b.interestRate, b.monthlyInstallment) - calculateSmartPriorityScore(a.isAgreement, a.interestRate, a.monthlyInstallment));
      const updatedDebts = sortedDebtsForPayment.map(debt => {
        if (remainingSurplus > 0) {
          const amountToDeduct = Math.min(debt.totalBalance, remainingSurplus); remainingSurplus -= amountToDeduct; const newBalance = debt.totalBalance - amountToDeduct;
          return { ...debt, totalBalance: newBalance, status: newBalance <= 0 ? 'QUITADA' : 'EM ANDAMENTO' } as Debt;
        }
        return debt;
      });
      const finalDebts = data.debts.map(d => updatedDebts.find(ud => ud.id === d.id) || d);
      if (updatedDebts.some(d => d.status === 'QUITADA' && data.debts.find(od => od.id === d.id)?.status === 'EM ANDAMENTO')) {
          setShowCelebration({ visible: true, message: "A estratégia funcionou! O excedente deste mês quitou uma dívida. Você está mais leve e mais perto da sua paz financeira!" });
      }
      const newState: FinancialState = { ...data, debts: finalDebts, history: [...data.history, { date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, balance: finalDebts.reduce((acc, d) => acc + d.totalBalance, 0) }], fixedExpenses: data.fixedExpenses.map(e => ({ ...e, paid: false, actualAmount: undefined })) };
      setData(newState); if (settings.googleSheetsUrl) await saveSheetData(settings.googleSheetsUrl, newState); else localStorage.setItem('finanflow_data', JSON.stringify(newState));
      setTimeout(() => alert(`Mês encerrado! Excedente aplicado automaticamente.`), 500); setActiveTab('home');
  };

  const resetDebtForm = () => {
    setDebtForm({
      name: '',
      totalBalance: '',
      monthlyInstallment: '',
      type: 'Cartão',
      dueDate: '10',
      interestRate: '0',
      isAgreement: false,
      hasInstallments: true,
      installmentsCount: '',
      status: 'EM ANDAMENTO'
    });
    setIsEditingDebt(false);
  };

  const handleEditDebt = (debt: Debt) => {
    setDebtForm({
      id: debt.id,
      name: debt.name,
      totalBalance: debt.totalBalance.toString(),
      monthlyInstallment: debt.monthlyInstallment.toString(),
      type: debt.type,
      dueDate: debt.dueDate.toString(),
      interestRate: debt.interestRate.toString(),
      isAgreement: debt.isAgreement,
      hasInstallments: debt.remainingInstallments > 0,
      installmentsCount: debt.remainingInstallments.toString(),
      status: debt.status
    });
    setIsEditingDebt(true);
    setShowDebtModal(true);
  };

  const handleDeleteDebt = (id: string) => {
    const filtered = data.debts.filter(d => d.id !== id);
    const newState = { ...data, debts: filtered };
    setData(newState);
    localStorage.setItem('finanflow_data', JSON.stringify(newState));
  };

  if (!currentUser) {
      return (
          <div className="min-h-screen bg-[#f8f9fe] flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100">
                  <div className="flex justify-center mb-8">
                      <img src={appLogo} alt="FinanFlow Logo" className="w-20 h-20 rounded-3xl shadow-lg" />
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
                  {onboarding.step === 'EMAIL_LOGIN' && (
                      <div className="text-center space-y-8">
                          <h1 className="text-4xl font-black text-gray-800">FinanFlow</h1>
                          <p className="text-gray-400 font-medium">Digite seu e-mail para acessar ou criar sua conta.</p>
                          <input type="email" value={onboarding.tempEmail} onChange={e => setOnboarding({...onboarding, tempEmail: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Seu e-mail" />
                          <button onClick={() => { const user = data.users.find(u => u.email === onboarding.tempEmail); if (user) { setCurrentUser(user); } else { setOnboarding(prev => ({ ...prev, step: 'PERSONAL_INFO' })); } }} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">Continuar <ArrowRight size={18} /></button>
                      </div>
                  )}
                  {onboarding.step === 'PERSONAL_INFO' && (
                      <div className="space-y-6">
                          <h2 className="text-2xl font-black text-center">Boas-vindas!</h2>
                          <input type="text" value={onboarding.tempName} onChange={e => setOnboarding({...onboarding, tempName: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Como quer ser chamado?" />
                          <input type="email" value={onboarding.tempEmail} onChange={e => setOnboarding({...onboarding, tempEmail: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Seu e-mail" />
                          <input type="number" value={onboarding.tempIncome} onChange={e => setOnboarding({...onboarding, tempIncome: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl p-4 font-bold" placeholder="Renda Média Mensal" />
                          <button onClick={handlePersonalInfoSubmit} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">Próximo <ArrowRight size={18} /></button>
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
    <div className="min-h-screen flex flex-col md:flex-row font-sans text-slate-800">
      <nav className="w-full md:w-[280px] bg-white flex flex-col md:fixed h-screen z-20 border-r border-gray-100">
        <div className="w-full bg-white border-b border-gray-200 p-4 md:p-8">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="FinanFlow Logo" className="w-10 h-10 rounded-xl shadow-md" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none" style={{ fontFamily: 'Poppins, "Segoe UI", sans-serif' }}>FinanFlow</h1>
          </div>
          <div className="h-1 mt-2 w-full bg-pink-500 rounded-full" />
        </div>
        <div className="px-10 mb-8 flex items-center gap-3">
            <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Usuário')}` } className="w-10 h-10 rounded-full border-2 border-pink-100" />
            <div><p className="text-sm font-bold">{currentUser.name}</p><p className="text-[10px] text-gray-400 uppercase tracking-tighter">Foco na Liberdade</p></div>
        </div>
        <div className="flex-1 px-6 space-y-2">
          {[
            { id: 'home', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
            { id: 'debts', label: 'Dívidas', icon: <List size={20} /> },
            { id: 'month', label: 'Mês Atual', icon: <Calendar size={20} /> },
            { id: 'income', label: 'Ajuste de Renda', icon: <TrendingUp size={20} /> },
            { id: 'advisor', label: 'Consultoria', icon: <BrainCircuit size={20} /> },
            { id: 'history', label: 'Histórico', icon: <History size={20} /> },
            { id: 'settings', label: 'Ajustes', icon: <Settings size={20} /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${activeTab === tab.id ? 'bg-gray-50 text-pink-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <div className="p-8">
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-bold mb-6"><LogOut size={16} /> Sair</button>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white text-center shadow-xl cursor-pointer" onClick={handleGetAdvice}>
              <Sparkles className="mx-auto mb-2" />
              <h4 className="font-bold">IA Advisor</h4>
            </div>
        </div>
      </nav>

      <main className="flex-1 md:ml-[280px] p-6 md:p-12 min-h-screen overflow-y-auto overflow-x-hidden">
        {showCelebration.visible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
                <div className="bg-white rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in-50 duration-500 max-w-lg mx-4">
                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg text-white float-animation"><Trophy size={48} /></div>
                    <h2 className="text-4xl font-black text-gray-800 mb-4">VITÓRIA!</h2>
                    <p className="text-xl text-gray-600 font-medium leading-relaxed">{showCelebration.message}</p>
                    <button onClick={() => setShowCelebration({...showCelebration, visible: false})} className="mt-8 bg-black text-white px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-transform">Continuar Evoluindo</button>
                </div>
            </div>
        )}

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl mb-12">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sunrise size={100} /></div>
            <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-2">Sabedoria do Dia</p>
                <p className={`text-xl md:text-2xl font-bold italic transition-opacity duration-500 ${fadeQuote ? 'opacity-0' : 'opacity-100'}`}>"{MOTIVATIONAL_PHRASES[currentQuoteIndex]}"</p>
            </div>
        </div>

        {showDebtModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black">{isEditingDebt ? 'Editar Dívida' : 'Adicionar Dívida'}</h3>
                <button onClick={() => setShowDebtModal(false)} className="text-gray-500 hover:text-gray-800 font-bold">Fechar</button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <input type="text" value={debtForm.name} onChange={e => setDebtForm({...debtForm, name: e.target.value})} className="border p-3 rounded-xl" placeholder="Nome da dívida" />
                <input type="number" value={debtForm.totalBalance} onChange={e => setDebtForm({...debtForm, totalBalance: e.target.value})} className="border p-3 rounded-xl" placeholder="Valor total" />
                <input type="number" value={debtForm.monthlyInstallment} onChange={e => setDebtForm({...debtForm, monthlyInstallment: e.target.value})} className="border p-3 rounded-xl" placeholder="Parcela mensal" />
                <select value={debtForm.type} onChange={e => setDebtForm({...debtForm, type: e.target.value})} className="border p-3 rounded-xl">
                  <option value="Cartão">Cartão</option>
                  <option value="Empréstimo">Empréstimo</option>
                  <option value="Financiamento">Financiamento</option>
                  <option value="Acordo">Acordo</option>
                  <option value="Outros">Outros</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={debtForm.dueDate} onChange={e => setDebtForm({...debtForm, dueDate: e.target.value})} className="border p-3 rounded-xl" placeholder="Dia do vencimento" />
                  <input type="number" value={debtForm.interestRate} onChange={e => setDebtForm({...debtForm, interestRate: e.target.value})} className="border p-3 rounded-xl" placeholder="Juros (%)" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={debtForm.isAgreement} onChange={e => setDebtForm({...debtForm, isAgreement: e.target.checked})} />Acordo</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={debtForm.hasInstallments} onChange={e => setDebtForm({...debtForm, hasInstallments: e.target.checked})} />Possui parcelas</label>
                </div>
                {debtForm.hasInstallments && <input type="number" value={debtForm.installmentsCount} onChange={e => setDebtForm({...debtForm, installmentsCount: e.target.value})} className="border p-3 rounded-xl" placeholder="Número de parcelas" />}
                <select value={debtForm.status} onChange={e => setDebtForm({...debtForm, status: e.target.value as Debt['status']})} className="border p-3 rounded-xl">
                  <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                  <option value="QUITADA">QUITADA</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowDebtModal(false)} className="px-5 py-3 border rounded-xl">Cancelar</button>
                <button onClick={handleSaveDebt} className="px-5 py-3 bg-blue-600 text-white rounded-xl">Salvar</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'home' && (
          <div className="space-y-12">
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-primary rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Liberdade Alcançada</p><p className="text-5xl font-black">{debtProgression.progressPercent.toFixed(0)}%</p></div>
                    <div className="w-full bg-black/20 h-2 rounded-full mt-6"><div className="bg-white h-full transition-all duration-1000" style={{width: `${debtProgression.progressPercent}%`}}></div></div>
                </div>
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Receita Total</p><p className="text-3xl font-black">R$ {totals.totalIncome.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Comprometimento</p><p className="text-3xl font-black">R$ {totals.monthlyDebtCommitment.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Sobra Estratégica</p><p className="text-3xl font-black text-emerald-500">R$ {totals.surplus.toLocaleString('pt-BR')}</p>
                </div>
            </section>
            {aiAdvice && <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl animate-in slide-in-from-top-4">
              <div className="flex gap-6"><Sparkles size={32} className="text-indigo-200" /><div><h3 className="font-bold text-xl mb-4">Análise Estratégica da IA</h3><p className="text-indigo-100 leading-relaxed whitespace-pre-wrap">{aiAdvice}</p></div></div>
            </div>}
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-4xl font-black">Dívidas</h2>
              <button onClick={() => { resetDebtForm(); setShowDebtModal(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold">Adicionar Dívida</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.debts.length === 0 && <p className="text-gray-500">Nenhuma dívida cadastrada.</p>}
              {data.debts.map(debt => (
                <Card key={debt.id} title={debt.name} icon={<CreditCard size={20} />} className="border p-4">
                  <p className="text-sm">Saldo: R$ {debt.totalBalance.toLocaleString('pt-BR')}</p>
                  <p className="text-sm">Parcela: R$ {debt.monthlyInstallment.toLocaleString('pt-BR')}</p>
                  <p className="text-sm">Situação: {debt.status}</p>
                  <p className="text-sm">Vencimento: {debt.dueDate}º dia</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleEditDebt(debt)} className="px-3 py-2 bg-yellow-500 text-white rounded-xl">Editar</button>
                    <button onClick={() => handleDeleteDebt(debt.id)} className="px-3 py-2 bg-red-500 text-white rounded-xl">Excluir</button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'month' && (
          <Card title="Fechamento de Mês" icon={<Calendar size={24} />} className="bg-white">
            <p className="text-gray-600 mb-4">Saldo atual: R$ {totals.surplus.toLocaleString('pt-BR')}</p>
            <p className="text-gray-600 mb-4">Despesa fixa paga: R$ {totals.paidFixedExpenses.toLocaleString('pt-BR')}</p>
            <p className="text-gray-600 mb-4">Despesas fixas pendentes: R$ {totals.unpaidFixedExpenses.toLocaleString('pt-BR')}</p>
            <button onClick={handleCloseMonth} className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold">Encerrar Mês</button>
          </Card>
        )}

        {activeTab === 'advisor' && (
          <Card title="Consultoria" icon={<BrainCircuit size={24} />} className="bg-white">
            <p className="text-gray-600 mb-4">Peça uma análise de inteligência financeira baseada na sua situação atual.</p>
            <button onClick={handleGetAdvice} className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold">Obter aconselhamento</button>
            {loadingAdvice && <p className="text-gray-500 mt-3">Buscando...</p>}
            {aiAdvice && <p className="text-gray-800 mt-3 whitespace-pre-wrap">{aiAdvice}</p>}
          </Card>
        )}

        {activeTab === 'history' && (
          <Card title="Histórico" icon={<History size={24} />} className="bg-white">
            <div className="space-y-2">
              {data.history.length === 0 ? <p className="text-gray-500">Sem histórico ainda.</p> : data.history.map((item, idx) => (
                <div key={idx} className="border-b pb-2">
                  <p className="text-sm font-bold">{item.date}</p>
                  <p className="text-sm">Saldo: R$ {item.balance.toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-12">
                <h2 className="text-4xl font-black">Ajustes & Backup</h2>
                <Card title="Sincronização com o Google Drive" icon={<Cloud size={24}/>} className="bg-white">
                    <p className="text-gray-500 mb-6 font-medium">Conecte sua conta do Google via App Script para garantir que seus dados nunca se percam e possam ser acessados de qualquer lugar.</p>
                    <div className="flex flex-col md:flex-row gap-4">
                        <input type="text" value={settings.googleSheetsUrl} onChange={e => setSettings({...settings, googleSheetsUrl: e.target.value})} className="flex-1 bg-gray-50 rounded-2xl py-5 px-8 font-bold focus:ring-4 focus:ring-pink-50 transition-all outline-none" placeholder="URL da Planilha/App Script" />
                        <button onClick={handleSync} className="bg-black text-white px-10 py-5 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"><RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} /> Sincronizar Agora</button>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'debts' && (
            <div className="space-y-12">
                <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-black">Gerenciamento de Dívidas</h2>
                    <button onClick={() => { setShowDebtModal(true); setIsEditingDebt(false); setDebtForm({ name: '', totalBalance: '', monthlyInstallment: '', type: 'Cartão', dueDate: '10', interestRate: '0', isAgreement: false, hasInstallments: true, installmentsCount: '', status: 'EM ANDAMENTO' }); }} className="bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-lg"><Plus size={20} /> Adicionar Dívida</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.debts.map(debt => (
                        <div key={debt.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="font-bold text-xl">{debt.name}</h3><p className="text-gray-400 text-sm">{debt.type}</p></div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${debt.status === 'QUITADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{debt.status}</div>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between"><span className="text-gray-500">Saldo Restante</span><span className="font-bold">R$ {debt.totalBalance.toLocaleString('pt-BR')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Parcela Mensal</span><span className="font-bold">R$ {debt.monthlyInstallment.toLocaleString('pt-BR')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Juros</span><span className="font-bold">{debt.interestRate}%</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditingDebt(true); setDebtForm({ id: debt.id, name: debt.name, totalBalance: debt.totalBalance.toString(), monthlyInstallment: debt.monthlyInstallment.toString(), type: debt.type, dueDate: debt.dueDate.toString(), interestRate: debt.interestRate.toString(), isAgreement: debt.isAgreement, hasInstallments: debt.remainingInstallments > 0, installmentsCount: debt.remainingInstallments.toString(), status: debt.status }); setShowDebtModal(true); }} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">Editar</button>
                                <button onClick={() => setData({...data, debts: data.debts.filter(d => d.id !== debt.id)})} className="bg-red-100 text-red-700 py-3 px-4 rounded-xl font-bold hover:bg-red-200 transition-all"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'month' && (
            <div className="space-y-12">
                <div className="flex justify-between items-center">
                    <h2 className="text-4xl font-black">Mês Atual</h2>
                    <button onClick={handleCloseMonth} className="bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-lg"><CheckCircle size={20} /> Fechar Mês</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card title="Despesas Fixas" icon={<Home size={24}/>} className="bg-white">
                        <div className="space-y-4">
                            {data.fixedExpenses.map(expense => (
                                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div><p className="font-bold">{expense.description}</p><p className="text-sm text-gray-500">{expense.category}</p></div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold">R$ {expense.amount.toLocaleString('pt-BR')}</span>
                                        <input type="checkbox" checked={expense.paid} onChange={() => setData({...data, fixedExpenses: data.fixedExpenses.map(e => e.id === expense.id ? {...e, paid: !e.paid} : e)})} className="w-5 h-5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Card title="Resumo do Mês" icon={<Calendar size={24}/>} className="bg-white">
                        <div className="space-y-4">
                            <div className="flex justify-between"><span>Receita Total</span><span className="font-bold">R$ {totals.totalIncome.toLocaleString('pt-BR')}</span></div>
                            <div className="flex justify-between"><span>Despesas Pagas</span><span className="font-bold">R$ {totals.paidFixedExpenses.toLocaleString('pt-BR')}</span></div>
                            <div className="flex justify-between"><span>Comprometimento Dívidas</span><span className="font-bold">R$ {totals.monthlyDebtCommitment.toLocaleString('pt-BR')}</span></div>
                            <hr />
                            <div className="flex justify-between text-lg"><span>Excedente</span><span className="font-bold text-emerald-500">R$ {totals.surplus.toLocaleString('pt-BR')}</span></div>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {activeTab === 'income' && (
            <div className="space-y-12">
                <h2 className="text-4xl font-black">Ajuste de Renda</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card title="Adicionar Renda Extra" icon={<Plus size={24}/>} className="bg-white">
                        <p className="text-gray-500 mb-6">Inclua rendimentos adicionais como freelas, bônus, etc.</p>
                        <button onClick={() => setShowExtraIncomeModal(true)} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg"><Plus size={20} /> Adicionar Renda Extra</button>
                    </Card>
                    <Card title="Ajustar Salário" icon={<Edit3 size={24}/>} className="bg-white">
                        <p className="text-gray-500 mb-6">Atualize seu salário principal quando houver mudanças.</p>
                        <input type="number" value={currentUser.income} onChange={e => setCurrentUser({...currentUser, income: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 rounded-xl p-4 font-bold mb-4" placeholder="Novo Salário" />
                        <button onClick={() => { setData({...data, incomes: data.incomes.map(inc => inc.id === 'inc_1' ? {...inc, amount: currentUser.income} : inc)}); }} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Atualizar Salário</button>
                    </Card>
                    <Card title="Simulação de Imprevisto" icon={<AlertTriangle size={24}/>} className="bg-white">
                        <p className="text-gray-500 mb-6">Simule situações de crise e veja como o app recalcula prioridades.</p>
                        <button onClick={() => setShowCrisisModal(true)} className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg"><AlertTriangle size={20} /> Simular Crise</button>
                    </Card>
                </div>
                <Card title="Priorização de Dívidas" icon={<BarChart3 size={24}/>} className="bg-white">
                    <p className="text-gray-500 mb-6">Dívidas são priorizadas automaticamente: necessidades básicas da família têm prioridade máxima.</p>
                    <div className="space-y-4">
                        {[...data.debts].filter(d => d.status === 'EM ANDAMENTO').sort((a, b) => b.priorityScore - a.priorityScore).map(debt => (
                            <div key={debt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div><p className="font-bold">{debt.name}</p><p className="text-sm text-gray-500">Prioridade: {debt.isAgreement ? 'Acordo/Negociação' : 'Padrão'}</p></div>
                                <div className="text-right"><p className="font-bold">R$ {debt.monthlyInstallment.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-500">Score: {debt.priorityScore}</p></div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'advisor' && (
            <div className="space-y-12">
                <h2 className="text-4xl font-black">Consultoria Financeira IA</h2>
                <Card title="Análise Personalizada" icon={<BrainCircuit size={24}/>} className="bg-white">
                    <p className="text-gray-500 mb-6">Receba conselhos estratégicos baseados em sua situação financeira atual.</p>
                    <button onClick={handleGetAdvice} disabled={loadingAdvice} className="bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-lg disabled:opacity-50">
                        {loadingAdvice ? <RefreshCw size={20} className="animate-spin" /> : <Sparkles size={20} />} {loadingAdvice ? 'Analisando...' : 'Gerar Análise'}
                    </button>
                    {aiAdvice && <div className="mt-6 p-6 bg-gray-50 rounded-2xl"><p className="whitespace-pre-wrap">{aiAdvice}</p></div>}
                </Card>
            </div>
        )}

        {showDebtModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black">{isEditingDebt ? 'Editar Dívida' : 'Nova Dívida'}</h3>
                        <button onClick={() => setShowDebtModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={debtForm.name} onChange={e => setDebtForm({...debtForm, name: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Nome da Dívida" />
                        <input type="number" value={debtForm.totalBalance} onChange={e => setDebtForm({...debtForm, totalBalance: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Valor Total" />
                        <input type="number" value={debtForm.monthlyInstallment} onChange={e => setDebtForm({...debtForm, monthlyInstallment: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Parcela Mensal" />
                        <select value={debtForm.type} onChange={e => setDebtForm({...debtForm, type: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold">
                            <option>Cartão</option><option>Empréstimo</option><option>Financiamento</option><option>Outros</option>
                        </select>
                        <input type="number" value={debtForm.dueDate} onChange={e => setDebtForm({...debtForm, dueDate: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Dia do Vencimento" />
                        <input type="number" value={debtForm.interestRate} onChange={e => setDebtForm({...debtForm, interestRate: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Taxa de Juros (%)" />
                        <label className="flex items-center gap-2"><input type="checkbox" checked={debtForm.isAgreement} onChange={e => setDebtForm({...debtForm, isAgreement: e.target.checked})} /> Acordo/Negociação</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={debtForm.hasInstallments} onChange={e => setDebtForm({...debtForm, hasInstallments: e.target.checked})} /> Possui Parcelas</label>
                        {debtForm.hasInstallments && <input type="number" value={debtForm.installmentsCount} onChange={e => setDebtForm({...debtForm, installmentsCount: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Número de Parcelas Restantes" />}
                        <select value={debtForm.status} onChange={e => setDebtForm({...debtForm, status: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold">
                            <option value="EM ANDAMENTO">Em Andamento</option><option value="QUITADA">Quitada</option>
                        </select>
                        <button onClick={handleSaveDebt} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Salvar</button>
                    </div>
                </div>
            </div>
        )}

        {showExpenseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full mx-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black">Nova Despesa Fixa</h3>
                        <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Descrição" />
                        <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Valor" />
                        <input type="number" value={expenseForm.dueDate} onChange={e => setExpenseForm({...expenseForm, dueDate: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Dia do Vencimento" />
                        <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 font-bold">
                            <option>Moradia</option><option>Alimentação</option><option>Transporte</option><option>Saúde</option><option>Educação</option><option>Lazer</option><option>Outros</option>
                        </select>
                        <button onClick={() => { if (!expenseForm.description || !expenseForm.amount) return; const newExpense: FixedExpense = { id: Date.now().toString(), description: expenseForm.description, amount: parseFloat(expenseForm.amount), dueDate: parseInt(expenseForm.dueDate), category: expenseForm.category, paid: false }; setData({...data, fixedExpenses: [...data.fixedExpenses, newExpense]}); setShowExpenseModal(false); }} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Adicionar</button>
                    </div>
                </div>
            </div>
        )}

        {showExtraIncomeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full mx-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black">Renda Extra</h3>
                        <button onClick={() => setShowExtraIncomeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="space-y-4">
                        <input type="number" value={extraIncomeAmount} onChange={e => setExtraIncomeAmount(e.target.value)} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Valor da Renda Extra" />
                        <button onClick={() => { if (!extraIncomeAmount) return; setData({...data, incomes: [...data.incomes, { id: Date.now().toString(), source: 'Renda Extra', amount: parseFloat(extraIncomeAmount) }]}); setExtraIncomeAmount(''); setShowExtraIncomeModal(false); }} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Adicionar</button>
                    </div>
                </div>
            </div>
        )}

        {showCrisisModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full mx-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black">Simulação de Crise</h3>
                        <button onClick={() => setShowCrisisModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="space-y-4">
                        <input type="number" value={simulationAmount} onChange={e => setSimulationAmount(e.target.value)} className="w-full bg-gray-50 rounded-xl p-4 font-bold" placeholder="Valor da Crise" />
                        <button onClick={() => { if (!simulationAmount) return; const crisisAmount = parseFloat(simulationAmount); const sortedDebts = [...data.debts].filter(d => d.status === 'EM ANDAMENTO').sort((a, b) => b.priorityScore - a.priorityScore); let remainingCrisis = crisisAmount; const simulatedPayments = sortedDebts.map(debt => { if (remainingCrisis > 0) { const payAmount = Math.min(debt.totalBalance, remainingCrisis); remainingCrisis -= payAmount; return { ...debt, totalBalance: debt.totalBalance - payAmount, status: debt.totalBalance - payAmount <= 0 ? 'QUITADA' : 'EM ANDAMENTO' }; } return debt; }); setSimulationResult(simulatedPayments); }} className="w-full bg-black text-white py-4 rounded-2xl font-bold">Simular</button>
                        {simulationResult && <div className="mt-6 p-6 bg-gray-50 rounded-2xl"><h4 className="font-bold mb-4">Resultado da Simulação</h4><div className="space-y-2">{simulationResult.map(debt => <div key={debt.id} className="flex justify-between"><span>{debt.name}</span><span>R$ {debt.totalBalance.toLocaleString('pt-BR')} ({debt.status})</span></div>)}</div></div>}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
