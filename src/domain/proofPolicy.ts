export type ClaimId =
  | 'age_over_18'
  | 'active_enrollment'
  | 'study_field'
  | 'gpa_band'
  | 'holder_public_key'
  | 'residency_eligible'
  | 'credential_type'
  | 'subject_ref'

export type PublicClaimId = Exclude<ClaimId, 'holder_public_key' | 'credential_type' | 'subject_ref'>

export const SCHOLARSHIP_AUDIENCE = 'openbridge-scholarship-2026'
export const SCHOLARSHIP_PURPOSE = 'Verify minimum eligibility for the Open Web Fellowship.'
export const TRUSTED_ISSUER_ID = 'openbridge-university-demo-registry'
export const TRUSTED_ISSUER_KEY_ID = 'openbridge-p256-2026-01'

export const scholarshipRequirements: Array<{
  id: PublicClaimId
  label: string
  expectedValue: boolean | string
  privateAlternative: string
}> = [
  { id: 'age_over_18', label: 'Applicant is at least 18', expectedValue: true, privateAlternative: 'Exact date of birth' },
  { id: 'active_enrollment', label: 'Currently enrolled', expectedValue: true, privateAlternative: 'Full enrollment record' },
  { id: 'study_field', label: 'Studies an eligible field', expectedValue: 'computer_science', privateAlternative: 'Complete transcript' },
  { id: 'gpa_band', label: 'GPA is 3.5 or above', expectedValue: '3.5_or_above', privateAlternative: 'Exact GPA and grades' },
  { id: 'residency_eligible', label: 'Meets residency rule', expectedValue: true, privateAlternative: 'Home address' },
]
