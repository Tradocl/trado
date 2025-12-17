// Demo data for guest mode - cuenta nueva vacía
export const demoProfile = {
  id: "demo-user-id",
  full_name: "Usuario Invitado",
  nickname: null,
  email: "invitado@trado.cl",
  reputation_score: 0,
  total_transactions: 0,
  is_verified: false,
  verification_status: "pending",
  phone: null,
  address: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
  dashboard_color: "primary",
  dashboard_theme: "system",
  dashboard_background_url: null,
  bank_holder_name: null,
  bank_holder_rut: null,
  bank_name: null,
  bank_account_type: null,
  bank_account_number: null,
  rut: null,
};

export const demoWallet = {
  id: "demo-wallet-id",
  user_id: "demo-user-id",
  balance: 0,
  blocked_balance: 0,
  currency: "CLP",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const demoTransactions: any[] = [];

export const demoMovements: any[] = [];

export const demoBuyerProfiles: Record<string, any> = {};
