import { z } from 'zod';
import { ApprovalStatus } from '@prisma/client';

// ─── Approval status helpers ───────────────────────────────────────────────────

/** Maps human-readable UI label → Prisma enum value */
export const STATUS_LABEL_TO_PRISMA: Record<string, ApprovalStatus> = {
  Pending: 'PENDING',
  'Under Review': 'UNDER_REVIEW',
  Verified: 'VERIFIED',
  Rejected: 'REJECTED',
};

/** Maps Prisma enum value → human-readable UI label */
export const STATUS_PRISMA_TO_LABEL: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

// ─── Doctor schemas ────────────────────────────────────────────────────────────

export const CreateDoctorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  specialization: z.string().min(2, 'Specialization required'),
  licenseNumber: z.string().min(5, 'License number is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

export const UpdateDoctorSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  specialization: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
});

// ─── Pharmacist schemas ────────────────────────────────────────────────────────

export const CreatePharmacistSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  licenseNumber: z.string().min(5, 'License number is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  qualifications: z.string().min(5, 'Qualifications required'),
});

export const UpdatePharmacistSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  qualifications: z.string().min(5).optional(),
});

// ─── Pharmacy schemas ──────────────────────────────────────────────────────────

export const CreatePharmacySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  address: z.string().min(10, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  licenseNumber: z.string().min(5, 'License number is required'),
});

export const UpdatePharmacySchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  address: z.string().min(10).optional(),
  city: z.string().min(2).optional(),
});

// ─── Notification schema ───────────────────────────────────────────────────────

export const CreateNotificationSchema = z.object({
  userId: z.string(),
  message: z.string().min(5, 'Message must be at least 5 characters'),
  type: z.enum(['INFO', 'WARNING', 'ERROR', 'SUCCESS']).optional(),
});

// ─── Auth schemas ──────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['DOCTOR', 'PHARMACIST']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  qualifications: z.string().optional(),
});

// ─── List query schema ─────────────────────────────────────────────────────────

export const ListQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
  sortBy: z.enum(['name', 'date', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;
export type CreatePharmacistInput = z.infer<typeof CreatePharmacistSchema>;
export type UpdatePharmacistInput = z.infer<typeof UpdatePharmacistSchema>;
export type CreatePharmacyInput = z.infer<typeof CreatePharmacySchema>;
export type UpdatePharmacyInput = z.infer<typeof UpdatePharmacySchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
// Same shape as RegisterSchema minus password — the account's identity comes
// from the verified Google pending token instead, not a client-supplied email.
export const GoogleCompleteProfileSchema = z.object({
  role: z.enum(['DOCTOR', 'PHARMACIST']),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional(),
  qualifications: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ListQueryInput = z.infer<typeof ListQuerySchema>;
