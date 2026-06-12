# Skill Routing Guide — Event Ticket System

> Guideline nội bộ cho agent: **đọc trước khi code**, chọn skill theo loại task, không mặc định skill design cho dashboard/product UI.

---

## 0. Pre-flight (mọi task)

Thực hiện theo thứ tự, trước khi sửa file:

| Bước | Nguồn | Khi nào |
|------|--------|---------|
| 1 | `AGENTS.md` (root) | Luôn luôn — kiến trúc hexagonal, RBAC, BullMQ, invariants |
| 2 | `docs/SPEC.md` | Feature mới / nghiệp vụ booking, payment, check-in, waitlist |
| 3 | `docs/ARCHITECTURE.md` | Chạm nhiều module, transaction, queue |
| 4 | `.serena/memories/conventions.md` | Nhắc: tiếng Việt, ownership ở service, idempotency |
| 5 | `git status` + diff | Biết phạm vi thay đổi hiện tại, tránh trùng/lệch |
| 6 | **CodeGraph** (`.codegraph/`) | Explore/debug/impact — ưu tiên `codegraph explore` (MCP) hoặc CLI trước grep/read |
| 7 | **Đọc skill** (Read tool) | Chỉ sau khi đã xác định loại task ở mục 2 |

**Quy tắc vàng:** Skill local (`.agents/skills/`) **ưu tiên hơn** skill global khi cùng domain (Stripe, design).

---

## 1. Bản đồ tài liệu project

