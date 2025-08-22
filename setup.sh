#!/bin/bash

echo "🚀 Configurando Pluggable Dashboard..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js >= 18.0.0"
    exit 1
fi

# Verificar se o Yarn está instalado
if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn não está instalado. Por favor, instale o Yarn >= 1.22.0"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão $NODE_VERSION detectada. É necessário Node.js >= 18.0.0"
    exit 1
fi

echo "✅ Node.js e Yarn verificados"

# Remover node_modules e yarn.lock se existirem
if [ -d "node_modules" ]; then
    echo "🗑️  Removendo node_modules..."
    rm -rf node_modules
fi

if [ -f "yarn.lock" ]; then
    echo "🗑️  Removendo yarn.lock..."
    rm -f yarn.lock
fi

# Instalar dependências
echo "📦 Instalando dependências..."
yarn install

# Copiar arquivo de ambiente se não existir
if [ ! -f ".env" ]; then
    echo "📝 Copiando arquivo de ambiente..."
    cp env.example .env
    echo "✅ Arquivo .env criado. Configure as variáveis conforme necessário."
fi

echo "✅ Setup concluído!"
echo ""
echo "Para iniciar o projeto:"
echo "  yarn dev"
echo ""
echo "Para build de produção:"
echo "  yarn build"
