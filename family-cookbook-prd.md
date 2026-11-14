# Product Requirements Document: Family Cookbook

**Status:** Draft v0.2
**Date:** 14 November 2026
**Owner:** Daniel Cook
**Project type:** Personal / portfolio project

**Changes in v0.2:** Open questions resolved. Added a quick-capture flow and a Person entity, chose the stack and hosting approach, moved backups and parts of kitchen mode into the MVP, dropped single-recipe PDF export, added a public demo deployment, and reordered the milestones.

---

## 1. Overview

Family Cookbook is a simple web app for preserving recipes that have been passed down through a family. Many of these exist only in a worn, stained binder or on handwritten cards that could be lost or damaged. The app lets a family record each recipe digitally, alongside a photo of the original and the story behind it, and keep it safe, searchable and printable.

### 1.1 Problem

- Family recipes are stored in a fragile physical binder with a single copy.
- The handwriting, stains and annotations are part of the recipe's character but are easy to lose.
- The stories and context behind recipes (who made it, when, why it matters) are rarely written down at all.
- Relatives who live elsewhere cannot access the collection.

### 1.2 Vision

A warm, simple, private home for a family's recipes that feels like a cherished cookbook rather than a database.

### 1.3 Goals

1. Replace the physical binder with a digital collection the family uses when cooking.
2. Capture each recipe's **story**, not just its ingredients and method.
3. Keep the original handwriting visible by storing a photo of the source card or page.
4. Be simple enough that the least technical family member can find and follow a recipe.
5. Produce a finished, deployed project suitable for a portfolio.

**Priorities:** Portfolio quality drives build decisions (stack, testing, architecture). The audience is family members looking up recipes while they cook, so their needs drive product and UX decisions.

### 1.4 Non-goals (v1)

- Monetisation, subscriptions or public marketing.
- A public recipe-sharing community or social feed.
- Meal planning, shopping lists, nutrition calculation or cooking timers.
- Importing recipes from other websites.
- Native mobile apps (an installable responsive website is sufficient).
- Offline access.
- Converting or parsing measurements.
- AI features such as handwriting recognition (see Future Ideas).
- Public share links for individual recipes.

---

## 2. Users

| User                           | Description                                                                                | Needs                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Curator / admin** (primary)  | The project owner, who digitises the binder and is the only person entering recipes in v1. | Fast capture of many recipes; transcribe later; edit and organise; print; confidence nothing is lost.                   |
| **Family reader**              | Relatives who browse and cook.                                                             | Simple sign-in that stays signed in; fast search; recipes readable at arm's length on a phone or tablet in the kitchen. |
| **Family contributor** (later) | Relatives who add their own recipes.                                                       | Not in v1. The role exists in the data model but is not used.                                                           |
| **Portfolio reviewer**         | Someone evaluating the project.                                                            | A public demo they can explore without an invite; a clear README.                                                       |

---

## 3. User Stories

**Capturing and editing**

- As a curator, I can quickly save a recipe with just a title and photos of the original card, so I can photograph the whole binder in one sitting and type recipes up later.
- As a curator, I can see a "to type up" list of recipes not yet transcribed.
- As a curator, I can add ingredients, method, notes, story, attribution and tags to a recipe.
- As a curator, I can edit a recipe, or delete it and restore it from the trash if I made a mistake.

**Browsing and cooking**

- As a reader, I can browse all recipes in a grid with images, titles and attribution.
- As a reader, I can search by recipe name, ingredient, person or story text.
- As a reader, I can filter by tag or by who the recipe came from.
- As a reader, I can follow a recipe on my phone or tablet in a large, clear layout, with the screen kept awake.
- As a reader, I can still read an untranscribed recipe from the photo of its original card.

**Sharing and preserving**

- As a curator, I can print a recipe or save it as a PDF to give copies to relatives.
- As a curator, I know the whole collection, including the preservation copies of the original cards, is backed up every night.
- As a curator, I can give specific family members read access so that only family can see the collection.

---

## 4. Functional Requirements

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (later).

### 4.1 Recipe management

