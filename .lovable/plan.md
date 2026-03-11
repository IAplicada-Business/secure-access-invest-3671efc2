
Objetivo: corrigir a logo do menu superior interno sem aumentar a altura do header.

Diagnóstico atual:
- O header do admin já está fixo em `h-16`, então o menu não deveria crescer.
- A logo no topo já está com `className="h-14 w-44"` em `AdminLayout.tsx`.
- Mesmo assim ela continua visualmente pequena no preview, o que indica que o problema não é mais o container: o arquivo de imagem usado em `Logo.tsx` (`logo-full.png`) provavelmente tem muita área vazia ao redor da marca.

Plano de correção:
1. Ajustar o componente `Logo` para suportar uma versão mais “fechada” da marca no contexto do admin.
2. Trocar no header interno o asset atual por uma versão mais compacta da logo, usando um dos arquivos já existentes no projeto (`logo-jmobi-tight.png` ou `logo-jmobi-cropped.png`).
3. Manter o header exatamente com a mesma altura (`h-16`) e preservar o espaço horizontal atual, para a navegação não deslocar nem aumentar.
4. Aplicar a versão compacta apenas no menu superior interno, sem mexer nas outras telas até validar o visual.

Arquivos a ajustar:
- `src/components/Logo.tsx`
  - adicionar suporte a variante/asset compacto para evitar a área vazia da imagem.
- `src/pages/admin/AdminLayout.tsx`
  - usar a variante compacta no topo do admin.

Resultado esperado:
- a logo fica perceptivelmente maior dentro do mesmo header;
- o menu não aumenta de altura;
- a marca ocupa o espaço disponível de forma proporcional e limpa.
