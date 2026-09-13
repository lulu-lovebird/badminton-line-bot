export type UserRole = 'member' | 'pending_host' | 'host' | 'admin';
export type MatchType = 'single' | 'double';
export type SessionStatus = 'open' | 'full' | 'closed' | 'cancelled';
export type RegistrationStatus = 'main' | 'waitlist' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';
export type AttendanceStatus = 'pending' | 'attended' | 'absent';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface HostApplication {
  id: string;
  user_id: string;
  display_name: string;
  picture_url?: string;
  reason?: string;
  status: ApplicationStatus;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at?: string;
  // Joined fields
  user?: User;
}

export interface User {
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Group {
  group_id: string;
  group_name?: string;
  creator_user_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchSession {
  id: string;
  group_id?: string | null;
  host_user_id: string;
  title: string;
  match_type: MatchType;
  start_time: string;
  end_time: string;
  location: string;
  court_info?: string;
  max_players: number;
  max_waitlist: number;
  level_requirement?: string;
  shuttlecock?: string;
  fee: number;
  notes?: string;
  cancel_deadline?: string;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  current_players?: number;
  waitlist_count?: number;
  group?: Group;
}

export interface Registration {
  id: string;
  session_id: string;
  user_id: string;
  player_name: string;
  party_size: number;
  status: RegistrationStatus;
  waitlist_order?: number | null;
  payment_status: PaymentStatus;
  attendance_status: AttendanceStatus;
  registered_at: string;
  cancelled_at?: string | null;
  notes?: string;
  // Joined fields
  session?: MatchSession;
}