| ID  | Requirement                                                                                                                                                                                       | Priority |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R1  | Create a recipe with: title (required), ingredients, method, notes, story.                                                                                                                        | M        |
| R2  | Ingredients entered in a text box, one item per line. A line ending in `:` becomes a section heading (e.g. "For the pastry:"). Stored as structured JSON.                                         | M        |
| R3  | Method entered the same way, one step per line, with optional section headings.                                                                                                                   | M        |
| R4  | Upload one **finished dish photo** per recipe (optional).                                                                                                                                         | M        |
| R5  | Upload one or more **original source images**, displayed separately from the dish photo, with optional caption and ordering. Uploads accept the phone camera directly.                            | M        |
| R6  | **Story** field: a single free-text anecdote about the recipe.                                                                                                                                    | M        |
| R6a | **Notes** field: practical tips (e.g. "Mum used half the sugar"), separate from the story.                                                                                                        | M        |
| R7  | **Attribution:** "Recipe from" chosen from a list of people (typeahead with "add new"), plus approximate year or decade as free text.                                                             | M        |
| R8  | Edit recipes. Deletion is a **soft delete**: the recipe goes to a trash view and can be restored. Images are only removed when a recipe is purged from the trash. Deleting asks for confirmation. | M        |
| R8a | **Quick capture:** save a recipe with only a title and source image(s). The recipe has status `needs_transcribing` until it is marked `complete`.                                                 | M        |
| R9  | Optional extra fields: servings, prep time, cook time, oven temperature.                                                                                                                          | S        |
| R10 | Free-form tags with typeahead suggestions from existing tags. Seeded with Starters, Mains, Puddings, Baking, Christmas.                                                                           | M        |
| R11 | Mark a recipe as "In memory of" a family member.                                                                                                                                                  | C        |

Measurements are kept as free text exactly as written in the original. They are not parsed or converted.

### 4.2 Browsing and search

| ID   | Requirement                                                                                                                                                                                                                   | Priority |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R12  | Home page listing all recipes as cards with image, title and attribution. Card image: dish photo, otherwise first source image, otherwise a styled text-only card. Untranscribed recipes show a "not yet typed up" marker.    | M        |
| R13  | Postgres full-text search over title (highest weight), ingredients, person name, notes and story.                                                                                                                             | M        |
| R14  | Filter by tag and by person. Admin also has a "to type up" filter.                                                                                                                                                            | M        |
| R15  | Recipe detail page, ordered for cooking: title and attribution → ingredients → method → notes → story → source images. On desktop, the source image sits in a side column. Untranscribed recipes show the source image large. | M        |
| R16  | Click a source image to view it full-size.                                                                                                                                                                                    | S        |
| R17a | Recipe page uses large, readable type by default, plus a **keep screen awake** toggle (Wake Lock API).                                                                                                                        | M        |
| R17b | Separate high-contrast kitchen mode.                                                                                                                                                                                          | C        |

### 4.3 Users and access

| ID  | Requirement                                                                                                                                                                | Priority                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| R18 | The collection is **private**: sign-in is required to view anything. No public share links in v1.                                                                          | M                        |
| R19 | Sign-in with a **6-digit email code** (one-time password), not a magic link or password. Long-lived sessions so a kitchen tablet stays signed in. Public sign-up disabled. | M                        |
| R20 | Access controlled by an **email allowlist**. Managed with SQL in M1 and from a simple admin page in M5.                                                                    | M (SQL) / S (admin page) |
| R21 | Roles: `admin` (full control) and `reader` (view only), enforced by Postgres row-level security. A `contributor` role exists in the schema but is not used in v1.          | M                        |
| R22 | Show who added each recipe.                                                                                                                                                | C                        |

### 4.4 Output and preservation

| ID  | Requirement                                                                                                                                                                                                                            | Priority         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| R23 | Print-friendly layout for a single recipe, plus a "Print / Save as PDF" button that opens the browser's print dialog.                                                                                                                  | M                |
| R24 | ~~Server-generated single-recipe PDF.~~ Dropped: R23 covers it.                                                                                                                                                                        | —                |
| R25 | Export the full collection as a printable cookbook PDF (cover, contents, one recipe per page).                                                                                                                                         | C (stretch goal) |
| R26 | **Nightly automated backup** of the database and all image versions to Cloudflare R2, keeping 30 nightly copies plus monthly snapshots. Not done until a restore into a fresh local Supabase has been run successfully and documented. | M                |
| R27 | "Download everything" export button in the app.                                                                                                                                                                                        | C                |

### 4.5 Demo and installability

