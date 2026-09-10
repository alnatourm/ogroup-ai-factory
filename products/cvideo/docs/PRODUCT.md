# CVIDEO Product Contract v1.0

## Product thesis
CVIDEO is a video-first reverse-employment talent discovery network. Candidates create a reusable professional identity centered on a short introduction video. Companies search the talent pool directly, watch candidate videos, inspect deeper profile evidence, save candidates, start conversations, and request interviews.

The product reverses the traditional recruitment sequence. It does not begin with a vacancy and hundreds of applications. It begins with a company's need and a searchable pool of people.

## Core journey
Company need -> Search -> Watch -> Save -> Chat -> Interview

Candidate journey -> Register -> Build profile -> Publish short professional video -> Get discovered -> Reply to company contact -> Accept / reschedule / decline interview request.

## Candidate
A candidate owns one professional profile shared by web and mobile.

Required/important profile data includes:
- name and profile photo
- country and city
- professional field/category and subcategory
- preferred job titles
- skills
- years of experience and experience history
- education
- languages
- certificates with optional supporting files/links
- professional summary/notes
- short professional introduction video
- optional traditional CV/resume

The introduction video is the primary screening asset. The traditional CV is optional and secondary.

Initial primary video target: 30 seconds. The implementation may support replacement/re-recording, but long-form candidate videos must not become the main browsing experience.

Candidate primary navigation:
- Home
- Messages
- Profile

Candidates do not browse vacancies and do not apply to jobs. Candidates do not browse other candidates. Candidates cannot cold-message companies. They may reply only after a company-side user initiates contact.

Candidate Home may show profile completeness, video status, profile/video views, company contact activity, and interview requests.

## Company / Recruiter
A company account represents an employer tenant. Authorized company users can:
- search the candidate pool
- combine structured filters
- watch candidate introduction videos rapidly
- open a full candidate profile
- save/shortlist candidates
- organize candidates into Saved Lists
- initiate chat
- request/book interviews
- manage company profile and authorized users according to role

Company/recruiter primary navigation:
- Search
- Saved Lists
- Messages
- Company Account

## Search
Search is the heart of the company experience. Filters should support combinations such as:
- field/category
- subcategory/specialization
- job title / preferred job title
- skills
- years of experience
- certificates
- country
- city
- languages
- availability where implemented

Search must remain simple and fast. Recruiters should be able to move from a requirement to relevant candidate videos with minimal friction.

## Video discovery experience
The recruiter discovery experience may use a fast vertical, swipe-friendly video interface inspired by modern short-video products, but CVIDEO is not a social network.

The screen should prioritize:
- candidate video
- name
- professional headline
- location
- experience summary
- skills
- save action
- chat action
- request interview action

Recruiters may swipe/advance quickly between matching candidates. Do not add followers, public comments, viral likes, entertainment feeds, creator mechanics, or public popularity contests.

## Full candidate profile
The full profile provides deeper evidence after the 30-second screening layer:
- experience history
- education
- certificates
- languages
- skills
- preferred roles
- professional summary
- optional CV

Design principle: video for fast screening, profile for evidence.

## Messaging
Only an authorized company-side user can create the initial candidate conversation.

After the company starts the conversation, both sides may exchange messages.

This rule must be enforced by the backend, not only by hiding UI controls.

## Interviews
Interview requests are part of CVIDEO v1 product scope.

An authorized company user may request an interview with a candidate after discovering them. An interview request may contain:
- intended role/title
- date
- time
- duration
- message/notes
- meeting type

Initial meeting types:
- Google Meet
- in-person
- other/manual video meeting where useful

Candidate actions:
- Accept
- Suggest another time
- Decline

Google Meet integration should be implemented behind a calendar/meeting provider boundary so other providers can be added later.

A job posting is not required in order to create an interview request.

## Saved Lists
Recruiters may save candidates and organize them into named Saved Lists. Lists are internal company resources and must be tenant-isolated.

Examples: Senior Developers, Amman Sales, September Shortlist.

Do not model them as an ATS application pipeline.

## Company verification
Company onboarding should use internationally adaptable fields including Country and Commercial Registration Number. New companies begin in a pending verification state. Platform administrators control verification state.

## Roles
Canonical roles:
- super_admin
- company_owner
- company_admin
- recruiter
- candidate

Company data must be tenant-isolated.

## Platforms
CVIDEO is one product with one backend and one database serving:
- responsive web application
- iOS/Android mobile application
- protected admin web application
- versioned API

The web and mobile products must share the same business rules and backend source of truth.

## Localization
Arabic and English are first-class. Arabic must support RTL and English LTR without duplicating business logic.

## Explicit exclusions
CVIDEO v1 does not include:
- candidate job browsing
- Apply buttons or traditional job application flows
- job-board-first product design
- ATS application pipelines
- public candidate social network features
- public candidate comments/followers
- employment AI scoring
- face, personality, attractiveness, emotion, honesty, voice, or employability scoring
- fake match percentages or unsupported hiring-performance claims

## Design direction
CVIDEO should feel fast, premium, human and video-first. Recruiter discovery should have the speed of a modern short-video interface while remaining a professional HR product.

The preferred reference direction is a dark, immersive portrait-video discovery screen with concise candidate data and immediate Save / Chat / Interview actions. This is a visual reference, not permission to import unrelated features such as AI match scores.

## Success principle
CVIDEO succeeds when a recruiter can identify promising people faster than traditional CV-first screening, while a strong candidate can be discovered even when their traditional CV would not have attracted attention.

## Governing principle
The frozen product contract is owned by OGroup Factory. Design and builder tools may implement it, but may not silently redefine it.
