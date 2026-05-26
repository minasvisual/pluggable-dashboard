# Pluggable Dashboard — CLAUDE.md

## Project Summary

A no-code admin dashboard that connects to external REST APIs via JSON configuration files. Users define projects, resources, and CRUD schemas in JSON — the dashboard renders tables, forms, and custom inputs automatically without writing frontend code. Designed to run locally or embedded in Electron; **not intended for public internet exposure without auth protection**.

Live demo: https://pluggable-dashboard.vercel.app/

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Vue 2.6.11 |
| State | Vuex 3 |
| Routing | Vue Router 3 |
| UI Components | CoreUI 3 (Vue) |
| Forms | Vue Formulate 2.5 + vue-formulate-extended |
| HTTP | Axios + axios-cache-adapter (1h cache) |
| Rich Text | vue-quill |
| JSON Editor | v-jsoneditor |
| Code Highlighting | PrismJS |
| Build | Vue CLI 4 (Webpack) |
| Styling | SCSS (node-sass) |
| Testing | Jest (unit) + Nightwatch (e2e) |

## Installation

```bash
npm install --legacy-peer-deps
```

> **Note:** `node-sass` was replaced with `sass` (dart-sass) because `node-sass@4.x` requires Python 2 and does not build on Node 18+. The `sass-loader` was also upgraded to `^10.4.1` to match. Use `--legacy-peer-deps` because some transitive peer dep conflicts remain from the Vue CLI 4 era.

## Commands

```bash
npm run dev          # Dev server on port 3000, hot reload
npm run build        # Production build
npm run build:prod   # Production build (alias)
npm run lint         # ESLint
npm run test:unit    # Jest unit tests
npm run test:e2e     # Nightwatch end-to-end tests
npm run mock         # HTTP server with CORS proxy for local API mocking
npm run release      # Full pipeline: lint + build + test:unit + test:e2e
```

## Environment Variables (.env)

Copy `.env.example` to `.env` before running:

```env
VUE_APP_ENV=local                        # "local" disables axios cache
VUE_APP_DATABASE=/examples/projects.json # Path/URL to projects config file

# Optional: dashboard-level authentication
VUE_APP_LOGIN=false                      # "true" enables login screen
VUE_APP_LOGIN_URL=                       # POST endpoint for login
VUE_APP_LOGIN_USER_FIELD=email           # Username field name
VUE_APP_LOGIN_PASS_FIELD=password        # Password field name
VUE_APP_LOGIN_TOKEN_PATH=token           # Dot-path to token in response body
VUE_APP_LOGIN_TOKEN_HEADER=token         # Request header name for JWT
VUE_APP_LOGGED_URL=                      # GET endpoint to verify session
VUE_APP_DEFAULT_HEADERS=                 # JSON string of default headers
VUE_APP_LOGIN_TOKEN_MODE=header          # "header" or "query"
VUE_APP_LOGIN_TOKEN_HEADER_EXPRESSION={token}  # Token interpolation template
```

## Directory Structure

```
pluggable-dashboard/
├── public/
│   ├── examples/           # Example project JSON configs (used in demo)
│   ├── img/                # Static image assets
│   ├── index.html          # HTML entry point (PWA setup)
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
├── src/
│   ├── main.js             # Vue bootstrap, plugin registration
│   ├── App.vue             # Root component, auth check on mount
│   ├── store.js            # Vuex store (projects, auth, UI, cache, schemas)
│   ├── router/index.js     # Route definitions
│   ├── assets/             # SCSS styles and icon definitions
│   ├── containers/         # Layout shell (TheContainer, TheHeader, TheSidebar, TheFooter)
│   ├── libs/               # Extended library code (vue-formulate-extended)
│   ├── plugins/
│   │   └── DashPlugin.js   # Global $message() and $modal() methods
│   ├── services/
│   │   ├── models.js       # Axios CRUD functions (getData, saveData, deleteData, etc.)
│   │   ├── helpers.js      # Utilities: interpolate, queryString, formatDate, localStorage
│   │   ├── actions.mixin.js    # Mixin: form action handlers
│   │   ├── auth.mixin.js       # Mixin: authentication lifecycle
│   │   ├── controller.mixin.js # Mixin: project/schema loading
│   │   ├── input.mixin.js      # Mixin: custom input base logic
│   │   ├── session.mixin.js    # Mixin: per-project session handling
│   │   ├── table.mixin.js      # Mixin: table data fetching and pagination
│   │   └── widget.mixin.js     # Mixin: dashboard widget data
│   └── views/
│       ├── Dashboard.vue       # Main dashboard with widgets
│       ├── crud/               # Core CRUD engine
│       │   ├── base.vue        # Route entry: loads project + schema
│       │   ├── crud.vue        # Orchestrates table + form
│       │   ├── table.vue       # Data grid with pagination, sort, filter
│       │   ├── form.vue        # Record create/edit form
│       │   ├── formulate.vue   # Vue Formulate renderer
│       │   └── auth.vue        # Per-project login gate
│       ├── charts/             # Chart components
│       ├── pages/              # Auth pages (Login, Register, 404, 500)
│       ├── users/              # Dashboard user management
│       ├── settings/           # App settings and user profile
│       ├── theme/              # UI playground and component docs
│       └── widgets/            # Dashboard widget components
└── tests/
    ├── unit/               # Jest unit tests
    └── e2e/                # Nightwatch e2e tests
```

