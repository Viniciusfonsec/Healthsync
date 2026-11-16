# Changelog v11

## Modelo de identificação
- Todos os identificadores persistidos passaram a ser numéricos no banco e no domínio/backend.
- PKs são geradas pelo PostgreSQL/Prisma com `autoincrement`.
- FKs usam o mesmo tipo numérico.
- `ProfessionalClinic` e `PatientClinic` utilizam referências numéricas.
- UUIDs não são utilizados como identificadores de entidades.
- UUID/aleatoriedade permanece somente onde não representa chave de banco, como segredo temporário de paciente convidado e nome interno de arquivo armazenado.

## Impacto no banco
Esta é uma alteração estrutural de chaves primárias e estrangeiras. Para uma base de desenvolvimento existente, o banco deve ser recriado a partir da migration `20261005190000_numeric_ids`. Faça backup antes de resetar uma base que contenha dados que precisem ser preservados.
