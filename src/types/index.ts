export type LicenseClass = 'D' | 'DE';
export type DriverStatus = 'ACTIVE' | 'INACTIVE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Driver {
  id: string;
  fullName: string;
  nic: string;
  licenseNo: string;
  licenseClass: LicenseClass;
  licenseExpiry: string;
  phone: string;
  emergencyContact?: string;
  address?: string;
  dob?: string;
  gender?: Gender;
  status: DriverStatus;
  onDuty: boolean;
  assignedVehicle?: string;
  avatar?: string;
  notes?: string;
}

export type DocType = 'NIC' | 'LICENSE' | 'MEDICAL' | 'BACKGROUND_CHECK' | 'OTHER';
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface DriverDocument {
  id: string;
  driverId: string;
  driverName?: string;
  docType: DocType;
  docNo?: string;
  filePath?: string;
  issuedAt: string;
  expiresAt?: string;
  verification: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
}

export type FuelType = 'DIESEL' | 'PETROL' | 'CNG' | 'ELECTRIC' | 'HYBRID';
export type VehicleStatus = 'IN_SERVICE' | 'MAINTENANCE' | 'REPAIR' | 'RETIRED';

export interface VehicleCompliance {
  REVENUE_LICENSE?: string;
  INSURANCE?: string;
  FITNESS?: string;
  EMISSION?: string;
  ROUTE_PERMIT?: string;
  [key: string]: string | undefined;
}

export interface Vehicle {
  id: string;
  registrationNo: string;
  make: string;
  model: string;
  year: number;
  seatingCapacity: number;
  fuelType: FuelType;
  isAc: boolean;
  odometerKm: number;
  status: VehicleStatus;
  depot: string;
  compliance: VehicleCompliance;
}

export type MaintenanceType = 'ROUTINE' | 'REPAIR' | 'INSPECTION';

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  registrationNo: string;
  serviceDate: string;
  type: MaintenanceType;
  odometerKm: number;
  costLkr: number;
  performedBy: string;
  nextServiceDate?: string;
  notes?: string;
}

export interface DriverAssignment {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  registrationNo: string;
  assignedFrom: string;
  assignedTo?: string;
  isCurrent: boolean;
}

export interface Halt {
  id: string;
  name: string;
  district: string;
  province: string;
  address?: string;
  lat: number;
  lng: number;
  isTerminal: boolean;
}

export interface RouteHalt {
  id: string;
  routeId: string;
  haltId: string;
  haltName: string;
  sequence: number;
  distanceFromOriginKm: number;
  etaMinutes: number;
}

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  originHaltId: string;
  destinationHaltId: string;
  originHaltName?: string;
  destinationHaltName?: string;
  distanceKm: number;
  durationMinutes: number;
  isActive: boolean;
  halts?: RouteHalt[];
}

export interface Schedule {
  id: string;
  routeId: string;
  routeNumber: string;
  routeName: string;
  vehicleId: string;
  registrationNo: string;
  driverId: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  daysOfWeek: string[];
  validFrom: string;
  validTo?: string;
  isActive: boolean;
}

export type TripStatus =
  | 'SCHEDULED'
  | 'BOARDING'
  | 'DEPARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DELAYED';

export interface Trip {
  id: string;
  tripRef: string;
  scheduleId?: string;
  routeNumber: string;
  routeName: string;
  registrationNo: string;
  driverName: string;
  status: TripStatus;
  serviceDate: string;
  scheduledDeparture: string;
  departedAt?: string;
  occupancy: number;
  capacity: number;
  currentHaltIndex: number;
  currentHaltName?: string;
  delayMinutes?: number;
  delayReason?: string;
}

export type TripLogSource = 'IOT_SENSOR' | 'CONDUCTOR' | 'ESTIMATED';

export interface TripHaltLog {
  id: string;
  tripRef: string;
  sequence: number;
  haltName: string;
  arrivedAt?: string;
  departedAt?: string;
  boarded: number;
  alighted: number;
  occupancyAfter: number;
  source: TripLogSource;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Booking {
  id: string;
  bookingRef: string;
  passengerName: string;
  passengerPhone: string;
  routeNumber: string;
  routeName: string;
  serviceDate: string;
  seatNo: string;
  boardingHalt: string;
  alightingHalt: string;
  fareLkr: number;
  status: BookingStatus;
  bookedAt: string;
  cancelReason?: string;
}

export type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Passenger {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  tier: LoyaltyTier;
  totalTrips: number;
  totalSpentLkr: number;
  loyaltyPoints: number;
  joinedAt: string;
}

export interface FareRule {
  id: string;
  routeId: string;
  routeNumber: string;
  fromHalt: string;
  toHalt: string;
  distanceKm: number;
  baseFareLkr: number;
  perKmRateLkr: number;
  acSurcharge: boolean;
  acSurchargeLkr: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE_BANKING' | 'MOBILE_WALLET' | 'KIOSK';
export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: string;
  txnRef: string;
  bookingRef: string;
  method: PaymentMethod;
  amountLkr: number;
  status: PaymentStatus;
  paidAt: string;
}

export interface RevenueFact {
  id: string;
  routeNumber: string;
  routeName: string;
  tripDate: string;
  totalBookings: number;
  totalRevenueLkr: number;
  avgFareLkr: number;
  occupancyRate: number;
  cancellations: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenueLkr: number;
  passengerCount: number;
  tripCount: number;
}

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  loggedAt: string;
  tableName: string;
  action: AuditAction;
  recordRef: string;
  performedBy: string;
  ipAddress?: string;
  oldValues?: any;
  newValues?: any;
}

export type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';
export type NotificationStatus = 'SENT' | 'QUEUED' | 'FAILED';

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  audience: string;
  recipients: number;
  status: NotificationStatus;
  sentAt: string;
}

export type UserRole = 'ADMIN' | 'DRIVER' | 'PASSENGER';

export interface SystemUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'WARNING' | 'INFO' | 'SUCCESS' | 'ERROR';
  read: boolean;
}

export interface DashboardSummary {
  activeBuses: number;
  inServiceVehicles: number;
  todayPassengerCount: number;
  passengerCountDelta: string;
  grossRevenueLkr: number;
  revenueDelta: string;
  outOfServiceCount: number;
  delayedTripsCount: number;
  expiringDocsCount: number;
}

export interface LiveFleetVehicle {
  vehicleId: string;
  registrationNo: string;
  driverName: string;
  routeNumber: string;
  routeName: string;
  status: 'ON_ROUTE' | 'AT_HALT' | 'IDLE' | 'DELAYED';
  speedKmh: number;
  lat: number;
  lng: number;
  occupancy: number;
  capacity: number;
  nextHalt: string;
  etaNextHaltMinutes: number;
  delayMinutes: number;
  heading: number;
}

export interface SeatMapItem {
  seatNo: string;
  type: 'STANDARD' | 'PREMIUM' | 'DISABLED' | 'FRONT_ROW';
  booked: boolean;
  passengerName?: string;
}
