export type Profile = {
  id: string;
  phone_number?: string;
  created_at?: string;
};

export type Vehicle = {
  id: string;
  user_id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  current_odometer: number;
  created_at?: string;
};

export type Receipt = {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_date: string;
  odometer: number;
  workshop_name: string;
  total_amount: number;
  items_summary: string;
  created_at?: string;
};

export type VehicleWithReceipts = Vehicle & {
  receipts: Receipt[];
};
