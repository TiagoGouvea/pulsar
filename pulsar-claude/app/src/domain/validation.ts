/**
 * Shared validation result shapes for domain modules.
 * No Firebase, React or DOM dependencies.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
