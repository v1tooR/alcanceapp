# Dúvidas de negócio — pendentes de validação

Registro objetivo do que **não foi demonstrado ou aprovado** e, portanto, não foi
presumido como regra no front-end. Cada item precisa de uma decisão da equipe
Alcance antes de virar comportamento definitivo.

Enquanto não houver decisão, a interface trata o assunto como **dado editável**,
nunca como automação.

---

## 1. Subprocessos e etapas

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 1.1 | Qual é a sequência oficial de etapas de cada subprocesso (IPI, IOF, ICMS, IPVA, estacionamento PCD, rodízio, recurso)? | O catálogo em `src/lib/catalogo-subprocessos.ts` traz uma sequência **sugerida**, editável a cada processo, marcada como pendente de validação. |
| 1.2 | Existe ordem obrigatória entre subprocessos (ex.: avaliação inicial antes de IPI; IPI antes de ICMS)? | Nenhuma dependência é imposta. A equipe abre os subprocessos na ordem que quiser. |
| 1.3 | A avaliação inicial é obrigatória em todo processo? | Vem pré-marcada na criação, mas pode ser desmarcada. |
| 1.4 | O recurso é sempre um subprocesso novo, ou pode reabrir o subprocesso indeferido? | Modelado como subprocesso próprio: `indeferido` é estado final e não volta atrás (`src/lib/workflow.ts`). **Confirmar.** |
| 1.5 | Um mesmo subprocesso pode existir mais de uma vez no mesmo processo (ex.: dois IPVA para dois veículos)? | Hoje é bloqueado quando já há um do mesmo tipo em andamento. **Confirmar.** |

## 2. Prazos e responsáveis

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 2.1 | Prazos são definidos manualmente ou calculados a partir de alguma regra (ex.: X dias após o protocolo)? | Sempre manuais. Nenhum cálculo automático foi implementado. |
| 2.2 | O que caracteriza um processo "parado"? | Adotado 15 dias sem movimentação, apenas como destaque no painel. **Confirmar o número.** |
| 2.3 | Quando o responsável do processo muda, os subprocessos acompanham? | Não. Cada subprocesso tem responsável próprio. |

## 3. Documentos

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 3.1 | Formatos e tamanho máximo aceitos no envio do cliente. | Adotado PDF/JPG/PNG/HEIC até 10 MB **apenas como orientação de tela**. O limite real precisa ser definido e validado no servidor. |
| 3.2 | Um documento reprovado pode ser reaproveitado ou é sempre substituído? | Reprovado é estado final; o caminho é solicitar reenvio, que reabre o envio. **Confirmar.** |
| 3.3 | Quais documentos são obrigatórios por subprocesso? | Apenas sugestões no catálogo; nada é bloqueado por falta de documento. |
| 3.4 | Documentos aprovados podem ser reaproveitados entre subprocessos do mesmo cliente? | Não implementado. Cada solicitação é independente. |
| 3.5 | Quem pode ver documentos sensíveis (laudos)? Há restrição por papel dentro da equipe? | Hoje toda a equipe vê, com exibição protegida por ação explícita. **Definir se analista deve ter acesso.** |

## 4. Status do processo

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 4.1 | O status do processo deve ser automático a partir dos subprocessos? | Não. A interface **sugere** um status e a mudança continua sendo decisão explícita da equipe. |
| 4.2 | Processo arquivado pode ser reaberto? | Permitido voltar para "em andamento". **Confirmar.** |
| 4.3 | Existe status de "aguardando pagamento"? | Não modelado — o financeiro é informativo e não bloqueia o fluxo. |

## 5. Cliente e acesso

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 5.1 | Como o cliente recebe as credenciais de acesso? | Não definido. A interface apenas liga/desliga o acesso; o convite depende do serviço de autenticação. |
| 5.2 | Um cliente pode ter mais de um processo simultâneo? | Sim, o modelo permite. **Confirmar se ocorre na prática.** |
| 5.3 | Há representante legal que também acessa a área do cliente? | Não modelado. |
| 5.4 | O cliente pode ver o valor combinado (financeiro)? | Hoje **não**. O financeiro é exclusivo da equipe. |

## 6. Financeiro

| # | Dúvida | Como está hoje na interface |
|---|--------|------------------------------|
| 6.1 | Há parcelamento, comissões ou custos por processo? | Não. Apenas um registro simples por processo, conforme escopo contratado. |
| 6.2 | Quem pode ver o financeiro? | Gestor e administrador geral. Analista não vê. **Confirmar.** |

---

## Fora de escopo (não implementar sem aprovação)

Integração com órgãos públicos, protocolo automático, mensagens externas
automáticas, assinatura digital, leitura ou análise de documentos por IA,
aplicativo nativo, CRM avançado e módulo fiscal/contábil completo.
