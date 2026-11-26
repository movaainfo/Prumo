# Pôr o Prumo na Play Store e na App Store

O Prumo continua a ser o site (prumo-vida.vercel.app). As apps das lojas são "cascas" que abrem esse site em ecrã inteiro, com ícone, nome e arranque próprios. Cada atualização publicada no site chega logo às apps, sem enviar versões novas às lojas (só é preciso enviar uma versão nova quando mudar o ícone, o nome ou as permissões).

## O que já está pronto (no código)
- **Manifesto completo** (`manifest.webmanifest`): id, nome, descrição, ícones normais e "maskable", cores, orientação, categorias.
- **Modo loja** (`js/loja.js`): dentro das apps das lojas não aparecem preços, botões de compra, cupões nem o portal de pagamento. Quem já tem plano usa tudo. Testar no navegador: `https://prumo-vida.vercel.app/?loja=android` (desligar: `?loja=nao`).
- **Apagar a conta**: dentro da app (Conta → Apagar a conta) e na página pública `/apagar-conta`, que a Play Store pede.
- **Privacidade e Termos** públicos: `/privacidade` e `/termos`.
- **Ícones e imagem de destaque**: `lojas/imagens/`.
- **Textos da ficha, respostas de "Segurança dos dados" e classificação**: `lojas/textos-loja.md`.
- **Configurações das cascas**: `lojas/android/twa-manifest.json` (Android) e `lojas/ios/capacitor.config.json` (iPhone).
- **Ligação site ↔ app Android**: quando existir `lojas/android/assetlinks.json`, o site publica-o sozinho em `/.well-known/assetlinks.json`.

## Antes de tudo: pagamentos dentro das apps (importante)
- **Google Play:** a app pode ser publicada **sem compras** (como está agora, no modo loja). Para vender planos *dentro* da app Android é obrigatório usar a faturação do Google Play (comissão de 15% nas assinaturas). Não se pode pôr na app botões ou links para pagar no site.
- **App Store (Apple):** a Apple é mais rígida. Uma app cujos planos se compram noutro sítio tem de oferecer **também** a compra dentro da app (regra 3.1.3(b)). Na prática, para a Apple aceitar o Prumo com planos pagos é preciso ligar as compras da Apple (In-App Purchase, comissão de 15% no Small Business Program). A forma mais simples de o fazer depois é com o **RevenueCat**, que junta Stripe, Google e Apple numa só lista de assinantes.
- **Apple, regra 4.2:** a Apple recusa apps que sejam "só um site dentro de uma app". O Prumo tem argumentos (funciona sem rede, notificações, atalhos, conta própria), mas o risco existe. Se for recusado, o caminho é juntar funções nativas (notificações nativas, widgets, Face ID) na casca do iPhone.
- **Compras dentro das apps com o RevenueCat (já preparado no servidor, v3.70):** quando quiseres vender planos dentro das apps, usa o RevenueCat (junta a faturação do Google e da Apple num só sítio). O servidor do Prumo já recebe os avisos do RevenueCat em `https://prumo-vida.vercel.app/api/revenuecat` e dá o plano à conta certa, confirmando sempre no RevenueCat. Na casca nativa (Capacitor), depois de a pessoa entrar na conta Prumo, faz `Purchases.logIn(await window.PrumoLoja.rcId())`: esse id ("p_" + um código da conta) liga a compra à conta sem passar o e-mail ao RevenueCat. Os entitlements têm de se chamar `essencial`, `avancado` e `completo`. O passo a passo das chaves está em Administração › Ajustes › Integrações opcionais.
- **Recomendação:** começar pela **Play Store** (mais barata, mais rápida, aceita o modo loja como está). Fazer a App Store quando houver faturação da Apple.

## Play Store (Android) — passo a passo
1. **Conta de programador Google Play** em play.google.com/console: 25 USD, pagos uma vez. Pede documento de identificação. Conta pessoal serve; quando a empresa existir, pode-se transferir a app.
2. **Gerar a app Android** em **pwabuilder.com**:
   - Escreve `https://prumo-vida.vercel.app` → Start → **Package for stores** → **Android** → Generate.
   - Em "Package ID" põe `pt.prumo.app`; nome "Prumo"; **Start URL: `/?loja=android#visao`** (é isto que liga o modo loja sem compras); o resto vem do manifesto (ou usa os valores de `lojas/android/twa-manifest.json`).
   - Signing key: **Create new**. Descarrega o .zip. Lá dentro há o ficheiro `.aab` (é o que vai para a Play), a chave de assinatura (`.keystore`) com as senhas, e um `assetlinks.json`.
   - **Guarda a chave e as senhas num sítio seguro** (por exemplo, no cofre do Prumo e numa cópia offline). Sem elas não dá para publicar atualizações da casca. Nunca as envies no chat.
