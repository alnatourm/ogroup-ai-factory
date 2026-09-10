# CVIDEO Design Brief v1.0

## Design objective
Design a premium, fast, video-first reverse-employment experience for web and mobile. The product should help recruiters screen candidates quickly while preserving enough professional context to make good next-step decisions.

## Visual personality
- modern
- professional
- premium
- human
- minimal
- high-contrast
- fast
- video-led

Avoid generic ATS dashboards, cluttered enterprise tables, excessive gradients, neon overload, or childish startup visuals.

## Core visual reference
Recruiter discovery should use an immersive portrait-video layout inspired by modern short-video interfaces. Large video area, concise professional data, immediate actions, and fast swipe/advance behavior.

Do not copy unrelated reference features such as AI match percentages, public likes, creator mechanics, or social-network engagement counters.

## Design system direction
Primary dark: #0B132B
Primary blue: #2563EB
Video accent cyan: #22D3EE
Background: #F8FAFC
Card: #FFFFFF
Primary text: #0F172A
Secondary text: #64748B
Border: #E2E8F0
Success: #16A34A
Warning: #F59E0B
Error: #DC2626

Typography:
- English: Inter
- Arabic: Cairo or Noto Sans Arabic

Arabic is first-class RTL. English is LTR.

## Candidate navigation
Web/mobile primary destinations:
- Home
- Messages
- Profile

Candidate must not see Jobs, Applications, Browse Candidates, or company cold-contact tools.

## Recruiter navigation
Web/mobile primary destinations:
- Search
- Saved Lists
- Messages
- Company Account

## Recruiter discovery screen
Prioritize:
1. candidate video
2. candidate name and professional headline
3. city/country
4. years of experience
5. concise skills
6. Save
7. Chat
8. Request Interview
9. open full profile

The screen should support quick next/previous or swipe navigation across search results.

## Full candidate profile
Show:
- intro video prominently
- profile photo/name/headline
- location
- preferred roles
- skills
- experience
- education
- certificates
- languages
- professional summary/notes
- optional CV
- Save to List
- Chat
- Request Interview

Video must remain visually more important than the CV.

## Candidate profile editing
Make onboarding fast and progressive. Candidate should be able to register quickly and complete profile sections without a long intimidating form.

Core fields:
- name
- photo
- country/city
- field/category/subcategory
- preferred roles
- skills
- years of experience
- experience history
- education
- languages
- certificates
- professional notes/summary
- 30-second introduction video
- optional CV

## Candidate Home
Useful blocks:
- profile completeness
- video status
- profile/video views
- recent company conversations
- interview requests

No jobs feed.

## Messaging
Professional, minimal chat UI. Company starts first conversation. Candidate can reply after contact is established.

## Interview request
Company flow should be extremely short:
- role/title
- date
- time
- duration
- meeting type
- optional message

Candidate response UI:
- Accept
- Suggest another time
- Decline

Google Meet should be visually supported as a meeting type without making the UI dependent on Google branding.

## Web layout
Desktop authenticated app may use a compact sidebar plus content area. Recruiter discovery may switch to an immersive full-height video mode.

Responsive tablet/mobile web must remain fully usable.

## Mobile layout
Candidate bottom navigation:
Home | Messages | Profile

Recruiter bottom navigation:
Search | Saved | Messages | Account

Use large touch targets and native-feeling navigation.

## Components
Design reusable components for:
- buttons
- inputs
- search/filter chips
- multi-select
- candidate video card
- video player
- candidate profile section
- saved list card
- chat list/item/message
- interview request card/modal
- certificate item
- empty state
- skeleton/loading states
- verification badge/status

## Explicit design prohibitions
Do not design:
- Apply button
- job browsing
- job-posting-first flows
- applications page
- ATS pipeline
- candidate match score
- AI match radar
- personality/face/voice/emotion scoring
- public comments/followers
- public social profile engagement mechanics

## Deliverables expected from design tool
Create responsive English and Arabic RTL designs for:
- public landing page
- candidate registration/login
- candidate onboarding
- candidate Home
- candidate Messages
- candidate Profile/View/Edit
- recruiter registration/login/company onboarding
- recruiter Search filters
- recruiter video discovery
- recruiter full candidate profile
- Saved Lists
- recruiter Messages
- interview request/booking
- Company Account
- protected Admin screens

Provide consistent design tokens and reusable components so the builder implements one system rather than isolated mockups.
