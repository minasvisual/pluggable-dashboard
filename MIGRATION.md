# Migração para Node 22 e Vue 2.7

Este documento descreve as mudanças realizadas para tornar o projeto compatível com Node 22 e Vue 2.7.

## Principais Mudanças

### 1. Atualização do Package Manager
- **Antes**: npm
- **Depois**: yarn
- **Motivo**: Melhor performance e gerenciamento de dependências

### 2. Atualizações de Dependências

#### Dependências Principais
| Pacote | Versão Anterior | Versão Nova | Motivo |
|--------|----------------|-------------|---------|
| Vue | 2.6.11 | 2.7.16 | Melhor compatibilidade com Node 22 |
| @coreui/vue | 3.0.12 | 4.11.1 | Versão mais recente e estável |
| @coreui/coreui | 3.0.0 | 4.2.6 | Compatibilidade com Vue 2.7 |
| @vue/cli-service | 4.4.1 | 5.0.8 | Suporte a Node 22 |
| axios | 0.21.1 | 1.6.2 | Correções de segurança |

#### Dependências de Desenvolvimento
| Pacote | Versão Anterior | Versão Nova | Motivo |
|--------|----------------|-------------|---------|
| @babel/core | 7.10.2 | 7.23.6 | Compatibilidade com Node 22 |
| eslint | 6.8.0 | 8.56.0 | Melhor suporte a ES2020+ |
| sass | N/A | 1.69.5 | Substituição do node-sass |
| babel-eslint | 10.1.0 | @babel/eslint-parser 7.23.3 | Parser atualizado |

### 3. Configurações Atualizadas

#### Babel
- **Arquivo**: `.babelrc` → `babel.config.js`
- **Configuração**: Adicionado suporte a `useBuiltIns: 'entry'` e `corejs: 3`

#### ESLint
- **Parser**: `babel-eslint` → `@babel/eslint-parser`
- **Configuração**: Adicionado `requireConfigFile: false` e `ecmaVersion: 2020`

#### Jest
- **Sintaxe**: ES modules → CommonJS
- **Configuração**: Adicionado `testEnvironment: 'jsdom'`

#### Vue CLI
- **Transpilation**: Adicionadas dependências CoreUI para transpilação
- **Sass**: Configurado com variáveis globais

### 4. Arquivos de Configuração

#### Novos Arquivos
- `.yarnrc.yml` - Configuração do Yarn
- `babel.config.js` - Configuração do Babel
- `setup.sh` - Script de setup para Linux/Mac
- `setup.bat` - Script de setup para Windows
- `env.example` - Exemplo de variáveis de ambiente
- `MIGRATION.md` - Este arquivo

#### Arquivos Removidos
- `.babelrc` - Substituído por `babel.config.js`
- `package-lock.json` - Removido para usar Yarn

#### Arquivos Atualizados
- `package.json` - Dependências e scripts atualizados
- `vue.config.js` - Configurações de transpilação e Sass
- `jest.config.js` - Sintaxe CommonJS
- `.eslintrc.js` - Parser atualizado
- `.gitignore` - Adicionados arquivos do Yarn
- `README.md` - Documentação atualizada

## Como Migrar

### 1. Instalação Limpa
```bash
# Remover dependências antigas
rm -rf node_modules
rm package-lock.json

# Instalar Yarn (se não estiver instalado)
npm install -g yarn

# Instalar dependências
yarn install
```

### 2. Usando Scripts de Setup
```bash
# Linux/Mac
chmod +x setup.sh
./setup.sh

# Windows
setup.bat
```

### 3. Configuração de Ambiente
```bash
# Copiar arquivo de ambiente
cp env.example .env

# Editar configurações conforme necessário
nano .env
```

## Compatibilidade

### Node.js
- **Versão Mínima**: 18.0.0
- **Versão Recomendada**: 22.x
- **Testado em**: Node 22.0.0

### Navegadores
- **Suporte**: IE 11+ (atualizado de IE 9+)
- **Browserslist**: Atualizado para suportar navegadores mais recentes

### Yarn
- **Versão Mínima**: 1.22.0
- **Versão Recomendada**: 1.22.19

## Problemas Conhecidos

### 1. CoreUI 4
- Alguns componentes podem ter mudanças na API
- Verificar documentação para migrações específicas

### 2. Vue 2.7
- Mantém compatibilidade com Vue 2.6
- Adiciona suporte a Composition API nativo

### 3. Sass
- Substituição do `node-sass` por `sass` (Dart Sass)
- Melhor performance e compatibilidade

## Testes

Após a migração, execute os testes para verificar a compatibilidade:

```bash
# Testes unitários
yarn test:unit

# Testes end-to-end
yarn test:e2e

# Linter
yarn lint

# Build de produção
yarn build
```

## Rollback

Se necessário, você pode fazer rollback para a versão anterior:

1. Restaurar `package.json` anterior
2. Restaurar arquivos de configuração
3. Executar `npm install`
4. Remover arquivos do Yarn

## Suporte

Para problemas relacionados à migração:
1. Verificar logs de erro
2. Consultar documentação das dependências atualizadas
3. Abrir issue no repositório
