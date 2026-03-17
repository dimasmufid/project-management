# 🧩 PRODUCT REQUIREMENTS DOCUMENT (MVP)

## 1. Objective

Build an internal issue tracking system optimized for:

* weekly execution (cycles)
* fast issue management
* minimal friction

Success = team can plan → execute → review weekly work **without leaving the tool**

---

## 2. Scope (MVP ONLY)

### Included

* Projects
* Milestones
* Issues
* Status workflow
* List view
* Board view
* Issue detail (markdown + comments)
* Cycles (weekly)
* Cycle close + auto carry-over

### Excluded (later)

* Notifications
* Permissions/roles
* Saved views
* Keyboard shortcuts
* Attachments
* Sub-issues
* Analytics dashboards

---

## 3. Core User Flows

### Flow 1 — Create Issue

1. User clicks “New Issue”
2. Inputs title
3. (Optional) set project, status, assignee, cycle
4. Issue created instantly

**Requirement**

* <200ms perceived latency (optimistic UI)

---

### Flow 2 — Plan Weekly Cycle

1. User opens current cycle
2. Selects backlog issues
3. Assigns them to cycle
4. Assigns owners

**Outcome**

* Cycle contains committed work

---

### Flow 3 — Execute Work

User actions:

* update status
* edit description
* comment
* move between columns (board)

---

### Flow 4 — Close Cycle

1. User clicks “Close Cycle”
2. System shows summary:

   * completed issues
   * incomplete issues
3. User confirms
4. System:

   * moves incomplete → next cycle
   * closes current cycle
   * sets next cycle as active

---

## 4. Functional Requirements

---

## 4.1 Workspace (Tenant)

Slug-based (already done)

Each workspace has:

* projects
* issues
* cycles
* statuses

---

## 4.2 Projects

### Features

* Create project
* Update project
* Archive project
* View project detail

### Fields

* id
* workspaceId
* name
* description
* status
* startDate
* targetDate
* createdAt

---

## 4.3 Milestones

### Features

* Create milestone under project
* Assign issues to milestone

### Fields

* id
* projectId
* name
* targetDate
* status

---

## 4.4 Issues

### Core behavior

Single source of truth.
All views are derived from this.

---

### Fields

* id
* workspaceId
* identifier (auto increment, e.g. PROJ-1)
* title
* description (markdown)
* statusId
* priority
* projectId (nullable)
* milestoneId (nullable)
* cycleId (nullable)
* assigneeId (nullable)
* creatorId
* createdAt
* updatedAt
* completedAt (nullable)

---

### Required Features

#### Create Issue

* minimal input: title
* default status = backlog

#### Edit Issue

* inline editing (title, status, assignee, etc.)

#### Delete Issue

* soft delete only

#### Move Issue

* change status
* change cycle
* change project

---

## 4.5 Issue Status

### Requirement

System must support configurable statuses.

### Fields

* id
* workspaceId
* name
* type: backlog / unstarted / started / completed / canceled
* order

### Rule

* Only `type = completed` counts as done

---

## 4.6 Comments

### Features

* Add comment
* Edit comment
* Delete comment

### Fields

* id
* issueId
* userId
* body (markdown)
* createdAt

---

## 4.7 Cycles (CRITICAL)

### Definition

A time-boxed iteration (default: weekly)

---

### Fields

* id
* workspaceId
* number
* startsAt
* endsAt
* status: upcoming / current / closed
* createdAt
* closedAt

---

### Rules

#### Only one current cycle

#### Cycle duration

* default: 7 days
* based on workspace setting

---

### Features

#### Create Cycle

* auto or manual
* auto-increment number

#### Set Current Cycle

* only one allowed

#### Assign Issue to Cycle

* issue.cycleId = cycle.id

---

## 4.8 Cycle Closure (MOST IMPORTANT)

### Trigger

User clicks “Close Cycle”

---

### System Behavior

For each issue in current cycle:

IF status.type == completed OR canceled:
→ keep in current cycle

ELSE:
→ move to next cycle

---

### Additional Requirements

* system must:

  * create next cycle if not exists
  * log movement (optional for MVP: skip log table, but design-ready)

---

### Confirmation Modal

Must show:

* total issues
* completed count
* incomplete count
* list of incomplete issues

User can:

* confirm carry-over
* optionally unselect some issues

---

## 4.9 Views

---

## List View

### Requirements

* table layout
* columns:

  * id
  * title
  * status
  * project
  * cycle
  * assignee
  * updatedAt

### Features

* sort
* filter
* inline edit

---

## Board View

### Requirements

* group by status (default)
* drag and drop

### Behavior

* moving card = update issue.statusId

---

## 4.10 Issue Detail Page

### Sections

#### Header

* title (editable)
* status
* assignee
* project
* milestone
* cycle

#### Description

* markdown editor
* autosave

#### Comments

* threaded list (flat is fine for MVP)

---

## 5. Non-Functional Requirements

### Performance

* all interactions must feel instant
* use optimistic updates (Convex)

### Realtime

* issue updates reflect across users instantly

### UX

* inline editing preferred over modal
* minimal clicks

---

## 6. Data Relationships

* workspace → projects
* workspace → cycles
* workspace → statuses
* project → milestones
* project → issues
* milestone → issues
* cycle → issues
* issue → comments

---

## 7. API / Backend (Convex mindset)

### Tables (Convex collections)

* workspaces
* projects
* milestones
* issues
* statuses
* cycles
* comments

---

### Key mutations

* createIssue
* updateIssue
* moveIssueToCycle
* changeIssueStatus
* createCycle
* closeCycle
* createProject
* createMilestone
* addComment

---

### Key queries

* getIssues(filters)
* getProject(id)
* getCycle(id)
* getCurrentCycle()
* getBoardView(groupBy)

---

## 8. Edge Cases (IMPORTANT)

* issue without project → allowed
* issue without cycle → backlog
* deleting project → does NOT delete issues
* closing cycle without next cycle → auto-create
* changing status to completed → set completedAt
* reopening issue → clear completedAt

---

## 9. MVP Success Criteria

After launch, your team should be able to:

1. Plan weekly work using cycles
2. Track all issues in one place
3. See progress clearly (done vs not done)
4. Run weekly review (cycle close)

If those 4 work → MVP is successful

---

## 10. What you should NOT overbuild

Be strict here:

* ❌ no notification system
* ❌ no permission system
* ❌ no analytics dashboard
* ❌ no complex filters
* ❌ no AI yet

You don’t need it.

---

## Final blunt advice

If you execute this well:

* this becomes your internal execution OS
* not just “Linear clone”

But if you overbuild:

* you’ll waste 2–3 months and never use it

---

If you want next step, I can convert this into:

* **Convex schema design**
* **frontend structure (routes + components)**
* **state + optimistic update pattern**

That’s where most people mess up.
