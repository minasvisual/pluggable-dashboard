@echo off
echo 🚀 Configurando Pluggable Dashboard...

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não está instalado. Por favor, instale o Node.js ^>= 18.0.0
    pause
    exit /b 1
)

REM Verificar se o Yarn está instalado
yarn --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Yarn não está instalado. Por favor, instale o Yarn ^>= 1.22.0
    pause
    exit /b 1
)

echo ✅ Node.js e Yarn verificados

REM Remover node_modules e yarn.lock se existirem
if exist node_modules (
    echo 🗑️  Removendo node_modules...
    rmdir /s /q node_modules
)

if exist yarn.lock (
    echo 🗑️  Removendo yarn.lock...
    del yarn.lock
)

REM Instalar dependências
echo 📦 Instalando dependências...
yarn install

REM Copiar arquivo de ambiente se não existir
if not exist .env (
    echo 📝 Copiando arquivo de ambiente...
    copy env.example .env
    echo ✅ Arquivo .env criado. Configure as variáveis conforme necessário.
)

echo ✅ Setup concluído!
echo.
echo Para iniciar o projeto:
echo   yarn dev
echo.
echo Para build de produção:
echo   yarn build
pause
