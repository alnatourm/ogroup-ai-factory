# CVideo Slice 1 Source Audit

## Purpose
Prevent the factory from modifying the wrong CVideo implementation while executing Slice 1.

## Located repository
`moeotech/cvideo`

## Observed repository shape
The located repository is an Android/Kotlin project. Its root includes Gradle files and an `app/` module. The implementation tree includes files such as `app/src/main/java/com/example/MainActivity.kt` and `VideoCaptureScreen.kt`.

This does not match the React/Vite web implementation described by the merged CVideo pilot, which includes routes such as `/login`, `/register/candidate`, and `/register/company`, React Router, Tailwind v3, design tokens, and shared React form components.

## Connector authority
Current GitHub connection has read access to `moeotech/cvideo` but no push permission. The factory must not fabricate a branch, write result, or completion claim against a read-only repository.

## Decision
Do not implement Slice 1 changes in `moeotech/cvideo` until it is confirmed to be the intended product surface. Do not create a shadow copy merely to make progress look complete.

The actual React/Vite source repository remains **NOT VERIFIED**.

## Slice 1 readiness checklist
Before code mutation:
- identify the repository containing the React/Vite CVideo web source
- verify write permission
- verify the branch to use as the current product baseline
- inspect candidate and recruiter navigation
- search approved routes/components for Apply, job search, job posting, ATS/pipeline, AI scoring, public-feed, interview scheduling, studio quota, admin-nav, and 1080p concepts
- preserve compliant auth, localization and design-system work
- apply changes through a dedicated branch and PR
- keep Slice 1 open until code evidence and CI evidence exist

## Governance
Repository discovery is evidence gathering, not implementation completion. Unknown source location remains NOT VERIFIED rather than being guessed.
