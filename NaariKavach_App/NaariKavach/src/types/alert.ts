/**
 * Alert type definition for NaariKavach application
 */

export interface Alert {
  id: string;
  userId: string;
  userName?: string;
  alertType: 'emergency' | 'safety_check' | 'suspicious_activity';
  status: 'active' | 'in_progress' | 'resolved';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  details?: string;
  timestamp: string;
  resolvedAt?: string;
  resolvedBy?: {
    id: string;
    name: string;
    badgeNumber?: string;
  };
  notes?: string;
}

export interface AlertResponse {
  id: string;
  responseType: 'police' | 'medical';
  responderName: string;
  responderBadgeNumber?: string;
  responderId: string;
  responseTime: string;
  arrivalTime?: string;
  status: 'dispatched' | 'en_route' | 'on_scene' | 'completed';
}
