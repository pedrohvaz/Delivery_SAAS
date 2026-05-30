// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export type Role = 'ADMIN' | 'OPERATOR' | 'DELIVERY'
export type AvailableFor = 'DELIVERY' | 'PICKUP' | 'BOTH'
export type OrderType = 'DELIVERY' | 'PICKUP' | 'TABLE' | 'COUNTER'
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED'
export type AreaType = 'POLYGON' | 'RADIUS' | 'DISTRICT'
export type CouponType =
  | 'PERCENT_DISCOUNT'
  | 'FIXED_DISCOUNT'
  | 'FREE_DELIVERY'
  | 'PRODUCT_GIFT'
  | 'ITEM_DISCOUNT'

// ─────────────────────────────────────────
// API Response wrapper
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─────────────────────────────────────────
// Auth
// ─────────────────────────────────────────

export interface LoginInput {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string    // userId
  storeId: string
  role: Role
}

// Token da conta global do cliente (vitrine) — namespace separado do admin
export interface CustomerJwtPayload {
  sub: string          // customerAccountId
  type: 'customer'
}

// ─────────────────────────────────────────
// Store
// ─────────────────────────────────────────

export interface StoreDTO {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  isOpen: boolean
  acceptOrders: boolean
  estimatedTime: number
  minOrderValue: number
}

// ─────────────────────────────────────────
// Orders (WebSocket events)
// ─────────────────────────────────────────

export interface NewOrderEvent {
  event: 'new_order'
  storeId: string
  orderId: string
  orderNumber: number
  type: OrderType
  total: number
  customerName: string | null
}

export interface OrderStatusEvent {
  event: 'order_status_changed'
  storeId: string
  orderId: string
  orderNumber: number
  status: OrderStatus
}
