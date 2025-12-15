/**
 * Booking Agent Types
 * Data structures for travel booking automation
 */

export interface BookingRequest {
  userId: string;
  intent: string;
  type: 'flight' | 'hotel' | 'car' | 'package';
  params?: FlightSearchParams | HotelSearchParams | CarSearchParams;
}

export interface FlightSearchParams {
  from: string; // Airport code or city
  to: string;
  departDate: string; // ISO date
  returnDate?: string; // For round-trip
  passengers: number;
  class?: 'economy' | 'premium_economy' | 'business' | 'first';
  flexible?: boolean; // Flexible dates ±3 days
}

export interface HotelSearchParams {
  location: string;
  checkIn: string; // ISO date
  checkOut: string;
  rooms: number;
  guests: number;
  starRating?: number; // 1-5
  maxPrice?: number;
}

export interface CarSearchParams {
  location: string;
  pickupDate: string;
  returnDate: string;
  carType?: 'economy' | 'compact' | 'suv' | 'luxury';
}

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
    terminal?: string;
  };
  arrival: {
    airport: string;
    time: string;
    terminal?: string;
  };
  duration: number; // minutes
  stops: number;
  price: {
    amount: number;
    currency: string;
  };
  class: string;
  availableSeats: number;
  baggage: {
    carry: number;
    checked: number;
  };
}

export interface HotelOption {
  id: string;
  name: string;
  address: string;
  starRating: number;
  price: {
    perNight: number;
    total: number;
    currency: string;
  };
  amenities: string[];
  images: string[];
  reviews: {
    rating: number;
    count: number;
  };
  cancellationPolicy: string;
  distanceFromCenter?: number; // km
}

export interface BookingTask {
  id: string;
  type: 'search' | 'filter' | 'compare' | 'book' | 'confirm';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BookingPlan {
  id: string;
  userId: string;
  intent: string;
  bookingType: 'flight' | 'hotel' | 'car' | 'package';
  tasks: BookingTask[];
  options?: FlightOption[] | HotelOption[];
  selectedOption?: FlightOption | HotelOption;
  estimatedTime: number; // seconds
  requiresApproval: boolean;
  createdAt: Date;
}

export interface BookingConfirmation {
  bookingId: string;
  confirmationCode: string;
  bookingType: 'flight' | 'hotel' | 'car';
  details: FlightOption | HotelOption | Record<string, any>;
  totalPrice: {
    amount: number;
    currency: string;
  };
  travelerInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: Date;
}

export interface TravelPreferences {
  userId: string;
  airlines?: string[]; // Preferred airlines
  seatPreference?: 'window' | 'aisle' | 'middle';
  mealPreference?: 'vegetarian' | 'vegan' | 'kosher' | 'halal';
  loyaltyPrograms?: Array<{
    airline: string;
    number: string;
  }>;
  hotelChains?: string[];
  budgetRange?: {
    min: number;
    max: number;
    currency: string;
  };
}
