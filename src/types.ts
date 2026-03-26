export type RecordType = 'visit_note' | 'lab_result' | 'prescription' | 'imaging' | 'manual_entry' | 'symptom_log';

export interface MedicalRecord {
  id: string;
  title: string;
  content: string;
  type: RecordType;
  date: string;
  source: string;
  tags: string[];
  metadata?: {
    doctorName?: string;
    clinicName?: string;
    labName?: string;
    medicationName?: string;
    dosage?: string;
    frequency?: string;
    results?: Record<string, any>;
  };
  chunks?: string[];
  embeddings?: number[][];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: string[];
  tokensUsed?: number;
}

export interface SearchResult {
  recordId: string;
  text: string;
  score: number;
  recordTitle: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'query' | 'upload' | 'delete' | 'export' | 'access';
  details: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  name: string;
  language?: 'en' | 'es' | 'fr' | 'de';
  dateOfBirth?: string;
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  preferences?: string[];
  nuances?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
  };
}
