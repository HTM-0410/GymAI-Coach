# Personalization & InBody - Implementation Decisions

Date: 2026-08-22  
Status: APPROVED FOR P0 BUILD by the Homeowner request to plan, hand over to Builders, verify and continue until code completion.

| ID | Decision | Rationale |
|---|---|---|
| IMP-D01 | InBody remains optional and never blocks onboarding/workouts. | Most users do not own a result sheet. |
| IMP-D02 | Raw image is processed ephemerally and is not persisted in P0. | Data minimization. |
| IMP-D03 | Client creates a redacted preview and explicit external-processing consent is required before Gemini Vision. | Prevent sending the visible header identifier by default. |
| IMP-D04 | Extracted values require human review before save. | OCR/vision is fallible. |
| IMP-D05 | One measurement is a baseline; trend requires at least two confirmed comparable measurements. | Avoid false precision. |
| IMP-D06 | InBody does not prescribe load, diagnose or automatically set nutrition targets. | Safety boundary. |
| IMP-D07 | Structured, expiring movement constraints replace the old three-boolean proposal. | Better provenance and lifecycle. |
| IMP-D08 | P0 data is user-only; trainer sharing is deferred. | Least privilege. |
| IMP-D09 | Measurements persist until user deletion; consent can be withdrawn for future AI use. | User control. |
| IMP-D10 | Initial compliance/product scope is Vietnam and adults; no separate child flow in P0. | Current target context and consent complexity. |

Skipped checkpoint: no additional RRI pause. The prior Blueprint plus the Homeowner's explicit instruction to proceed supplies sufficient scope; these conservative defaults remain inside it.

