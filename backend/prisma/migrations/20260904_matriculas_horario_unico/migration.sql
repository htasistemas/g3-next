-- Impede que o mesmo horário ativo seja reservado duas vezes no mesmo atendimento.
-- Registros cancelados e inscrições sem agenda permanecem fora da restrição.
CREATE UNIQUE INDEX IF NOT EXISTS cursos_atendimentos_matriculas_horario_uidx
  ON cursos_atendimentos_matriculas (tenant_id, curso_id, data_agendada, hora_agendada)
  WHERE COALESCE(UPPER(status), 'ATIVO') <> 'CANCELADO'
    AND data_agendada IS NOT NULL
    AND hora_agendada IS NOT NULL;