| ID  | Requirement                                                                                                                                                                             | Priority |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R28 | **Public demo deployment**: separate Supabase project seeded with invented sample recipes and source images, with a "Sign in as demo reader" button. Real family data is never exposed. | M        |
| R29 | Installable web app (manifest and icons) so relatives can add it to their home screen. No offline support.                                                                              | M        |

---

## 5. Data Model

**Recipe**

- `id`
- `title` (required)
- `status` (`needs_transcribing` | `complete`)
- `ingredients` (JSON: ordered list of `{type: 'heading' | 'item', text}`)
- `method` (JSON: same shape)
- `notes` (text, optional)
- `story` (text, optional)
- `person_id` (→ Person, optional: "Recipe from")
- `year_or_era` (text, optional, e.g. "1960s")
- `servings`, `prep_time`, `cook_time`, `oven_temp` (optional, text)
- `dish_photo_id` (→ Image, optional)
- `search_vector` (generated tsvector for full-text search)
- `created_by` (→ User)
- `created_at`, `updated_at`, `deleted_at` (soft delete)

**Person** (who a recipe came from; most will never have an account)

- `id`, `name`, `relationship` (optional, e.g. "my grandmother")

**Image**

- `id`, `original_path`, `display_path`, `thumb_path`, `width`, `height`

**RecipeSourceImage** (source scans, ordered)

- `recipe_id`, `image_id`, `caption` (optional), `sort_order`

**Tag**

- `id`, `name` (unique, case-insensitive)

**RecipeTag** (join)

- `recipe_id`, `tag_id`

**User / Profile** (linked to Supabase Auth)

- `id`, `name`, `email`, `role` (`admin` | `contributor` | `reader`)

**AllowedEmail**

- `email`, `role`, `invited_at`

---

## 6. Non-Functional Requirements

| Area                       | Requirement                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Usability**              | A reader can find and follow a recipe on a phone without help. The curator can quick-capture a recipe in under a minute. Large tap targets and readable fonts for older users.                   |
| **Responsive design**      | Fully usable on phone, tablet and desktop. Phone and tablet are the priority, for cooking and for photographing source cards.                                                                    |
| **Accessibility**          | Meets WCAG 2.1 AA: sufficient colour contrast, keyboard navigation, alt text for images.                                                                                                         |
| **Performance**            | Pages load in under 2 seconds on a typical connection. The grid uses thumbnails and the detail page uses display-size images.                                                                    |
| **Privacy**                | Not publicly indexed. Only allowlisted users can view content. Images are kept in a private bucket and served only through short-lived signed URLs.                                              |
| **Reliability and backup** | Nightly off-site backups of the database and images, with a tested restore procedure. The backup job also stops the free-tier project pausing from inactivity.                                   |
| **Preservation**           | Every source image keeps a preservation copy at up to 2560px on the long edge (JPEG quality 0.85; HEIC converted). Sharp enough to read and print the card, small enough for free storage tiers. |
| **Maintainability**        | TypeScript, schema managed through migrations, CI on every push, clean README.                                                                                                                   |
| **Cost**                   | Supabase free tier, Vercel hobby tier, Cloudflare R2 free tier. Upgrade to Supabase Pro only if storage or usage outgrows the free tier.                                                         |

---

## 7. Technical Approach

- **Front end:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Back end:** Supabase: Postgres, Auth (email one-time code), Storage, row-level security.
- **Image handling:** Resized in the browser before upload into three versions: original (up to 2560px, JPEG quality 0.85, about 1 MB per card with the other versions), display (~1600px), thumbnail (~400px). Stored in a private bucket and served through signed URLs that the server creates. (Supabase image transformations are not available on the free tier.)
- **Search:** Postgres full-text search on a generated, weighted `tsvector`.
- **Hosting:** Vercel (app, with preview deploys) and Supabase.
- **Backups:** Nightly GitHub Action: `pg_dump` plus a storage sync to Cloudflare R2, with retention rotation.
- **Testing and CI:** GitHub Actions running typecheck, lint, Vitest unit tests and Playwright end-to-end tests against a local Supabase (Supabase CLI). End-to-end tests are written alongside each core flow.
- **Seed data:** One seed script supplies local development, end-to-end test fixtures and the public demo deployment.
- **Print:** CSS print stylesheet. Server-side PDF generation only if the full cookbook (R25) is pursued.

**Supabase free-tier limits to keep in mind** (check current pricing): projects pause after ~7 days of inactivity, no automatic backups, ~1 GB file storage.

---

## 8. Design Principles

