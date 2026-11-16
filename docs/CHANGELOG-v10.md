# Changelog — v10

## Disponibilidade de profissionais

- Novos profissionais passam a receber uma disponibilidade inicial nos dias úteis (segunda a sexta, 08:00–17:00).
- Profissionais já existentes sem disponibilidade recebem os mesmos horários pela migration `20261005150000_default_professional_availability`.
- A tela de Configurações do Profissional passa a carregar a disponibilidade realmente persistida no banco, em vez de exibir apenas valores padrão locais.
- Adicionado `GET /api/v1/professional/agenda/availability` para consulta da disponibilidade persistida.
- A disponibilidade continua editável pelo profissional e é usada pelo fluxo público de agendamento.