## Key Architectural Concepts

### Projects Config File

The `VUE_APP_DATABASE` env var points to a JSON array that defines all connected API projects. The default is `public/examples/projects.json`.

```json
[
  {
    "code": "myproject",          // URL slug, used in routing
    "name": "My Project",         // Display name
    "url": "https://api.example.com",
    "resources_path": "/models/", // Base path for schema JSON files
    "resources": {
      "users": {
        "resource": "users_schema.json",  // Schema file under resources_path
        "label": "Users"
      }
    },
    "auth": {                     // Optional: per-project auth
      "url_login": "https://api.example.com/login",
      "url_method": "post",
      "field_username": "email",
      "field_secret": "password",
      "response_mode": "body",
      "response_token": "token",
      "request_mode": "header",
      "request_token": "access-token",
      "request_token_expression": "Bearer {token}",
      "logged_url": "https://api.example.com/me",
      "logged_model": { "id": "_id", "name": "fullname", "username": "email", "role": "level" }
    }
  }
]
```

### CRUD Schema

Each resource is described by a schema JSON file. This drives both the table columns and the form inputs.

```json
{
  "type": "object",
  "title": "Users",
  "domain": "users",         // URL slug
  "primaryKey": "id",        // Default "id"
  "properties": [
    {
      "name": "id",
      "label": "ID",
      "config": { "grid": true, "sort": 0 }
    },
    {
      "name": "name",
      "label": "Name",
      "type": "text",
      "config": { "grid": true }
    },
    {
      "name": "bio",
      "label": "About",
      "type": "textarea"      // Vue Formulate input types
    }
  ],
  "api": {
    "rootApi": "https://api.example.com/users",
    "wrapData": "rows",             // Response field containing array
    "totalData": "count",           // Response field containing total count
    "pagination": {
      "pageField": "page",
      "limitField": "limit",
      "sortField": "order",
      "sortExp": "{sort}",
      "filterField": "filter",
      "filterExp": "{prop},like,%{value}%"
    },
    "params": { "limit": 15 },      // Fixed query params
    "headers": { "app-key": "..." } // Fixed headers
  }
}
```

### Available Form Input Types

Beyond standard Vue Formulate inputs (text, textarea, select, checkbox, radio), the project includes custom types:

| Type | Description |
|---|---|
| `autocomplete` | Search-as-you-type with remote data |
| `code` | Code editor with syntax highlighting (PrismJS) |
| `dynamic-select` | Select populated from API call |
| `grid` | Nested data grid inside a form field |
| `image` | Image upload field |
| `image-text` | Combined image + text field |
| `json` | Full JSON editor (v-jsoneditor) |
| `object` | Nested object editor |
| `select` | Enhanced select with remote options |
| `switch` | Toggle/boolean input |
| `tags` | Multi-tag input |
| `wysiwyg` | Rich text editor (Quill) |
| `form` | Nested form |
| `belongsto` | Relational field linking to another resource |

### Routing

```
/dashboard                    → Dashboard.vue
/api/:project/:model          → crud/base.vue (loads schema, renders CRUD)
/theme/playground             → UI component playground
/theme/docs                   → Input type documentation
/users                        → Local user management
/settings                     → App settings
/pages/login                  → Login screen
/pages/register               → Register screen
```

### Vuex Store State