1. **Warm, not corporate.** It should feel like a family heirloom: serif headings, soft paper-like colours, room for photos.
2. **Show the original.** Handwriting and stains are features. Source images appear prominently, including on cards when there is no dish photo.
3. **Story always present.** The story is never hidden behind a click, but on the recipe page it comes after the parts needed for cooking.
4. **Cooking first.** The recipe page is designed to be followed at arm's length in a kitchen.
5. **Simplicity over features.** Every screen should be understandable by a non-technical grandparent.

---

## 9. MVP Scope and Milestones

### MVP (Must-haves)

R1–R8a, R10, R12–R15, R17a, R18–R21 (allowlist via SQL), R23, R26, R28, R29.

| Milestone                | Deliverable                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **M1: Foundations**      | Project setup, schema and migrations, email-code auth with an allowlist managed by SQL, row-level security policies, CI pipeline, Vercel deployment.                                                                           |
| **M2: Core recipe flow** | Create, view, edit, soft-delete and restore recipes; quick capture; image pipeline (three versions, private bucket, signed URLs); nightly backup to R2 with a tested restore. **Begin entering real binder recipes after M2.** |
| **M3: Browse and cook**  | Home grid, full-text search, tags, person filter, "to type up" filter, cooking-first recipe layout with wake lock.                                                                                                             |
| **M4: Print and polish** | Print stylesheet, design polish, accessibility checks, installable web app, demo deployment with seed data, README with screenshots.                                                                                           |
| **M5: Family rollout**   | Admin page for the allowlist, invite family readers, gather feedback.                                                                                                                                                          |

### Post-MVP

Full-size image viewer (R16), extra fields (R9), contributor role, "show who added" (R22), "In memory of" (R11), high-contrast kitchen mode, in-app full export (R27), full cookbook PDF (R25).

---

## 10. Success Criteria

**Personal**

- The entire physical binder has been captured, with preservation copies backed up off-site.
- Most captured recipes have been transcribed.
- At least two other family members have signed in and used the app.
- A relative can find and cook a recipe from their phone or tablet without help.

**Portfolio**

- Public demo deployment with a polished, responsive interface that reviewers can explore without an invite.
- README with screenshots, architecture overview, setup and restore instructions.
- Demonstrates authentication, row-level security, database design, file upload and image processing, full-text search, automated backups, CI with end-to-end tests, and print output.

---

## 11. Risks and Mitigations

| Risk                                                     | Mitigation                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Entering every recipe is tedious, so the project stalls. | Quick capture (title and photo only) with a "to type up" queue; fast line-per-item text entry.                                         |
| Poor quality photos of old, stained cards.               | Simple photo tips; multiple images per recipe; 2560px preservation copies kept.                                                        |
| Family members find sign-in confusing.                   | Email one-time code instead of magic links; long-lived sessions; installable home-screen icon; test with the least technical relative. |
| Losing the data.                                         | Soft delete; nightly off-site backups; a documented, tested restore.                                                                   |
| Free-tier project pauses or runs out of storage.         | Nightly backup job keeps the project active; originals stored as quality-90 JPEG; upgrade to Pro if needed.                            |
| Portfolio reviewers cannot see a private app.            | Separate public demo deployment with seeded sample data.                                                                               |
| Scope creep.                                             | Hold to the MVP list; log new ideas in Future Ideas.                                                                                   |

---

## 12. Resolved Questions

| Question                                                        | Decision                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| One person entering everything, or contributors from the start? | The curator enters everything in v1. Relatives are readers from M5.    |
| Viewable by link, or sign-in only?                              | Sign-in only. Print / Save as PDF covers one-off sharing.              |
| Metric/imperial handling?                                       | None. Free text exactly as written.                                    |
| Printed physical cookbook?                                      | Stretch goal. Full-resolution originals are kept so it stays possible. |
| Tech stack?                                                     | Next.js + Supabase + Vercel (portfolio priority).                      |

---

## 13. Future Ideas (Out of Scope for v1)

- Handwriting recognition (OCR) to speed up transcription from source images.
- Voice recording: record a relative telling the story behind a recipe.
- Family tree: connect people to each other and to generations (builds on the Person table).
- Contributors: relatives adding their own recipes and stories.
- Comments and "I made this" photos from family members.
- Per-recipe share links for people without an account.
- Offline favourites for use without a connection.
- Scaling ingredient quantities by servings.
- Ordering a professionally printed cookbook.
