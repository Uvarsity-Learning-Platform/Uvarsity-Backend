/**
 * Lightweight OrdersService
 *
 * This is a framework-agnostic, in-memory OrdersService suitable as a starting
 * point for payments/order logic. Replace the internal store with a DB/repository
 * implementation when integrating into your application.
 */

/* ----------------------------- Types & Enums ----------------------------- */

export type Currency = string;

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export interface OrderItem {
    productId: string;
    name?: string;
    quantity: number;
    unitPrice: number; // minor units (e.g. cents) or decimal depending on your convention
    metadata?: Record<string, any>;
}

export interface Order {
    id: string;
    items: OrderItem[];
    amount: number; // total amount computed from items
    currency: Currency;
    status: OrderStatus;
    customerId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

/* ----------------------------- DTOs / Inputs ----------------------------- */

export interface CreateOrderInput {
    items: OrderItem[];
    currency: Currency;
    customerId?: string;
    metadata?: Record<string, any>;
}