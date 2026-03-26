import { MedicalRecord } from './types';

export const SAMPLE_RECORDS: Partial<MedicalRecord>[] = [
  {
    title: "Annual Physical 2024",
    content: "Patient presents for annual physical. Blood pressure 120/80. Heart rate 72 bpm. Lungs clear. Recommended vitamin D supplement (2000 IU daily). Patient reports occasional knee pain after running. Referred to physical therapy.",
    type: "visit_note",
    date: "2024-05-15T10:00:00Z",
    source: "General Hospital",
    tags: ["physical", "routine"]
  },
  {
    title: "Blood Panel Results",
    content: "Cholesterol: 190 mg/dL (Normal < 200). LDL: 110 mg/dL. HDL: 60 mg/dL. Triglycerides: 100 mg/dL. Glucose: 95 mg/dL. Vitamin D: 22 ng/mL (Low, recommended > 30). All other values within normal range.",
    type: "visit_note",
    date: "2024-05-20T09:00:00Z",
    source: "LabCorp",
    tags: ["bloodwork", "cholesterol"]
  },
  {
    title: "Knee MRI Report",
    content: "Mild degenerative changes in the medial meniscus. No acute tear. Small joint effusion. Patellofemoral tracking is normal. Impression: Early stage osteoarthritis, mild.",
    type: "visit_note",
    date: "2024-06-10T14:30:00Z",
    source: "City Imaging",
    tags: ["mri", "orthopedic"]
  },
  {
    title: "Prescription: Vitamin D3",
    content: "Cholecalciferol 2000 IU. Take one capsule daily with food. Duration: 6 months. Refills: 2.",
    type: "prescription",
    date: "2024-05-16T11:00:00Z",
    source: "Dr. Smith",
    tags: ["medication", "supplement"]
  }
];
