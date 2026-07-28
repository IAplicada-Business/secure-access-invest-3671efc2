export interface TemplateVariable {
  name: string;
  required: boolean;
  type?: string;
}

export interface TemplateClient {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
}

const TEMPLATE_VARIABLE_RE = /\{\{\s*(\w+)\s*\}\}/g;

export function renderTemplateContent(content: string, variables: Record<string, string | null | undefined>) {
  return content.replace(TEMPLATE_VARIABLE_RE, (_match, key: string) => variables[key] || '');
}

export function isHtmlTemplateContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

export function getClientTemplateVariables(client?: TemplateClient | null, date = new Date()) {
  const dataEmissao = date.toLocaleDateString('pt-BR');
  const clienteNome = client?.name || '';
  const clienteDocumento = client?.cpf_cnpj || client?.cnpj || '';
  const clienteTelefone = client?.phone || '';
  const clienteEmail = client?.email || '';

  return {
    cliente_nome: clienteNome,
    cliente_documento: clienteDocumento,
    cliente_email: clienteEmail,
    cliente_telefone: clienteTelefone,
    cliente_endereco: client?.endereco || '',
    cliente_cidade: client?.cidade || '',
    data_emissao: dataEmissao,

    // Legacy aliases kept so older templates continue to work.
    nome_cliente: clienteNome,
    cpf_cnpj_cliente: clienteDocumento,
    cpf_cnpj: clienteDocumento,
    telefone_cliente: clienteTelefone,
    email_cliente: clienteEmail,
    data: dataEmissao,
  };
}

export function buildTemplateVariablesData(
  templateVariables: TemplateVariable[],
  client?: TemplateClient | null,
  existing: Record<string, string> = {},
  extras: Record<string, string> = {},
) {
  const autoVariables = { ...getClientTemplateVariables(client), ...extras };
  const nextVariables: Record<string, string> = {};

  templateVariables.forEach((variable) => {
    nextVariables[variable.name] = existing[variable.name] ?? autoVariables[variable.name as keyof typeof autoVariables] ?? '';
  });

  return nextVariables;
}
