export type StockState = {
  stock: number;
  reserved: number;
};

export type StockRuleResult =
  | { ok: true; stock: number; reserved: number; available: number }
  | { ok: false; reason: string };

export function getAvailableStock(state: StockState) {
  return Math.max(0, state.stock - state.reserved);
}

export function reserveStock(state: StockState, quantity: number): StockRuleResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, reason: 'Quantity must be a positive integer' };
  }
  if (getAvailableStock(state) < quantity) {
    return { ok: false, reason: 'Insufficient available stock' };
  }
  const reserved = state.reserved + quantity;
  return { ok: true, stock: state.stock, reserved, available: getAvailableStock({ stock: state.stock, reserved }) };
}

export function releaseReservedStock(state: StockState, quantity: number): StockRuleResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, reason: 'Quantity must be a positive integer' };
  }
  if (state.reserved < quantity) {
    return { ok: false, reason: 'Cannot release more than reserved stock' };
  }
  const reserved = state.reserved - quantity;
  return { ok: true, stock: state.stock, reserved, available: getAvailableStock({ stock: state.stock, reserved }) };
}

export function commitReservedStock(state: StockState, quantity: number): StockRuleResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, reason: 'Quantity must be a positive integer' };
  }
  if (state.reserved < quantity) {
    return { ok: false, reason: 'Cannot commit more than reserved stock' };
  }
  if (state.stock < quantity) {
    return { ok: false, reason: 'Cannot reduce stock below zero' };
  }
  const stock = state.stock - quantity;
  const reserved = state.reserved - quantity;
  return { ok: true, stock, reserved, available: getAvailableStock({ stock, reserved }) };
}

export function adjustStock(state: StockState, quantityChange: number): StockRuleResult {
  if (!Number.isInteger(quantityChange)) {
    return { ok: false, reason: 'Adjustment must be an integer' };
  }
  const stock = state.stock + quantityChange;
  if (stock < 0) {
    return { ok: false, reason: 'Stock cannot be negative' };
  }
  if (stock < state.reserved) {
    return { ok: false, reason: 'Stock cannot be lower than reserved stock' };
  }
  return { ok: true, stock, reserved: state.reserved, available: getAvailableStock({ stock, reserved: state.reserved }) };
}
