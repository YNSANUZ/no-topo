# No Topo — Pagamentos e domínio do telão

## Objetivo

Transformar o lance demonstrativo do No Topo em uma compra real. Um pagamento aprovado que supere o primeiro lugar coloca imediatamente a publicação do comprador no telão, respeitando um período mínimo de exposição e um ciclo diário de preços.

## Regras do produto

- O ciclo reinicia todos os dias à meia-noite no fuso `America/Sao_Paulo`.
- O primeiro lance de cada ciclo parte de um valor-base configurável; inicialmente, R$ 20,00.
- Depois do primeiro pagamento aprovado, todo novo lance deve superar o maior valor aprovado em pelo menos R$ 20,00.
- Um vencedor aprovado recebe dez minutos de exposição protegida. Durante esse período, o backend não cria novos pagamentos para ultrapassá-lo.
- Encerrada a proteção, um pagamento maior pode assumir o telão imediatamente.
- O vencedor anterior passa para o segundo lugar e o antigo segundo passa para o terceiro. Os demais continuam no histórico público do ciclo.
- À meia-noite, primeiro, segundo e terceiro lugares são arquivados no histórico; o valor volta à base e começa um novo ciclo.
- Somente a confirmação do Mercado Pago, verificada pelo backend, altera o ranking. O retorno do navegador nunca é suficiente.

## Arquitetura

O frontend permanece estático no GitHub Pages, em `nexo.yt`. Ele consumirá uma API dedicada ao No Topo hospedada no mesmo servidor PHP usado pelo Ursoninhos. A integração reutilizará a conta, a Public Key, o Access Token, o cliente HTTP, a validação de assinatura e o padrão de webhook já existentes, mas terá endpoints, banco de dados e identificadores de pedido próprios. Os pedidos do Ursoninhos não serão misturados aos lances do No Topo.

O frontend carregará o Mercado Pago Payment Brick com a mesma Public Key pública. Credenciais privadas permanecem exclusivamente na Hostinger. A API aceitará as origens `https://nexo.yt` e `https://www.nexo.yt`; a origem do GitHub Pages poderá ser habilitada apenas como ambiente de teste, sem credenciais privadas no frontend.

## Fluxo de compra

1. O frontend consulta o estado atual do ciclo e recebe o maior valor, incremento mínimo, ranking, término do ciclo e eventual proteção ativa.
2. O visitante informa apelido, e-mail e URL de uma publicação pública do Instagram.
3. O frontend envia o valor pretendido para criar uma reserva de lance.
4. Em transação atômica, o backend rejeita valores abaixo do mínimo, períodos protegidos e tentativas duplicadas. Uma reserva válida dura cinco minutos.
5. O Payment Brick oferece Pix, cartão e boleto usando o mesmo provedor do Ursoninhos.
6. Antes de enviar a cobrança ao Mercado Pago, o backend confirma que a reserva ainda é válida e é a maior reserva ativa.
7. O webhook consulta o pagamento diretamente no Mercado Pago. Quando o estado confirmado for `approved`, o backend promove o lance ao primeiro lugar e inicia dez minutos de proteção.
8. O frontend acompanha o resultado e atualiza telão, ranking e cronômetro por consulta periódica. A primeira versão não exige WebSocket.

## Concorrência e idempotência

- Toda reserva recebe um identificador aleatório e um valor exato em centavos.
- O servidor mantém um piso composto pelo maior pagamento aprovado ou pela maior reserva ativa, o que for maior.
- Uma reserva mais alta invalida a possibilidade de cobrar reservas inferiores ainda não processadas.
- O processamento usa chave de idempotência. Repetir uma requisição ou um webhook não gera nova cobrança nem nova promoção.
- A promoção do ranking acontece dentro de uma transação ou seção crítica protegida por bloqueio de arquivo, conforme o mecanismo de persistência já disponível na Hostinger.
- Pagamentos aprovados não podem ser rebaixados por callbacks atrasados.

