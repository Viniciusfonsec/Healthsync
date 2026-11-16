# HealthSync v7 — contexto de filial do profissional

- A agenda profissional passa a recarregar automaticamente quando a filial de trabalho é alterada.
- A consulta de agenda no backend é filtrada por profissional + filial diretamente no PostgreSQL/Prisma.
- Dashboard, pacientes do dia, histórico e atendimento também reagem à troca de filial.
- Ao trocar de filial com a tela de atendimento aberta, a seleção de consulta é limpa/revalidada para evitar dados de outra unidade.
- A agenda exibe a filial de trabalho atual para tornar o contexto operacional explícito.

## v9 — contexto de filial do paciente
- Pacientes autenticados podem escolher qualquer filial ativa no agendamento.
- O vínculo paciente-clínica é criado sob demanda no primeiro agendamento na unidade.
- A API de agendamento autenticado passa a receber `clinicId` explicitamente.
- Foi incluído teste de regressão para agendamento em segunda filial sem vínculo prévio.
