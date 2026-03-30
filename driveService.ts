
import { FinancialState } from './types';

export interface DriveSyncConfig {
  accessToken: string;
  userEmail: string;
  familyEmail?: string;
}

const DRIVE_FOLDER_NAME = 'FinanFlow_Backups';

/**
 * Busca ou cria uma pasta no Google Drive.
 */
const getOrCreateFolder = async (accessToken: string, folderName: string): Promise<string | null> => {
  try {
    // Buscar se a pasta já existe
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Criar a pasta se não existir
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error('Erro ao gerenciar pasta no Drive:', error);
    return null;
  }
};

/**
 * Sincroniza os dados com o Google Drive, salvando em uma pasta dedicada e mantendo histórico.
 */
export const syncWithDrive = async (config: DriveSyncConfig, data: FinancialState): Promise<boolean> => {
  try {
    const { accessToken, userEmail, familyEmail } = config;

    // 1. Obter ou criar a pasta de backups
    const folderId = await getOrCreateFolder(accessToken, DRIVE_FOLDER_NAME);
    if (!folderId) return false;

    // 2. Preparar o arquivo de backup com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const fileName = `backup_${userEmail}_${timestamp}.json`;
    
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      description: `Histórico de utilização FinanFlow - ${userEmail}`
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    // 3. Fazer o upload como um novo arquivo (mantendo o histórico)
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });

    if (!res.ok) return false;
    const fileData = await res.json();

    // 4. Compartilhar com o membro da família, se houver
    if (familyEmail && fileData.id) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'user',
          emailAddress: familyEmail
        })
      });
    }

    return true;
  } catch (error) {
    console.error('Erro na sincronização com Drive:', error);
    return false;
  }
};

/**
 * Busca o backup mais recente na pasta do Drive.
 */
export const fetchFromDrive = async (accessToken: string, userEmail: string): Promise<FinancialState | null> => {
  try {
    const folderId = await getOrCreateFolder(accessToken, DRIVE_FOLDER_NAME);
    if (!folderId) return null;

    // Buscar arquivos que comecem com o e-mail do usuário dentro da pasta, ordenados por data de modificação
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and name contains 'backup_${userEmail}' and trashed=false&orderBy=modifiedTime desc&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    const searchData = await searchRes.json();

    if (!searchData.files || searchData.files.length === 0) return null;

    const fileId = searchData.files[0].id;
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!fileRes.ok) return null;
    return await fileRes.json();
  } catch (error) {
    console.error('Erro ao buscar do Drive:', error);
    return null;
  }
};
