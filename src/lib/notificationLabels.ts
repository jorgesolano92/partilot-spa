/**
 * Etiquetas para notifications.kind (API). Ampliar cuando se añadan kinds en Laravel.
 */
export const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  manual_entidad: 'Entidad',
  push_directo_panel: 'Mensaje directo',
  regalo_participacion: 'Regalo',
  regalo_rechazado: 'Regalo rechazado',
  cobro_registrado: 'Cobro',
  invitacion_vendedor: 'Invitación vendedor',
  asignacion_participaciones: 'Asignación',
  liquidacion_vendedor: 'Liquidación',
  resultados_sorteo: 'Resultados',
  cobro: 'Cobro',
  regalo: 'Regalo',
  sorteo: 'Sorteo',
  ganador: 'Premio',
  manual: 'Aviso',
}

export function notificationKindLabel(kind: string | null | undefined): string {
  if (!kind) return 'Notificación'
  return NOTIFICATION_KIND_LABELS[kind] ?? kind
}