## Dados

Cada ciclo armazena identificador, início, término, valor-base e estado. Cada lance armazena identificador, ciclo, apelido, e-mail normalizado, URL e código da publicação, valor em centavos, estado da reserva, identificadores do Mercado Pago, horários, posição e período protegido. O histórico público nunca expõe e-mail, CPF, token ou dados do meio de pagamento.

Os dados financeiros e os dados do Ursoninhos permanecem preservados. O novo sistema usa arquivos ou tabelas próprios, com backup antes da implantação e gravação atômica.

## API proposta

- `GET /_no_topo_backend/api/arena-state.php`: estado público do ciclo, ranking e próximo valor permitido.
- `POST /_no_topo_backend/api/create-bid-session.php`: valida dados e cria a reserva.
- `POST /_no_topo_backend/api/process-bid-payment.php`: processa o Payment Brick para a reserva ativa.
- `GET /_no_topo_backend/api/bid-status.php`: retorna o estado de um lance sem revelar dados privados.
- `POST /_no_topo_backend/api/mercadopago-webhook.php`: recebe e verifica notificações do provedor.

Todos os endpoints mutáveis validam método, origem, tamanho do corpo, formato dos campos, limite de frequência e identificadores. Erros públicos usam mensagens genéricas; detalhes ficam apenas no log privado.

## Validação da publicação

A primeira versão aceita URLs de `instagram.com/p/`, `instagram.com/reel/` e `instagram.com/tv/`. O backend normaliza a URL, extrai o código da publicação e rejeita outros domínios, credenciais na URL, URLs excessivamente longas ou formatos inválidos. A exibição usa o embed oficial do Instagram. Caso o post seja privado, removido ou bloqueado para incorporação, o pagamento não deve ser iniciado.

## Interface

O modal atual deixa de dizer “simulação” e passa a mostrar:

- valor do lance e incremento mínimo;
- tempo restante da proteção atual, quando existir;
- apelido, e-mail e link da publicação;
- resumo claro de que o pagamento aprovado assume o telão;
- Payment Brick do Mercado Pago;
- estados de carregamento, Pix pendente, aprovado, rejeitado, expirado e ultrapassado antes da cobrança.

Durante a proteção de dez minutos, os botões de compra ficam desabilitados e mostram quando novos lances serão liberados. O chat e a navegação 3D continuam funcionando.

## Segurança e moderação

- Access Token, segredo do webhook, registros integrais de pagamentos e dados pessoais nunca chegam ao GitHub.
- CORS aceita somente as origens explicitamente configuradas.
- O preço é calculado e validado pelo servidor; o valor enviado pelo navegador não é confiável.
- O webhook valida assinatura e consulta o pagamento no provedor antes de aprovar.
- Apelido e URL passam por validação e moderação antes da cobrança.
- E-mail é usado apenas para identificar o comprador e prestar suporte; não aparece no ranking.
- Um mecanismo administrativo poderá ocultar uma publicação sem apagar o pagamento ou o histórico de auditoria.

## Testes e implantação

- Testes unitários cobrem ciclo diário, incremento, proteção, expiração, URL do Instagram, idempotência e transições de ranking.
- Testes de integração simulam respostas do Mercado Pago sem realizar cobrança real.
- O ambiente de produção será validado inicialmente com um lance de valor mínimo controlado.
- Antes de publicar PHP, serão criados backup datado e hashes dos arquivos compartilhados do Ursoninhos.
- O frontend só será publicado após a API responder corretamente às origens do No Topo.
- O rollback remove a chamada ao checkout do frontend e restaura os arquivos PHP pelo backup, sem alterar pedidos do Ursoninhos.

## Fora do primeiro lançamento

- WebSocket ou atualização em tempo real por push.
- Carteira de créditos, cupons ou reembolso automático por tempo de exposição.
- Aplicativo móvel nativo.
- Suporte a redes sociais além do Instagram.