```js
{
  sidebarShow: 'responsive',  // UI sidebar state
  sidebarMinimize: false,
  projects: [],               // Loaded from VUE_APP_DATABASE
  currentProject: {},         // Active project config
  auth: {},                   // { dash: { isLogged, token, user } }
  loading: {},                // Keyed loading indicators
  cache: {},                  // Response cache references
  crud: {},                   // Active CRUD data
  schemas: {}                 // Loaded schema cache
}
```

Key mutations: `set([variable, value])`, `setAuth([session, value])`, `setSchema([key, value])`, `setLoader([key, value])`

Key actions: `login`, `isLogged`, `logout`, `requestFail`, `notification`

### Global Plugin Methods (DashPlugin)

Available on all Vue instances:

```js
this.$message(html, type='info', timeout=3)  // Toast notification
this.$modal(html)                             // Modal overlay
this.$bus.$emit('event', data)               // Global event bus
this.$log(...)                               // console.log alias
```

### HTTP Layer (src/services/models.js)

All API calls go through `axios-cache-adapter`. Cache is 1 hour; disabled in local env. GET calls are cached; PUT, PATCH, DELETE are excluded from cache.

Key exported functions:
- `getData(model, data, config)` — fetch list or single record
- `getDataObject(model, data, config)` — fetch as plain object
- `saveData(model, data, config)` — POST (new) or PUT/PATCH (existing, by primaryKey)
- `deleteData(model, data, config)` — DELETE by primaryKey
- `loadModel(url, options)` — load a schema JSON file
- `loadProjects(opts)` — load VUE_APP_DATABASE
- `request(query, options, config)` — raw axios wrapper with auth header injection
- `getAuthHeaders(project, token)` — builds auth headers/params for a project

URL interpolation uses `{placeholder}` syntax (from `helpers.js#interpolate`).

## Code Conventions

- Vue 2 Options API throughout (no Vue 3 Composition API patterns, though `@vue/composition-api` is installed)
- SCSS in `src/assets/` — component-level styles inline with `<style scoped>`
- Mixins over composables for shared logic; all mixins live in `src/services/`
- `lodash` (get, set, has, isNil, isEmpty) used for safe object access in services
- `@` alias maps to `src/`
- No TypeScript — plain ES6+

## Testing

```bash
npm run test:unit   # Jest, config in jest.config.js
npm run test:e2e    # Nightwatch, tests in tests/e2e/
```

Jest transforms: Vue SFC via `vue-jest`, JS via `babel-jest`. Module alias `@` → `<rootDir>/src`.

## Vercel API Functions

Serverless functions ficam em `api/`. São chamadas internamente — não acessíveis diretamente no navegador pois exigem o header `x-internal-secret`.

### `GET /api/datetime`

Retorna data e hora do servidor.

**Header obrigatório:**
```
x-internal-secret: <valor de API_SECRET no Vercel>
```

**Resposta:**
```json
{
  "date": "2024-01-15",
  "time": "14:32:00",
  "timestamp": "2024-01-15T14:32:00.000Z",
  "timezone": "America/Sao_Paulo"
}
```

**Como chamar no frontend (Vue):**
```js
const { data } = await axios.get('/api/datetime', {
  headers: { 'x-internal-secret': process.env.VUE_APP_API_SECRET }
})
```

**Configurar no Vercel:** adicione a variável de ambiente `API_SECRET` com um valor aleatório seguro (ex.: `openssl rand -hex 32`). Adicione `VUE_APP_API_SECRET` com o mesmo valor para o frontend poder chamar.

Sem o header correto: `401 Unauthorized`.

## Common Tasks

**Add a new custom form input:**
1. Create component in `src/views/crud/` (follow existing input patterns)
2. Register in the VueFormulate config (check `src/plugins/` or `src/libs/`)
3. Document the new type name in the schema

**Add a new project:**
Edit `public/examples/projects.json` (or your configured `VUE_APP_DATABASE` file) and add a project object with `code`, `name`, `url`, and `resources`.

**Add a new resource to a project:**
Add a schema JSON file and register it in the project's `resources` object.

**Add a new route:**
Edit `src/router/index.js` and create the corresponding view in `src/views/`.

**Add a new Vuex state property:**
Add to `state` in `src/store.js` and use the `set` mutation: `this.$store.commit('set', ['propertyName', value])`.
