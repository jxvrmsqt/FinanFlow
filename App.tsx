
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
  LifeBuoy, HeartHandshake, Sunrise, UserPlus, Users, Mail, LogOut, PartyPopper, Trophy, Cloud
} from 'lucide-react';
import { getFinancialAdvice } from './geminiService';
import { fetchSheetData, saveSheetData } from './sheetsService';

// Added missing interfaces for component state
interface OnboardingState {
  step: 'LOGIN' | 'PERSONAL_INFO' | 'FAMILY_CHECK' | 'FAMILY_FORM' | 'COMPLETED';
  tempName: string;
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

  const isSecondOfDay = useMemo(() => new Date().getDate() === 2, []);

  useEffect(() => { if (settings.googleSheetsUrl && currentUser) handleSync(); }, [currentUser]);
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

  const handleLogin = () => setOnboarding(prev => ({ ...prev, step: 'PERSONAL_INFO' }));
  const handlePersonalInfoSubmit = () => { if (!onboarding.tempName || !onboarding.tempIncome) return alert("Por favor, preencha todos os campos."); setOnboarding(prev => ({ ...prev, step: 'FAMILY_CHECK' })); };
  const handleFamilyCheck = (addMember: boolean) => addMember ? setOnboarding(prev => ({ ...prev, step: 'FAMILY_FORM' })) : finishOnboarding();
  const handleFamilyFormSubmit = () => { if (!onboarding.tempFamilyMember.email || !onboarding.tempFamilyMember.name || !onboarding.tempFamilyMember.income) return alert("Preencha todos os dados."); finishOnboarding(true); };

  const finishOnboarding = (hasFamily = false) => {
    const mainUser: UserProfile = { id: '1', name: onboarding.tempName, email: 'user@gmail.com', income: parseFloat(onboarding.tempIncome), role: 'ADMIN', avatar: 'https://ui-avatars.com/api/?name=' + onboarding.tempName };
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
            { id: 'advisor', label: 'Consultoria', icon: <BrainCircuit size={20} /> },
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

      <main className="flex-1 md:ml-[280px] p-6 md:p-12 overflow-x-hidden">
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
      </main>
    </div>
  );
};

export default App;
