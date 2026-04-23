/* Barrel export for the KDS feature module. */

export { default as KdsBoard } from "./KdsBoard";
export { default as OrderCard } from "./OrderCard";
export { default as StatusColumn } from "./StatusColumn";
export { useKdsStore, connectKdsSocket } from "./kdsStore";
export type { Order, OrderItem, OrderStatus, OrderWsEvent } from "./types";