| File | Vai trò |
|------|---------|
| `AGENTS.md` | Source of truth kỹ thuật cho agent |
| `docs/SPEC.md` | Yêu cầu sản phẩm theo phase |
| `docs/TECH_STACK.md` | Stack tóm tắt (Nest, Next 15, Stripe, BullMQ…) |
| `docs/STRIPE_SETUP.md` | Setup Stripe local |
| `docs/MANUAL_TESTING_PLAN.md` | UAT thủ công |
| `design_SKILL.md` | **Lingo** — playful, Nunito, màu sáng (#58cc02…) — brand UI dự án |
| `apps/web/AGENTS.md` | Next.js **khác bản cũ** → đọc `node_modules/next/dist/docs/` trước khi code web |
| `apps/api/.claude/skills/generate/SKILL.md` | CLI scaffold entity/property — **không viết tay entity** |

---

## 2. Decision tree — chọn skill theo loại task

```
User request
    │
    ├─ Backend NestJS module / API / repository?
    │     → AGENTS.md §2 + nestjs-patterns + hexagonal-architecture
    │     → Entity/schema mới? → apps/api generate skill
    │     → Migration? → database-migrations
    │     → Transaction/inventory? → postgres-patterns + AGENTS.md §5, §13
    │
    ├─ Stripe / payment / webhook?
    │     → .agents/skills/stripe-best-practices (đọc references/payments.md, security.md)
    │     → Nâng version API/SDK? → upgrade-stripe
    │     → KHÔNG dùng stripe-projects (provision cloud) trừ khi user hỏi projects.dev
    │
    ├─ Frontend product UI (dashboard, form, table, staff, booking)?
    │     → react-patterns + frontend-a11y
    │     → Next.js API lạ? → documentation-lookup + apps/web/AGENTS.md
    │     → Polish interaction/motion? → emil-design-eng
    │     → KHÔNG design-taste-frontend / gpt-taste / high-end-visual (chỉ marketing)
    │
    ├─ Frontend marketing / landing / hero redesign?
    │     → design-taste-frontend (đọc Brief Inference trước)
    │     → Có sẵn UI cần nâng? → redesign-existing-projects
    │     → Cần mockup trước code? → imagegen-frontend-web hoặc image-to-code
    │     → GSAP scroll cinematic? → gpt-taste
    │
    ├─ Chọn aesthetic cụ thể?
    │     → Playful / Lingo brand → design_SKILL.md
    │     → Editorial tối giản → minimalist-ui
    │     → Dashboard brutalist / telemetry → industrial-brutalist-ui
    │     → Agency premium / Awwwards → high-end-visual-design
    │     → Logo / brand deck → brandkit (chỉ sinh ảnh)
    │     → Google Stitch → stitch-design-taste → DESIGN.md
    │
    ├─ Bug / regression?
    │     → CodeGraph (`codegraph explore` / `codegraph impact`) → orch-fix-defect
    │     → User yêu cầu review diff → review-bugbot / review-security skills
    │
    ├─ Feature lớn nhiều bước (module mới end-to-end)?
    │     → product-capability hoặc intent-driven-development (nếu spec mơ hồ)
    │     → orch-add-feature / orch-build-mvp
    │
    ├─ Refactor không đổi behavior?
    │     → orch-refine-code
    │
    ├─ Commit / PR?
    │     → User rule committing-changes-with-git / creating-pull-requests
    │     → verification-loop + task_completion (.serena)
    │
    └─ Output phải đầy đủ file, cấm // ... ?
          → full-output-enforcement
```

---

## 3. Skill local (`.agents/skills/`) — trigger cụ thể

| Skill | Kích hoạt khi | Không dùng khi |
|-------|----------------|----------------|
| **stripe-best-practices** | Sửa `payments/`, webhook, PaymentIntent, Stripe DTO | Chỉ đổi UI hiển thị giá |
| **upgrade-stripe** | Bump `@stripe/stripe-js`, API version, breaking changelog | Bug logic không liên quan version |
| **stripe-projects** | User cần provision DB/Redis qua Stripe Projects | Project này dùng Docker Compose local |
| **design-taste-frontend** | Landing, portfolio, trang marketing mới | Staff dashboard, bảng vé, admin |
| **redesign-existing-projects** | Nâng UI trang **đã có**, audit anti-AI-slop | Module backend |
| **emil-design-eng** | Review polish: transition, loading, micro-interaction | Logic API |
| **minimalist-ui** | Editorial / document-style, warm monochrome | Lingo playful (design_SKILL.md) |
| **industrial-brutalist-ui** | Analytics dạng blueprint, telemetry | Customer-facing thân thiện |
| **high-end-visual-design** | Marketing cao cấp, motion agency-tier | CRUD nội bộ |
| **gpt-taste** | Landing + GSAP ScrollTrigger bắt buộc | App Router product pages |
| **imagegen-frontend-web** | Cần **1 ảnh / section** làm reference trước code | Chỉ sửa 1 button |
| **image-to-code** | Workflow image-first: sinh ảnh → implement | Hotfix nhỏ |
| **imagegen-frontend-mobile** | Mockup app mobile (chỉ ảnh) | Web staff dashboard |
| **brandkit** | Brand guidelines board, logo system | Component code |
| **stitch-design-taste** | Tạo `DESIGN.md` cho Google Stitch | Implement trực tiếp Next.js |
| **full-output-enforcement** | User cần full file, nhiều component, cấm placeholder | Câu hỏi giải thích ngắn |
| **design-taste-frontend-v1** | Chỉ khi cần tương thích hành vi v1 cũ | Mặc định dùng v2 |

---

## 4. Skill global — map theo module dự án

| Module / vùng code | Skill global |
|--------------------|--------------|
| `apps/api/src/**` (Nest) | `nestjs-patterns`, `hexagonal-architecture` |
| Entity mới | `apps/api/.claude/skills/generate` |
| Booking, ticket-types inventory | `postgres-patterns`, AGENTS §13 invariants |
| BullMQ jobs | Pattern trong AGENTS §4 (không skill riêng bắt buộc) |
| `apps/web/app/**` | `react-patterns`, `react-performance`, `frontend-a11y` |
| Next.js 15 lạ | `nextjs-turbopack`, `documentation-lookup` |
| Auth, JWT, RBAC | `security-review` |
| Payment endpoint | `security-review` + `stripe-best-practices` |
| E2E / verify trước ship | `verification-loop`, `e2e-testing` |
| Explore codebase | **CodeGraph** (`codegraph explore`, `codegraph query`, `codegraph map`) — ưu tiên trước grep |
| Stripe trong `.agents/skills/stripe-best-practices/references/` | Đọc file reference tương ứng trước khi code |

---

## 5. Map SPEC phase → skill bundle

| Phase (SPEC) | Backend | Frontend | Skill bắt buộc |
|--------------|---------|----------|----------------|
| 1 Auth & Users | auth, users | login, register | security-review |
| 2 Events & Ticket types | events, ticket-types | organizer UI | generate (entity mới) |
| 3 Booking & Payment | bookings, payments | checkout, Stripe Elements | stripe-best-practices, postgres-patterns |
| 4 Check-in | check-in | staff scanner/dashboard | AGENTS check-in flow, frontend-a11y |
| 5 Waitlist / Refund | waitlist, payments | customer waitlist | BullMQ idempotency |
| 6 Analytics | analytics | charts/dashboard | industrial-brutalist-ui *nếu* redesign analytics UI |
| 7 DevOps | docker, CI | — | deployment-patterns, docker-patterns |

---

## 6. Workflow chuẩn khi bắt đầu bước tiếp theo

### A. Task nhỏ (1–3 file, rõ ràng)
1. Pre-flight mục 0 (bỏ qua orch-*)
2. Đọc file liên quan trong repo
3. 0–1 skill domain (nestjs / stripe / react)
4. Implement → `read_lints` file đã sửa
5. Build/lint app bị ảnh hưởng (`.serena/memories/task_completion.md`)

### B. Task UI trang mới (marketing)
1. `design-taste-frontend` → viết **Design Read** 1 dòng
2. Cân nhắc `design_SKILL.md` (Lingo) nếu đúng brand event ticket
3. Optional: `imagegen-frontend-web` nếu user muốn comp trước
4. `frontend-a11y` trước khi coi xong

### C. Task UI product (staff dashboard, my-tickets…)
1. **Không** gpt-taste / high-end-visual mặc định
2. Shadcn/UI patterns có sẵn trong repo
3. `emil-design-eng` nếu tinh chỉnh cảm giác (sheet, table, loading)
4. `react-patterns` + ownership API qua `lib/api.ts`

### D. Task backend module mới
1. AGENTS.md §2 folder structure
2. `generate` skill nếu entity mới
3. Service ownership + RBAC
4. Stripe/webhook → raw body + idempotency checklist §13

### E. Task phức tạp / spec mơ hồ
1. `intent-driven-development` hoặc `product-capability`
2. `orch-add-feature` hoặc `SwitchMode` plan nếu nhiều trade-off
3. Chia PR nhỏ: `split-to-prs` nếu user yêu cầu

---

## 7. Xung đột & ưu tiên

| Tình huống | Quyết định |
|------------|------------|
| design-taste vs design_SKILL.md (Lingo) | Product pages đã có Shadcn → giữ Shadcn; trang marketing/event → Lingo |
| design-taste vs minimalist-ui | User nói "playful/event" → Lingo; "editorial/calm" → minimalist |
| stripe-best-practices vs AGENTS.md PaymentIntent | AGENTS mô tả flow dự án; stripe skill cho API details & security |
| Viết tay entity vs generate CLI | **Luôn generate** (apps/api CLAUDE.md) |
| Nhiều skill design cùng lúc | Chọn **một** aesthetic skill + optional emil-design-eng cho polish |
| Global vs local Stripe skill | Local `.agents/skills/stripe-best-practices` |

---

## 8. Checklist trước khi coi task xong

- [ ] Invariants AGENTS §13 (oversell, QR HMAC, webhook idempotency…) nếu chạm booking/payment/check-in
- [ ] Swagger decorators cho endpoint mới
- [ ] `npm run lint` / `npm run build` app bị ảnh hưởng
- [ ] Trả lời user bằng **tiếng Việt**
- [ ] Không commit trừ khi user yêu cầu

---

## 9. Ví dụ nhanh (context repo hiện tại)

| User muốn | Skill chain |
|-----------|-------------|
| Hoàn thiện staff dashboard `[eventId]` | react-patterns → frontend-a11y → emil-design-eng (sheet/table) → AGENTS check-in |
| PATCH ticket status API | nestjs-patterns → AGENTS RBAC → security-review |
| Trang browse events đẹp hơn | redesign-existing-projects → design_SKILL.md (Lingo) |
| Fix Stripe webhook | stripe-best-practices (security.md) → AGENTS raw body |
| Thêm entity `PromoCode` field | generate skill → database-migrations |

---

## 10. CodeGraph (local code intelligence)

Index nằm tại `.codegraph/` (đã gitignore). Sau thay đổi code lớn: `codegraph sync`.

| Mục đích | Lệnh / tool |
|----------|-------------|
| Trả lời "X hoạt động thế nào?" | MCP `codegraph_explore` hoặc `codegraph explore "..."` |
| Tìm symbol + callers/callees | `codegraph query <tên>` |
| Impact trước khi sửa | `codegraph impact <symbol>` |
| File kết nối nhiều nhất | `codegraph map` |
| Kiểm tra index | `codegraph status` |

**Quy tắc agent:** Khi explore/debug codebase, **ưu tiên CodeGraph** trước grep/read hàng loạt. Không dùng GitNexus.

---

*Cập nhật: 2026-06-11. Bổ sung skill mới vào mục 3 và decision tree mục 2.*
