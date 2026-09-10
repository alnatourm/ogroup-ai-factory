# CVIDEO Stitch Master Design Prompt

Design the complete UX/UI system for **CVIDEO**, a premium video-first reverse-employment platform for web and mobile.

## Core product idea
CVIDEO reverses traditional recruitment. Candidates do not browse vacancies and do not apply to jobs. Candidates create a reusable professional profile centered on a short 30-second introduction video. Companies and recruiters search the talent pool directly, watch candidate videos, save people, start conversations, and request interviews.

Primary recruiter flow:
**Search -> Watch -> Save -> Chat -> Request Interview**

Primary candidate flow:
**Register -> Build Profile -> Upload 30s Video -> Get Discovered -> Reply to Company -> Accept/Suggest/Decline Interview**

This is not a job board, not an ATS, and not a social network.

## Platforms
Create a single coherent design system for:
- responsive marketing website
- authenticated desktop web app
- responsive mobile web
- iOS mobile app
- Android mobile app

Mobile layouts should be native-feeling and optimized for touch.

## Languages
Design every major screen in:
- English, LTR
- Arabic, RTL

Arabic is first-class. Do not merely mirror a broken English layout. Ensure navigation, alignment, chips, forms, cards, chat bubbles, dates, and video controls all work naturally in RTL.

## Visual direction
The product should feel:
- premium
- modern
- professional
- human
- fast
- minimal
- confident
- video-led

Avoid generic HR dashboards, ATS tables, heavy enterprise software, excessive gradients, neon overload, playful startup illustrations, and social-network clutter.

Use this design system direction:
- Deep navy: #0B132B
- Professional blue: #2563EB
- Video accent cyan: #22D3EE
- Background: #F8FAFC
- Card: #FFFFFF
- Primary text: #0F172A
- Secondary text: #64748B
- Border: #E2E8F0
- Success: #16A34A
- Warning: #F59E0B
- Error: #DC2626

Typography:
- English: Inter
- Arabic: Cairo or Noto Sans Arabic

Use subtle shadows, 12-16px card radii, strong spacing, clear hierarchy, and restrained animation.

## Critical visual reference
The recruiter video discovery experience should be inspired by the attached reference image: a large portrait candidate video occupying most of the screen, concise professional information layered around/below it, fast swipe or next/previous navigation, and immediate actions.

Preserve the immersive, fast screening feeling, but remove unrelated elements from the reference such as:
- AI match percentage
- public likes
- follower/social mechanics
- public comments
- creator metrics
- salary claims unless explicitly shown as candidate-provided data
- 1-click scheduling gimmicks

The CVIDEO version should be cleaner and more professional.

## Public marketing website
Create:
- header with CVIDEO logo, How It Works, For Candidates, For Companies, Pricing, language switch, Login, Get Started
- hero with message concept: **Meet the person before the CV.**
- supporting message about discovering talent through short professional introductions
- CTAs: **Find Talent** and **Create Your Profile**
- how it works for candidates
- how it works for companies
- video-first explanation section
- candidate benefits
- company benefits
- configurable pricing cards
- privacy/terms/help/contact footer

## Candidate navigation
Primary candidate navigation must contain only:
- Home
- Messages
- Profile

Do not add Jobs, Applications, Browse Jobs, Companies, Search Candidates, Interview Calendar as a main nav item, or Apply.

## Candidate screens
Design:
1. Candidate login
2. Candidate registration
3. Candidate onboarding
4. Candidate Home
5. Candidate Profile view
6. Candidate Profile edit
7. Video upload/record flow
8. Video preview/replacement state
9. Skills and preferred roles selection
10. Experience editor
11. Education editor
12. Certificates editor
13. Languages editor
14. Optional CV upload
15. Messages list
16. Conversation screen
17. Interview request detail
18. Accept interview
19. Suggest another time
20. Decline interview
21. Settings/account basics

Candidate Home should include:
- profile completeness
- 30-second video status
- profile/video watch count
- recent company conversations
- interview requests

No jobs feed.

## Candidate profile content
Profile should support:
- profile photo
- first and last name
- country
- city
- professional headline
- professional summary/notes
- main field/category
- subcategory
- up to 2 extra subfields
- up to 5 preferred job titles
- multiple skills
- years of experience
- experience history
- education
- multiple certificates
- languages
- optional CV
- 30-second introduction video

The video must be the hero. The CV is secondary.

## Recruiter/company navigation
Primary recruiter navigation must contain only:
- Search
- Saved Lists
- Messages
- Company Account

## Recruiter/company screens
Design:
1. Recruiter login
2. Company registration
3. Company onboarding
4. Company verification pending state
5. Recruiter Search page
6. Search filter drawer/panel
7. Candidate search results
8. Immersive video discovery screen
9. Full candidate profile
10. Save candidate action
11. Saved Lists overview
12. Saved List detail
13. Create/rename/delete list
14. Messages list
15. Conversation screen
16. Start conversation modal/action
17. Request Interview flow
18. Interview confirmation
19. Company Account
20. Company profile edit
21. Company users/team management

