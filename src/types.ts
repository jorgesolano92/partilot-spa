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

export interface ParticipationCheckResponse {
  success: boolean
  status?: string
  message?: string
  participation?: Record<string, unknown>
  lottery?: Record<string, unknown>
  prize?: Record<string, unknown>
  [key: string]: unknown
}

export interface SellByQrResponse {
  success: boolean
  message?: string
  [key: string]: unknown
}
