# Nexum — regras permanentes do frontend

- O design é cópia fiel do Figma. Nunca invente cor, tamanho, espaçamento, raio ou texto. Use só os valores passados nos prompts.
- Mobile-first: o CSS base reproduz o frame mobile de 390px. Desktop a partir de `@media (min-width:1024px)`, reproduzindo o frame de 1440px.
- A "status bar" (9:41, sinal, bateria) dos frames mobile é só mockup do Figma. NUNCA renderizar.
- Todas as cores vêm de variáveis CSS em `styles/base/tokens.css`. Tema escuro via `[data-theme="dark"]` no `<html>`.
- Fonte Inter. Poppins só onde o prompt mandar.
- JS da API fica em `js/api.js`. Não altere a lógica dele.
