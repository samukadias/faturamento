/**
 * API Stubs para futura integração com ERP Oracle
 * 
 * Estes endpoints estão documentados para integração futura.
 * Atualmente a aplicação usa o json-server como mock.
 * 
 * BASE_URL: https://erp.prodesp.sp.gov.br/api/v1
 */

const ERP_BASE_URL = import.meta.env.VITE_ERP_BASE_URL || 'https://erp.prodesp.sp.gov.br/api/v1';

interface ERPAuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

// ============================================================
// AUTH
// ============================================================
/**
 * POST /auth/token
 * Autenticação OAuth2 com o ERP Oracle
 */
export async function erpAuthenticate(_clientId: string, _clientSecret: string): Promise<ERPAuthToken> {
  // TODO: Implementar integração real
  // const resp = await fetch(`${ERP_BASE_URL}/auth/token`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({ grant_type: 'client_credentials', client_id, client_secret }),
  // });
  // return resp.json();
  throw new Error('Integração ERP Oracle não implementada. Use a importação manual de Excel.');
}

// ============================================================
// NOTAS FISCAIS
// ============================================================
/**
 * GET /ar/notas-fiscais
 * Busca notas fiscais do módulo AR (Accounts Receivable) do Oracle
 * 
 * Query params:
 *   - periodo_inicio: string (YYYY-MM-DD)
 *   - periodo_fim: string (YYYY-MM-DD)
 *   - status: 'ABERTA' | 'PAGA' | 'CANCELADA'
 *   - contrato: string
 *   - limit: number
 *   - offset: number
 */
export async function erpGetNotasFiscais(_params: {
  periodoInicio: string;
  periodoFim: string;
  status?: string;
  contrato?: string;
  limit?: number;
  offset?: number;
}) {
  // TODO: Implementar
  // const searchParams = new URLSearchParams({ ... });
  // const resp = await fetch(`${ERP_BASE_URL}/ar/notas-fiscais?${searchParams}`, {
  //   headers: { 'Authorization': `Bearer ${token}` }
  // });
  // return resp.json();
  console.warn('[ERP Stub] erpGetNotasFiscais não implementado');
  return { data: [], total: 0 };
}

// ============================================================
// APONTAMENTO
// ============================================================
/**
 * GET /projetos/apontamento
 * Busca registros de apontamento de serviços
 * 
 * Query params:
 *   - mes: number
 *   - ano: number
 *   - contrato: string
 */
export async function erpGetApontamento(_params: {
  mes: number;
  ano: number;
  contrato?: string;
}) {
  // TODO: Implementar
  console.warn('[ERP Stub] erpGetApontamento não implementado');
  return { data: [], total: 0 };
}

// ============================================================
// NOTAS DE DÉBITO
// ============================================================
/**
 * GET /ar/notas-debito
 * Busca notas de débito (ND) do Oracle
 */
export async function erpGetNotasDebito(_params: {
  mes: number;
  ano: number;
  tipo?: string;
}) {
  // TODO: Implementar
  console.warn('[ERP Stub] erpGetNotasDebito não implementado');
  return { data: [], total: 0 };
}

// ============================================================
// EXPORTAR PARA ERP
// ============================================================
/**
 * POST /ar/exportar
 * Envia relatório processado de volta ao ERP
 */
export async function erpExportarRelatorio(_payload: {
  mesReferencia: string;
  totalFaturamento: number;
  registros: unknown[];
}) {
  // TODO: Implementar
  console.warn('[ERP Stub] erpExportarRelatorio não implementado');
  return { success: false, message: 'Integração pendente' };
}

export { ERP_BASE_URL };
