// Telas controláveis por permissão (usado na tela de Usuários e no enforcement).
// `key` é o que fica salvo em user_screen_permissions.screen.
// `paths` são os prefixos de rota que a tela cobre (para o enforcement).
export interface AdminScreen {
  key: string;
  label: string;
  paths: string[];
}

export const ADMIN_SCREENS: AdminScreen[] = [
  { key: 'dashboard', label: 'Dashboard / Relatórios', paths: ['/admin/relatorios'] },
  { key: 'imoveis', label: 'Imóveis', paths: ['/admin/imoveis'] },
  { key: 'submissoes', label: 'Submissões', paths: ['/admin/submissoes'] },
  { key: 'links', label: 'Links', paths: ['/admin/links'] },
  { key: 'financeiro', label: 'Financeiro', paths: ['/admin/financeiro'] },
  { key: 'regularizacoes', label: 'Regularizações', paths: ['/admin/regularizacoes'] },
  { key: 'comunicacoes', label: 'Comunicações', paths: ['/admin/comunicacoes'] },
  { key: 'documentos', label: 'Documentos', paths: ['/admin/documentos'] },
  { key: 'crm', label: 'Funil', paths: ['/admin/crm'] },
  { key: 'clientes', label: 'Contatos', paths: ['/admin/contatos', '/admin/clientes'] },
  { key: 'parceiros', label: 'Parceiros', paths: ['/admin/parceiros'] },
  { key: 'configuracoes', label: 'Perfil / Configurações', paths: ['/admin/configuracoes'] },
];

export const ADMIN_SCREEN_KEYS = ADMIN_SCREENS.map((s) => s.key);
