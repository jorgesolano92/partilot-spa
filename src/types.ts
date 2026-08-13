export type AppMode = 'usuario' | 'vendedor' | 'gestor'

export interface User {
  id: number
  name: string
  last_name?: string | null
  email: string
}

export interface EntityRef {
  id: number
  name: string
  image?: string | null
}

export interface SellerPayload {
  id: number
  entities?: EntityRef[]
}

export interface ManagerEntity {
  id: number
  name: string
  is_primary: boolean
  manager_id: number
}

export interface ManagerPayload {
  id: number
  entity_id?: number | null
  is_primary?: boolean
  entities?: ManagerEntity[]
}

export interface LoginUsuarioResponse {
  success: boolean
  token?: string
  user?: User
  seller?: SellerPayload
  manager?: ManagerPayload
  message?: string
  pending_gifts_count?: number
}

export type DrawStatus = 'pending_celebration' | 'pending_results' | 'completed'

export interface PublicCheckPrizeInfo {
  has_won: boolean
  prize_amount: number
  prize_category?: string | null
}

export interface PublicCheckTicket {
  data: {
    participation_code: string
    participation_number: string
    numbers: number[]
    winning_numbers: number[]
    status?: string
  }
  set: {
    id: number
    played_amount: number
    donation_amount?: number
    total_played_amount?: number
    total_amount?: number
    amount_breakdown?: string | null
  }
  reserve: {
    entity: { name: string | null }
    reservation_numbers: number[]
    played_numbers_label?: string
  }
  lottery: {
    name: string | null
    draw_date: string | null
    ticket_price: number
  }
  draw_status?: DrawStatus
  preview_image_url?: string | null
  prize_info: PublicCheckPrizeInfo | null
}

export interface PublicCheckResponse {
  success: boolean
  error?: string | null
  ticket?: PublicCheckTicket | null
  message?: string
}

export interface LotteryResultRaw {
  id: number
  name?: string
  draw_date?: string
  result?: Record<string, unknown> | null
  lottery_type?: { name?: string }
  lotteryType?: { name?: string }
}

export interface LotteryCard {
  id: number
  name: string
  dateLabel: string
  firstPrize: string
  secondPrize: string
  reintegros: string[]
}

export interface WalletParticipation {
  id: number
  referencia?: string
  entidad?: string
  sorteo?: string
  numeroReservado?: string
  numero?: number | string
  fechaSorteo?: string
  importeJugado?: number
  donativo?: number
  importeTotal?: number
  numeroParticipacion?: string
  numeroReferencia?: string
  snapshot_path?: string | null
  preview_image_url?: string | null
  premio?: number | null
  estado?: string
  is_digital?: boolean
  is_storage?: boolean
  cobrable?: boolean
  payment_blocked?: boolean
  user_message?: string
  storage_message?: string | null
  presencial_contact?: { formatted?: string }
  gift_id?: number
  gifted_to_email?: string | null
  gifted_at?: string | null
  received_from_name?: string | null
  received_from_email?: string | null
  gift_message?: string | null
  gift_status?: string
}

export interface WalletListMeta {
  total: number
  page: number
  per_page: number
  last_page: number
}

export interface WalletListResponse {
  success: boolean
  participations: WalletParticipation[]
  meta?: WalletListMeta
}

export interface SellByQrResponse {
  success: boolean
  message?: string
  count?: number
  participation?: {
    id: number
    participation_code?: string
  }
  [key: string]: unknown
}

export interface TacoSummary {
  total_participations: number
  total_amount: number
  sales_registered: number
  sales_amount: number
  returned_participations: number
  returned_amount: number
  available_participations: number
  available_amount: number
  payment_breakdown?: Record<string, number>
}

export interface TacoItem {
  set_id: number
  set_name?: string
  set_number?: number | string
  book_number: number
  set_type?: string
  lottery_name?: string
  lottery_date?: string | null
  participations_range?: string
  total_participations: number
  sales_registered: number
  returned_participations: number
  available_participations: number
  sales_amount: number
  available_amount: number
  seller_name?: string
}

export interface TacosResponse {
  success: boolean
  summary?: TacoSummary
  tacos: TacoItem[]
  message?: string
}

export interface ManagerSellerItem {
  id: number
  name: string
  first_name?: string
  last_name?: string
  image?: string | null
  participations_count: number
  pending_amount: number
  group_name?: string[]
  is_external?: boolean
}

export interface ManagerSellersResponse {
  success: boolean
  sellers: ManagerSellerItem[]
  message?: string
}

export interface SaleHistorialItem {
  id: number
  tipo?: string
  fecha?: string
  formaPago?: string
  descripcion?: string
  sorteo?: string
  fechaSorteo?: string
  participacion?: {
    entidad?: string
    sorteo?: string
    numero?: string
    fechaSorteo?: string
    importeTotal?: number
    numeroParticipacion?: string
    numeroReferencia?: string
    snapshotPath?: string | null
    esDigital?: boolean
  }
}

export interface MySalesResponse {
  success: boolean
  historial?: SaleHistorialItem[]
  sales?: SaleHistorialItem[]
  meta?: WalletListMeta
  message?: string
}
