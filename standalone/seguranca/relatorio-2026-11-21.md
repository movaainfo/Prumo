# Relatório de segurança — 21/11/2026 (ataque inicial, v3.62)

Primeiro ataque controlado ao Prumo, antes de existir o ataque semanal. Serve de base: as semanas seguintes não repetem estas técnicas sem as variar.

## Técnicas usadas
- **XSS guardado em massa**: código malicioso (4 formas: `<img onerror>`, quebra de atributo com `"` e `'`, fecho de `textarea/style/script`, `javascript:` em campos de endereço) em 1068 campos de 86 listas e no perfil; 188 páginas abertas. Resultado: nada correu nem entrou no ecrã.
- **Contas**: 10 senhas erradas seguidas (conta trancada 15 min, nem a certa entra); 32 logins do mesmo endereço (travão aos 30); robô no registo (campo escondido); e-mail com HTML no registo.
- **Autorização/IDOR**: token forjado (troca do utilizador no conteúdo assinado) → 401; conta A a ler e a gravar dados da conta B → 404.
- **Origens**: pedidos de `prumo-falso.vercel.app` e de outro site → 403 (antes, qualquer `prumo-*.vercel.app` passava).
- **SSRF no leitor de notícias**: 127.0.0.1, 169.254.169.254, `localhost:9001`, `[::1]`, IP decimal e hexadecimal, `*.nip.io`, `localtest.me`, utilizador:senha no endereço, `ftp:`, `file:`, porta 22 → tudo recusado. Corrigido o "DNS rebinding" (agora a ligação usa só o endereço verificado).
- **Custos**: línguas inventadas para gastar a IA (agora só as da lista e com sessão válida e plano); contas de teste sem confirmar o e-mail já não usam a IA e têm limite de criação; minutos de uso com teto diário.
- **Segredos**: varrimento do front-end publicado e do histórico git dos dois ramos (chaves Google, Stripe, Anthropic, OpenAI, GitHub, Brevo, Resend, Vercel Blob, Google OAuth, chaves privadas, JWT) → nenhum segredo real (só uma chave falsa dos testes).
- **Cadeia de fornecimento**: sem dependências npm; o único script de fora (Pluggy Connect v2.10.0) passou a ter SRI.
- **IA**: regra contra ordens escondidas em e-mails, páginas e ficheiros; apagar pede sempre confirmação; e-mails só em rascunho.
- **Ao vivo (produção)**: origem falsa 403, SSRF recusado, língua inventada 400, cópia de segurança sem chave 403, token forjado 401; cabeçalhos HSTS, CSP, X-Frame-Options, nosniff e Referrer-Policy presentes.

## Defesas novas na 3.62
Registo de eventos `SEC` (IP em código diário), cópia de segurança diária (7 dias) e semanal (5 semanas), manutenção semanal (domingo 04:00–05:30 Lisboa, só a administração entra, contagem flutuante para o Ryan, atalho de gastos em fila), Termos e Privacidade atualizados.

## Limites conhecidos (para as próximas semanas)
- Os travões de pedidos são por instância do servidor (memória): um atacante distribuído pode passar mais pedidos. O bloqueio por conta (senhas erradas) é guardado e vale em todas as instâncias.
- A sessão vive no armazenamento do navegador (não em cookie HttpOnly): protegida pelo escape do conteúdo (testado), mas um XSS futuro poderia lê-la.
- A CSP permite `unsafe-inline` nos scripts (a app é um ficheiro único com scripts embutidos).
- Os pontos do ranking são calculados no aparelho (dá para fazer batota no próprio ranking).
- Sem quota de armazenamento por conta.

## O que o Ryan pode fazer
- Na Vercel › Firewall, ligar a proteção contra robôs (Bot Protection) gerida pela Vercel.
