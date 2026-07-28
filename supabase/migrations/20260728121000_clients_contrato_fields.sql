ALTER TABLE clients ADD COLUMN IF NOT EXISTS valor_contrato numeric(12,2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_inicio_contrato date;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS data_fim_contrato date;
COMMENT ON COLUMN clients.valor_contrato IS 'Valor previsto do contrato no pipeline CRM (projeção financeira)';
COMMENT ON COLUMN clients.data_inicio_contrato IS 'Início do contrato / previsão de início';
COMMENT ON COLUMN clients.data_fim_contrato IS 'Fim do contrato; deve ser > data_inicio quando ambas preenchidas';
