# Pluggable Dashboard

Um dashboard plugável e conectável às suas APIs, construído com Vue 2.7 e CoreUI.

## Requisitos

- Node.js >= 18.0.0
- Yarn >= 1.22.0

## Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd pluggable-dashboard
```

2. Instale as dependências usando Yarn:
```bash
yarn install
```

3. Execute o projeto em modo de desenvolvimento:
```bash
yarn dev
```

O projeto estará disponível em `http://localhost:3000`

## Scripts Disponíveis

- `yarn dev` - Inicia o servidor de desenvolvimento na porta 3000
- `yarn serve` - Inicia o servidor de desenvolvimento na porta padrão (8080)
- `yarn build` - Constrói o projeto para produção
- `yarn build:prod` - Constrói o projeto para produção com otimizações
- `yarn lint` - Executa o linter
- `yarn test:unit` - Executa os testes unitários
- `yarn test:e2e` - Executa os testes end-to-end

## Tecnologias Utilizadas

- **Vue.js 2.7** - Framework JavaScript progressivo
- **CoreUI 4** - Biblioteca de componentes UI
- **Vue Router 3** - Roteamento oficial do Vue
- **Vuex 3** - Gerenciamento de estado
- **Vue Formulate** - Sistema de formulários
- **Axios** - Cliente HTTP
- **Sass** - Pré-processador CSS

## Estrutura do Projeto

```
src/
├── assets/          # Recursos estáticos (CSS, imagens, ícones)
├── components/      # Componentes Vue reutilizáveis
├── containers/      # Componentes de layout
├── libs/           # Bibliotecas e utilitários
├── plugins/        # Plugins Vue
├── router/         # Configuração de rotas
├── services/       # Serviços e mixins
├── stores/         # Configuração do Vuex
├── views/          # Páginas e componentes de visualização
├── App.vue         # Componente raiz
└── main.js         # Ponto de entrada da aplicação
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VUE_APP_API_URL=http://localhost:8080/api
VUE_APP_TITLE=Pluggable Dashboard
```

### Configuração do Vue CLI

O projeto usa Vue CLI 5 com as seguintes configurações principais:

- **Runtime Compiler**: Habilitado para compilação dinâmica de templates
- **Sass**: Configurado com variáveis globais
- **Transpilation**: Dependências CoreUI configuradas para transpilação

## Desenvolvimento

### Adicionando Novos Componentes

1. Crie o componente em `src/components/`
2. Importe e registre no arquivo apropriado
3. Use o componente em seus templates

### Adicionando Novas Páginas

1. Crie a página em `src/views/`
2. Adicione a rota em `src/router/index.js`
3. Configure o menu se necessário

### Estilização

O projeto usa Sass com variáveis globais definidas em `src/assets/scss/_variables.scss`.

## Build para Produção

```bash
yarn build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## Testes

### Testes Unitários
```bash
yarn test:unit
```

### Testes End-to-End
```bash
yarn test:e2e
```

## Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Suporte

Para suporte, entre em contato através do GitHub ou abra uma issue.
  
