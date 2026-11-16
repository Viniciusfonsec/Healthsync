// Os testes conferem datas e horários como o usuário vê no Brasil.
// Fixa o fuso para darem o mesmo resultado em qualquer máquina (o GitHub Actions roda em UTC).
process.env.TZ = 'America/Sao_Paulo';