3. **Criar a app** na Play Console: nome Prumo, idioma pt-PT, app gratuita.
4. **Ficha da loja**: copia os textos de `lojas/textos-loja.md`; ícone `icone-512.png`; destaque `play-destaque-1024x500.png`; capturas de ecrã do telemóvel (mínimo 2; ver "Capturas" abaixo).
5. **Conteúdo da app** (menu "Política"): Política de privacidade `https://prumo-vida.vercel.app/privacidade`; Apagar conta `https://prumo-vida.vercel.app/apagar-conta`; Segurança dos dados e Classificação de conteúdo com as respostas de `lojas/textos-loja.md`; Público-alvo: 16+; Anúncios: não; Apps de saúde: bem-estar e forma física.
6. **Ligação site ↔ app**: na Play Console, em **Testar e lançar → Configuração → Integridade da app → Assinatura de apps**, copia a **impressão digital SHA-256** da "chave de assinatura de apps" (e também a da "chave de carregamento"). Manda-me as duas impressões digitais ou o `assetlinks.json` do PWABuilder: não são segredos, são públicas. Eu ponho em `lojas/android/assetlinks.json`, publico, e a app deixa de mostrar a barra de endereço do navegador.
7. **Teste fechado (obrigatório para contas pessoais novas):** antes de publicar para todos, o Google exige um teste fechado com pelo menos **12 testadores durante 14 dias seguidos**. Carrega o `.aab` em "Teste fechado", junta 12 e-mails de amigos/família (contas Google), e cada um instala pela ligação de teste e mantém a app.
8. Passados os 14 dias: **Pedir acesso à produção** → responder às perguntas → **Produção → Criar versão** com o mesmo `.aab` → enviar para revisão (normalmente de 1 a 7 dias).

## Galeria automática na app do iPhone (v3.86)
O Safari e o Prumo no ecrã principal não podem ler a galeria sozinhos (a Apple não deixa). A app da App Store pode: o código do Prumo (`js/galeria.js`) já está pronto e liga-se sozinho quando a casca tem o plugin da galeria. Ao abrir e ao voltar à app, as fotos novas entram nas Fotos do Prumo (na primeira vez, as 300 mais recentes) e há o botão "Galeria toda".
1. No projeto da casca (Capacitor 8), instalar o plugin: `npm install @capacitor-community/media` e depois `npx cap sync ios`. (Para Capacitor 7: `@capacitor-community/media@8`.)
2. No `ios/App/App/Info.plist`, juntar a chave `NSPhotoLibraryUsageDescription` com o texto: "O Prumo lê as fotos novas da tua galeria para as arrumar (iguais, desfocadas, capturas e categorias). As fotos ficam só neste aparelho."
3. Compilar e enviar como de costume. Na primeira vez que a pessoa abre as Fotos, o iPhone pergunta se deixa o Prumo ver as fotos; com "Todas as fotos" fica automático, com "Fotos limitadas" só entram as escolhidas.
4. No Android a app é a da Play Store (TWA): lá as fotos entram pela partilha da Galeria para o Prumo, que já funciona.

## App Store (iPhone) — passo a passo
1. **Apple Developer Program** em developer.apple.com/programs: 99 USD por ano. Como pessoa singular, o nome que aparece na loja é o teu; como empresa, precisa do número D-U-N-S.
2. **Gerar o projeto iPhone**: no pwabuilder.com → **iOS** → Generate (ou com Capacitor, usando `lojas/ios/capacitor.config.json`). Ambos dão um projeto do **Xcode**.
3. **Compilar e enviar**: o Xcode só corre em **Mac**. Sem Mac, há serviços de compilação na nuvem (por exemplo Codemagic, com plano gratuito) que compilam e enviam para a App Store a partir do projeto.
4. No **App Store Connect**: criar a app com o Bundle ID `pt.prumo.app`; textos de `lojas/textos-loja.md`; ícone `icone-1024.png`; capturas de 6,9" (1320×2868) e, se a app for também para iPad, de 13" (2064×2752).
5. **Privacidade da app** ("Rótulos de privacidade"): as mesmas respostas da Play (`lojas/textos-loja.md`). URL de privacidade: `/privacidade`.
6. **Conta de demonstração para a revisão**: a Apple pede uma conta para entrar. Cria uma conta normal (não `@nautilo.test`, que é apagada sozinha) com dados de exemplo e põe o e-mail e a senha no campo "Sign-in information" do App Store Connect (não no chat).
7. **Compras**: ver a secção de pagamentos acima. Sem In-App Purchase, a Apple deverá recusar enquanto os planos pagos existirem.

## Capturas de ecrã (já feitas)
Estão em `lojas/capturas/`, tiradas da conta de demonstração (pessoa fictícia, sem dados teus):
- `ios69-*.png` — iPhone 6,9" (1320×2868), para a App Store.
- `play-*.png` — telemóvel Android (1080×1920), para a Play Store.
- `ipad13-*.png` — iPad 13" (2064×2752), se publicares também para iPad.
- Vídeo vertical do tutorial (para a ficha da loja ou redes sociais): `lojas/videos/tutorial-vertical.mp4`.

- Play: no mínimo 2 capturas de telemóvel (ao alto, por exemplo 1080×1920 ou maiores). Recomendado: 4 a 8.
- Apple: iPhone 6,9" (1320×2868), obrigatório; iPad 13" só se a app for para iPad.
- Sugestão: usar uma conta de exemplo (não a tua, para não mostrar dados pessoais) e capturar Início, Execução (tarefas e rotina), Dinheiro, Corpo, Dominus e Spyke.

## Depois de publicadas
- As atualizações do site chegam às apps sozinhas.
- Enviar versão nova da casca só quando mudar o ícone, o nome, o ID ou as permissões, ou quando a loja pedir (por exemplo, nova versão mínima do Android).
- Se a chave de assinatura Android se perder: com a "Assinatura de apps do Google Play" ligada, pede-se ao Google para trocar a chave de carregamento.