Company registration fields should visually support:
- company name
- country
- city
- commercial registration number
- industry
- company size
- website optional
- logo optional
- description
- owner/admin contact

Do not use EIN or US-specific assumptions.

## Recruiter search
Search should feel fast and simple.

Filters:
- category
- subcategory
- preferred job title
- skills
- years of experience
- certificates
- country
- city
- language
- availability where appropriate

Use clear active-filter chips, easy reset, responsive filter drawer on mobile, and compact desktop filters.

## Immersive recruiter video discovery
This is the signature CVIDEO screen.

Prioritize in order:
1. large portrait candidate video
2. candidate name
3. professional headline
4. city/country
5. years of experience
6. concise skills
7. preferred roles where useful
8. Save
9. Chat
10. Request Interview
11. Full Profile

Support swipe up/down or next/previous candidate behavior.

Candidate quick card should feel close to the attached visual reference, but cleaner.

Suggested mobile composition:
- top bar with Back, current search title/criteria, filter button
- nearly full-height portrait video
- 30s Introduction label and progress
- candidate identity and concise professional data
- skill chips
- vertical or bottom action rail for Save, Chat, Share only if product-approved later
- primary CTA: **Request Interview**
- secondary access: **Full Profile**
- subtle swipe/next hint

Do not show AI match scores.

## Full candidate profile for recruiter
Show:
- video prominently
- profile photo/name/headline
- location
- preferred roles
- skills
- years of experience
- detailed experience
- education
- certificates
- languages
- professional summary
- optional CV
- Save to List
- Start Chat
- Request Interview

## Messaging rule
Company/recruiter initiates the first conversation.
Candidate cannot cold-message a company.

Design messaging as professional and minimal.

Include:
- conversation list
- unread states
- timestamps
- message bubbles
- typing/loading states where useful
- interview request cards inside chat when appropriate

## Interview booking
Design a very short recruiter flow:
- role/title
- date
- time
- duration
- meeting type
- optional message

Meeting types:
- Google Meet
- Video Call
- In Person

Candidate response:
- Accept
- Suggest another time
- Decline

Accepted Google Meet state should show meeting confirmation and meeting link area without visually depending on Google branding for the whole product.

## Saved Lists
Use the term **Saved Lists** only.

Support:
- save candidate
- remove candidate
- create list
- rename list
- delete list
- add candidate to one or multiple lists

Do not call it pipeline, funnel, ATS stage, or application flow.

## Admin web portal
Design a separate protected admin interface for:
- overview
- users
- candidates
- companies
- company verification
- video moderation
- taxonomy management
- categories/subcategories/job titles/skills
- plans/configuration
- audit activity

Admin must not appear in candidate/recruiter public navigation.

## Mobile navigation
Candidate bottom navigation:
**Home | Messages | Profile**

Recruiter bottom navigation:
**Search | Saved | Messages | Account**

Use large touch targets and native mobile spacing.

## Required component library
Create reusable components/tokens for:
- buttons
- icon buttons
- inputs
- password input
- textarea
- select
- multi-select
- chips
- badges
- avatar
- cards
- modal
- drawer
- tabs
- dropdown
- toast
- alert
- skeleton
- empty state
- pagination
- video player
- video uploader
- candidate card
- filter panel
- saved list card
- message bubble
- conversation item
- interview request card
- certificate item
- verification status badge

## Required states
Show design states for:
- loading
- empty
- error
- success
- validation error
- pending company verification
- no video uploaded
- video processing
- video rejected/too long
- no saved candidates
- no conversations
- no interview requests
- Arabic RTL

## Accessibility
Design for:
- strong contrast
- visible focus states
- keyboard web navigation
- readable type sizes
- 44px minimum touch targets on mobile
- clear labels and errors

## Explicitly forbidden design features
Do not design:
- Apply button
- candidate job browsing
- job posting as the core workflow
- applications page
- ATS pipeline
- recruitment funnel
- candidate AI match score
- AI match radar
- personality scoring
- face scoring
- voice scoring
- emotion scoring
- public likes/followers/comments
- public candidate social feed
- creator/influencer mechanics
- candidate-to-company cold messaging
- 1080p quality toggle

## Deliverable style
Do not produce isolated unrelated mockups.
Create one coherent design system and screen family.

Prioritize these screens first if output limits require sequencing:
1. Recruiter immersive video discovery
2. Recruiter search + filters
3. Recruiter full candidate profile
4. Candidate Home
5. Candidate Profile/Edit
6. Messaging
7. Interview request/booking
8. Saved Lists
9. Company Account
10. Public website

For each screen family, provide both mobile and desktop responsive thinking, with English and Arabic RTL variants.

The result should feel like a premium professional product where **video replaces the first CV screening step** and recruiters can discover talent in seconds.