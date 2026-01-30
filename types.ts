
export interface UserProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  location?: { lat: number; lng: number; city: string };
  availability: DayAvailability[];
  preferredPlaces: MeetingPlace[];
}

export interface DayAvailability {
  day: string; // 'Monday', 'Tuesday', etc.
  slots: TimeRange[];
  active: boolean;
}

export interface TimeRange {
  start: string; // '09:00'
  end: string;   // '17:00'
}

export interface MeetingPlace {
  id: string;
  name: string;
  address: string;
  type: string;
  rating?: number;
  mapUri?: string;
  snippet?: string;
  placeId?: string;
}

export interface Booking {
  id: string;
  hostId: string;
  visitorName: string;
  visitorEmail: string;
  date: string; // ISO String
  time: string; // '10:00'
  place: MeetingPlace;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface AppState {
  currentUser: UserProfile | null;
  bookings: Booking[];
}
