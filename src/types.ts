export interface User {
  id: number;
  name: string;
}

export interface Entry {
  id: number;
  user_id: number;
  user_name: string;
  date: string;
  is_present: number;
}

export interface DailyPacket {
  date: string;
  breakfast_packets: number;
  dinner_packets: number;
}

export interface MonthlyStats {
  userName: string;
  totalCost: number;
}
