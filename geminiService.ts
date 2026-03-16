
import { GoogleGenAI } from "@google/genai";
import { FinancialState } from "./types";

export const getFinancialAdvice = async (state: FinancialState): Promise<string> => {
  const api_key = import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: api_key });
  
  const activeDebts = state.debts.filter(d => d.status === 'EM ANDAMENTO');
  const totalDebt = activeDebts.reduce((acc, d) => acc + d.totalBalance, 0);
  const totalInstallments = activeDebts.reduce((acc, d) => acc + d.monthlyInstallment, 0);
  const totalIncome = state.incomes.reduce((acc, i) => acc + i.amount, 0);
  
  const prompt = `
    Aja como um consultor financeiro sênior. Analise os seguintes dados brasileiros:
    - Renda Total: R$ ${totalIncome.toFixed(2)}
    - Total em Dívidas Ativas: R$ ${totalDebt.toFixed(2)}
    - Comprometimento mensal com parcelas: R$ ${totalInstallments.toFixed(2)}
    - Lista de Dívidas Prioritárias: ${activeDebts.sort((a, b) => a.priorityScore - b.priorityScore).map(d => d.name).join(', ')}

    Forneça um feedback curto e motivador (máximo 4 parágrafos) respondendo:
    1. Qual o maior perigo atual?
    2. Por que focar na Prioridade 1 é essencial agora?
    3. Uma dica prática para acelerar a quitação.
    Use um tom empático e estratégico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "Não foi possível gerar conselhos no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com a inteligência financeira. Verifique sua conexão.";
  }
};
