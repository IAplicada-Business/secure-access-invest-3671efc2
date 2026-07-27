# Tijolo em Capital (JImobi)

Plataforma de gestão e catálogo exclusivo de imóveis irregulares para investidores — admin + links secretos para investidores/corretores.

**Lovable:** https://lovable.dev/projects/8160a747-b610-499f-ac53-85ac4909dd62  
**Preview:** https://id-preview--8160a747-b610-499f-ac53-85ac4909dd62.lovable.app  
**Produção:** https://secure-access-invest.lovable.app  

> Repositório GitHub conectado ao Lovable: `IAplicada-Business/secure-access-invest-3671efc2`  
> Histórico legado (mesmo commit `main`): https://github.com/IAplicada-Business/secure-access-invest

## Stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (Auth, Postgres, Storage, Edge Functions)

## Como rodar localmente

```sh
npm i
npm run dev   # http://localhost:8080
```

Credenciais públicas do Supabase estão em `.env` (`VITE_SUPABASE_*`). O backend é o projeto hospedado — não é necessário `supabase start` para o fluxo principal.

### Rotas úteis sem login

- Catálogo investidor: `/catalogo/:token` (demo: `demo-investidor-2024`)
- Submissão corretor: `/submit/:token`

Área `/admin/*` exige usuário autenticado com papel admin/permissões.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (porta 8080) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Notas para agentes

Ver [`AGENTS.md`](./AGENTS.md) para instruções específicas do ambiente Cursor Cloud.

## Domínio customizado

No Lovable: Project → Settings → Domains → Connect Domain.  
Docs: https://docs.lovable.dev/features/custom-domain#custom-domain
