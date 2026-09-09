# GEAPI-SMV

Aplicação web simples e institucional desenvolvida para facilitar a confecção de **Solicitações de Manutenção de Vias (SMV)** da Gerência de Apoio à Infraestrutura (GEAPI - PBH).

---

## 🎯 Objetivo

O **GEAPI-SMV** foi concebido exclusivamente como uma ferramenta utilitária de tela única para auxiliar no preenchimento rápido e padronizado dos formulários de SMV.

> **Importante:** Este sistema **NÃO** é um sistema de gestão. Não possui cadastro de solicitações, histórico, banco de dados ou autenticação.

---

## 🛠️ Funcionamento

- **Tela Única:** Fluxo direto em uma página com navegação por teclado (TAB) e autocompletar em campos de seleção.
- **Transformação Automática:** Todos os textos digitados são convertidos automaticamente para **CAIXA ALTA**.
- **Regras Institucionais:**
  - **Prefixos Automáticos:** `PODA` e `SINALIZAÇÃO VERTICAL` utilizam prefixo `23V`. `SINALIZAÇÃO HORIZONTAL` utiliza prefixo `23H`.
  - **Número Central:** Preenchido pelo usuário com exatamente 6 dígitos numéricos (ex.: `23V-000053/2026`).
  - **Encaminhamento Automático:**
    - `PODA` / `SINALIZAÇÃO VERTICAL` &rarr; `WILLIAM DOUGLAS ALVIM - GESIN`
    - `SINALIZAÇÃO HORIZONTAL` &rarr; `CARLOS HENRIQUE SANTANA - GESIN`
  - **Matrículas Institucionais:** Exibidas no formato `BT` + 5 dígitos (ex.: `BT01748`).
- **Registro Fotográfico:** Suporta de 1 a 2 fotografias com preview, substituição e remoção.

---

## 🔒 Ausência de Armazenamento e Privacidade

- **Zero Banco de Dados:** Nenhuma informação preenchida no formulário é enviada para servidores externos ou gravada em bancos de dados.
- **Sessão Temporária na Memória:** As fotos e textos permanecem temporariamente na memória do navegador (`File` e `Object URL`) durante a confecção.
- **Revogação de URLs:** Ao remover ou substituir uma fotografia, os recursos da memória são liberados imediatamente no navegador.
- **Modal de Aviso:** Exibido uma vez por sessão armazenando unicamente a confirmação do usuário em `sessionStorage`.

---

## 💻 Execução Local

Para executar o projeto localmente:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:3000`

3. **Verificação de tipos:**
   ```bash
   npm run lint
   ```

---

## 🚀 Publicação no GitHub e Vercel

O projeto foi construído para ser totalmente compatível com versionamento no GitHub e deploy simples na Vercel:

1. **GitHub:** Suba os arquivos para seu repositório no GitHub.
2. **Vercel:** Importe o repositório na Vercel selecionando a configuração padrão para projetos React/Vite/Next.
