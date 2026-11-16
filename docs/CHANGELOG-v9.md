# HealthSync — Changelog v9

## Pacientes e filiais
- Pacientes autenticados podem agendar em qualquer clínica ativa da rede.
- O endpoint `POST /api/v1/patient/appointments` recebe a clínica escolhida explicitamente.
- O backend não exige vínculo prévio do paciente com a clínica escolhida.
- `PatientClinic` é criado sob demanda no primeiro agendamento naquela unidade.

## Profissionais e contexto de trabalho
- O profissional continua escolhendo a filial após autenticação.
- Agenda, histórico de pacientes, atendimento e documentos respeitam a filial atualmente selecionada.
