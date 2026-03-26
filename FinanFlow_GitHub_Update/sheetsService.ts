
import { FinancialState } from './types';

/**
 * Este serviço comunica-se com um Google Apps Script implantado como Web App.
 * O Script deve tratar GET para retornar o JSON e POST para salvar o JSON.
 */

export const fetchSheetData = async (url: string): Promise<FinancialState | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao buscar dados');
    return await response.json();
  } catch (error) {
    console.error('Erro Sheets Sync:', error);
    return null;
  }
};

export const saveSheetData = async (url: string, data: FinancialState): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script Web Apps geralmente exigem no-cors ou redirecionamento
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return true; // No-cors não permite ler a resposta, mas assume-se sucesso se não houver erro de rede
  } catch (error) {
    console.error('Erro Sheets Save:', error);
    return false;
  }
};
