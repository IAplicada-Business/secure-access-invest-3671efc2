

# Nova Interface Inicial — Split Login

## Contexto
O sistema e de uso interno da empresa, que ja possui landing page propria (jimobigestaoenegocios.com). A pagina inicial atual e comercial e desnecessaria. Sera substituida por uma tela de login moderna no estilo split-screen (inspirado no componente Splite do 21st.dev).

## Design

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│   ┌──────────────────┬─────────────────────┐    │
│   │                  │                     │    │
│   │   Foto da dona   │   Logo J. (icone)   │    │
│   │   (cover, dark   │                     │    │
│   │    overlay)      │   "Painel de Gestão"│    │
│   │                  │                     │    │
│   │   Logo completa  │   [Email]           │    │
│   │   + tagline      │   [Senha]           │    │
│   │                  │   [Entrar]          │    │
│   │                  │                     │    │
│   │                  │   "Acesso restrito" │    │
│   └──────────────────┴─────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
  Mobile: foto vira background com overlay escuro,
          form centralizado por cima
```

- Fundo escuro (charcoal/preto) na metade esquerda com foto da dona em cover + overlay gradiente
- Sobre a foto: logo completa (J Imobi Gestao e Negocios) + frase curta da landing page
- Metade direita: fundo branco/claro, logo icone (J.) no topo, formulario de login
- Paleta: dourado, charcoal, branco — mantendo identidade visual existente
- Animacoes sutis de fade-in

## Arquivos

### Assets (copiar uploads)
- `user-uploads://1.jpg` → `src/assets/owner-photo.jpg` (foto da dona)
- `user-uploads://IMG_3660.PNG` → `src/assets/logo-icon.png` (logo icone J.)
- `user-uploads://IMG_3652.PNG` → `src/assets/logo-full.png` (logo completa)

### Alteracoes
1. **`src/pages/Index.tsx`** — Reescrever completamente como tela split-screen de login (mover logica de auth do AdminLogin)
2. **`src/pages/admin/AdminLogin.tsx`** — Redirecionar para `/` (ou remover e atualizar rota)
3. **`src/App.tsx`** — Rota `/` aponta para a nova tela de login. Rota `/admin/login` redireciona para `/`

### Nao sera usado Spline 3D
O componente referenciado usa Spline 3D. Vou replicar apenas o **layout split-screen** e o efeito **spotlight/gradiente**, sem dependencia do Spline. A foto da dona substitui a cena 3D.

