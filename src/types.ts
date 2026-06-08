/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "receptionist" | "doctor";
  avatar?: string;
  language?: string;
  status?: "active" | "inactive";
  createdAt: string;
}

export interface Doctor {
  doctorId: string;
  doctorName: string;
  speciality: string;
  roomNumber: string;
  photo?: string;
  activeStatus: "active" | "inactive";
  currentToken?: string;
  currentPatient?: string;
  onlineStatus: "online" | "offline";
  chamberStartTime: string;
  chamberEndTime: string;
  averageConsultationTime: number; // in minutes
  totalPatientsToday: number;
}

export interface Token {
  tokenId: string;
  tokenNumber: number;
  patientName: string;
  patientPhone?: string;
  doctorId: string;
  doctorName?: string;
  queuePosition?: number;
  status: "waiting" | "called" | "completed" | "skipped";
  createdAt: string; // ISO String or Firestore timestamp representation
  calledAt?: string;
  completedAt?: string;
  skipped?: boolean;
  priority: "normal" | "emergency";
  language: string;
}

export interface Settings {
  hospitalName: string;
  logo?: string;
  tokenPrefix: string;
  tokenResetTime?: string;
  languages: string[];
  voiceEnabled: boolean;
  whatsappEnabled: boolean;
  qrEnabled: boolean;
  displayTheme: "light" | "dark" | "teal" | "luxury";
}

export interface Report {
  date: string;
  totalPatients: number;
  averageWaitingTime: number; // in minutes
  doctorWiseData: Record<string, {
    doctorName: string;
    treated: number;
    skipped: number;
    avgTime: number;
  }>;
  completedTokens: number;
  skippedTokens: number;
}

export interface Notification {
  notificationId: string;
  title: string;
  body: string;
  userId?: string;
  readStatus: boolean;
  createdAt: string;
}
