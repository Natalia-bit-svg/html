# FamilyHub 🏠

Aplicativo de gestão familiar com calendário, tarefas, gamificação, listas de compras e receitas.

---

## 📁 Estrutura de Arquivos

```
familyhub/
│
├── index.html            ← Tela de Login / Registro
├── dashboard.html        ← App principal (pós-login)
├── schema.sql            ← Estrutura do banco de dados MySQL
├── .env.example          ← Variáveis de ambiente necessárias
│
├── css/
│   ├── style.css         ← Importa os módulos CSS (dashboard)
│   ├── base.css          ← Body, scrollbar, utilitários globais
│   ├── responsive.css    ← Breakpoints por componente
│   └── login.css         ← Estilos exclusivos da tela de login
│
├── js/
│   │
│   │── Tela de Login ──────────────────────────────────────
│   ├── login-theme.js    ← Configuração do Tailwind (login)
│   ├── login-ui.js       ← Abas, toggle de senha, validação
│   ├── login-auth.js     ← Auth híbrida: PHP + fallback offline
│   │
│   │── Núcleo do App (dashboard) ──────────────────────────
│   ├── config.js         ← Constantes, menu, gamificação defs
│   ├── auth.js           ← Auth helpers + cliente da API
│   ├── db.js             ← DB local (localStorage) + dados demo
│   ├── state.js          ← Estado global (filtros, view atual)
│   ├── utils.js          ← Helpers: datas, cores, export/import
│   ├── ui.js             ← Toasts, dialogs, dark mode, sidebar
│   ├── notifications.js  ← Sistema de notificações + auto-alerts
│   ├── search.js         ← Busca global com dropdown
│   ├── crud.js           ← Operações CRUD: atividades, listas...
│   ├── modals.js         ← Formulários em modal + salvamento
│   ├── gamification.js   ← Pontos, conquistas, streaks, prêmios
│   ├── app.js            ← Orquestrador: navegação + init
│   │
│   └── views/            ← Uma view por página do app
│       ├── view-dashboard.js
│       ├── view-calendar.js
│       ├── view-atividades.js
│       ├── view-listas.js
│       ├── view-receitas.js
│       ├── view-membros.js
│       ├── view-estatisticas.js
│       ├── view-configuracoes.js
│       ├── view-ranking.js
│       └── view-logs.js
│
└── php/
    ├── api.php           ← Endpoints da API REST
    ├── auth.php          ← Login, registro e logout
    └── db.php            ← Conexão com MySQL via PDO
```

---

## 🚀 Como rodar

### Modo Offline (sem servidor)
Basta abrir `index.html` no navegador.
Use as credenciais de demo: `admin@familyhub.com` / `123456`

### Modo com Servidor (XAMPP/MySQL)
1. Copie os arquivos para `htdocs/familyhub`
2. Importe `schema.sql` no MySQL
3. Copie `.env.example` para `.env` e preencha as variáveis
4. Acesse `http://localhost/familyhub`

---

## 🔧 Adicionando uma nova página

1. Crie `js/views/view-minhapagina.js` com a função `renderMinhaPagina()`
2. Adicione a entrada no array `MENU` em `js/config.js`
3. Adicione no objeto `views` em `js/app.js`
4. Inclua o `<script>` no `dashboard.html` antes de `app.js`

---

## 🎨 Cores do tema

| Token          | Claro       | Escuro      | Uso              |
|---------------|-------------|-------------|-----------------|
| `brand-main`  | `#438370`   | `#438370`   | CTA, destaques  |
| `brand-dark`  | `#2c5c4e`   | `#2c5c4e`   | Hover, pressed  |
| `bg-light`    | `#f8fafc`   | `#0f172a`   | Fundo da página |
| `panel-light` | `#ffffff`   | `#1e293b`   | Cards, painéis  |
| `border-light`| `#e2e8f0`   | `#334155`   | Bordas          |

---

## 📦 Dependências externas (CDN)

| Lib           | Versão    | Uso                        |
|--------------|-----------|---------------------------|
| Tailwind CSS | latest    | Utilitários de estilo      |
| Lucide Icons | 0.475.0   | Ícones SVG                 |
| Outfit Font  | —         | Tipografia                 |
