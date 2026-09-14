# CVideo Requirements v0.2

## Candidate requirements
- Candidate profile MUST treat a 30-second video as the primary presentation asset.
- Candidate MAY upload the video or provide a supported link.
- CV/resume MUST be optional and secondary.
- Candidate MAY define multiple skills, up to five preferred job titles and up to two additional profile subfields.
- Candidate MUST NOT apply to jobs, browse jobs or browse other candidates.
- Candidate navigation MUST be Home, Messages and Profile.
- Candidate MAY view video watch count.
- Candidate MUST NOT initiate a new recruiter/company conversation.

## Fast profile requirements
- Profile completion MUST be simple, fast and suitable for mobile use.
- Years of experience MUST be captured as one whole-number field from 0 to 50.
- Certificates MUST be captured as one whole-number count from 0 to 50.
- Highest education MUST be captured using one bilingual dropdown.
- The approved education values are: No formal education, High school, Vocational/technical, Diploma, Bachelor's, Master's, Doctorate (PhD), and Professor/academic rank.
- The quick profile MUST NOT require company names, job history dates, institution names, certificate names, issuing organizations or certificate dates.
- Existing detailed experience, education and certificate records MUST be preserved during migration, but the v1 quick-profile interface MUST not require or expose those long forms.
- Recruiter summaries MUST show years of experience, highest education and certificate count as concise values.
- Arabic and English labels MUST represent the same canonical stored values.
- Profile save MUST update the three simplified fields in the same save action as the rest of the profile.

## Recruiter/company requirements
- Recruiter MUST belong to an authorized company context for company-owned operations.
- Recruiter MAY search/filter candidate profiles using approved professional fields.
- Recruiter MAY save candidates and create saved lists.
- Recruiter MAY initiate candidate conversations.
- Recruiter navigation MUST be Search, Saved Lists, Messages and Company Account.

## Company onboarding
- Company setup MUST support Country and Commercial Registration Number.
- Company setup MUST NOT require US-specific EIN as the generic verification model.

## Prohibited functionality
- Job application and ATS/talent-pipeline flows.
- Candidate job search and job posting flows.
- Public social feeds/public candidate showcases.
- Face, personality or voice scoring and AI match-radar claims.
- Unsupported match/ghosting performance claims.
- Interview scheduling/live rounds.
- Studio credits or recording quotas.
- User-facing video quality controls above 720p.
- Admin navigation exposed in normal public/candidate/recruiter navigation.

## Security requirements
- Authorization MUST be enforced server-side.
- Company-owned records MUST be tenant-scoped.
- Candidate-owned records MUST be subject-scoped.
- Cross-tenant access MUST be tested.
- Direct API attempts to bypass recruiter-only conversation initiation MUST fail.
- External inputs, media metadata and links MUST be validated.
- Sensitive actions MUST use OGroup logging/audit conventions.

## Localization requirements
- Arabic and English MUST be supported.
- Arabic MUST render RTL and is the pilot default language.
- English MUST render LTR.
