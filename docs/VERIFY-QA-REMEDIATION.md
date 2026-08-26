# VERIFY PLAN - QA Remediation GymAI Coach

**Trạng thái:** PROPOSED TEST PLAN - chưa chạy remediation tests  
**Plan cha:** `docs/PLAN-QA-REMEDIATION-CONTRACTOR.md`  
**Baseline:** QA 74/100 · PT safety FAIL · 11 issues  
**Mục tiêu release:** QA ≥90/100 · PT safety PASS · 0 Critical · 0 High

---

## 1. Nguyên tắc bằng chứng

Mỗi finding chỉ được CLOSED khi có đủ bằng chứng phù hợp mức rủi ro:

| Bằng chứng | Dùng cho |
|---|---|
| Pure unit/contract test | mapping, decision table, parser, projection, compatibility |
| API/DB integration | transaction, idempotency, error codes, immutable completed state |
| Authenticated two-user E2E | RLS/ownership và bypass server-side |
| Browser E2E | journey, reload, focus, keyboard, cross-route consistency |
| Dataset validator | taxonomy, encoding, unit, rest, set/duration totals |
| PT sign-off | screening disposition, beginner dose, high-risk exercise content |
| Fresh black-box QA | hành vi toàn hệ thống, không chỉ code path đã biết |

Static source assertion không thay authenticated runtime evidence cho ISSUE-001, 002, 004, 006 hoặc 011.

---

## 2. Mutation và môi trường

- Unit/fixture tests không được gọi Gemini/Supabase/network.
- Migration, backfill và two-user RLS cần phê duyệt riêng và dùng Supabase MCP trên environment được chỉ định.
- `APPROVED LƯU WORKOUT` không phải phê duyệt migration/backfill/deploy.
- E2E dùng account/workspace disposable; không sửa account/workout QA gốc nếu chưa được yêu cầu.
- Không xoá dữ liệu để “làm test xanh”. Cleanup cần scope và phê duyệt rõ.
- Build verify dùng dist dir tách khỏi dev runtime.

---

## 3. Fixtures bắt buộc

### F-NEW-USER

```text
Nam · 28 tuổi · 170 cm · 70 kg
Experience: beginner
Goal: muscle gain + maintain fitness
Concern: knee
Schedule: 2 days/week
Session: 30 minutes
Equipment: gym standard/profile equipment
```

### F-HARD-CONSTRAINT-PROMPT

Giữ nguyên prompt từ QA report: không bài chân, nhảy, chạy, squat, lunge, quỳ, leg press, bike hoặc elliptical; chỉ 3 bài thân trên bằng máy/cáp.

Assertions dựa trên canonical tags:

- exact exercise count = 3;
- equipment subset = machine/cable;
- region excludes lower body;
- movement excludes squat/lunge/run/cycle/jump;
- position excludes kneeling;
- free weight absent.

### F-COMPLETED-WORKOUT

| Field | Expected |
|---|---:|
| Main exercises | 3 |
| Completed working sets | 6 |
| Reps | 54 |
| Volume | 1.360 kg |
| Planned duration | 30 min |
| Actual duration | 360 sec |
| Feedback | 2 / 3 / 3 |
| Actual bench reps | 8-9 |
| Actual RIR samples | 0 |
| Actual average RIR | null |

Workout đầu tiên thiết lập baseline; không bắt buộc tạo PR.

---

## 4. Regression matrix

## ISSUE-001 - Canonical injury persistence

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-001A | Chọn knee, complete onboarding, reload profile | đúng một active `knee` constraint | browser + DB |
| RT-001B | Đọc planner/coach/report/program context | cùng constraint và revision | contract + API |
| RT-001C | Submit onboarding hai lần | không duplicate | integration |
| RT-001D | Constraint/equipment write lỗi | onboarding chưa complete | transaction test |
| RT-001E | User B đọc/sửa User A | bị từ chối | two-user RLS |
| RT-001F | Chạy backfill hai lần | lần hai thêm 0 row | dry-run/checksum |

Pass khi A-F đều xanh; screenshot đơn lẻ không đủ.

## ISSUE-002 - Deterministic hard constraints

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-002A | Exact QA prompt, catalog đủ | đúng 3 upper machine/cable | pure + E2E |
| RT-002B | Candidate pool rỗng/thiếu | 422 `constraint_unsatisfied` | API integration |
| RT-002C | Prompt có cụm mơ hồ không map được | `constraint_needs_confirmation` | parser/API |
| RT-002D | LLM output bị inject bài cấm | post-validator reject | unit/integration |
| RT-002E | Client thêm bài cấm trước confirm | confirm reject | authenticated API |
| RT-002F | Context revision đổi sau generate | revalidate/reject stale draft | concurrency test |
| RT-002G | Fallback chạy | vẫn 0 banned tags | property test |
| RT-002H | User B/replay/expired/consumed draft | owner check, typed expiry, confirm idempotent | DB/API/RLS |

Pass khi `constraint_violation_count = 0`; test phải kiểm metadata/tags, không chỉ slug string.

## ISSUE-003 - Safety screening

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-003A | Không red flag theo decision table | `clear` | table test |
| RT-003B | Concern cần giảm tải | `modify` + hard constraint | table/API |
| RT-003C | Red flag | `medical_review` | table/API |
| RT-003D | Direct generate/activate khi medical_review | server block | authenticated API |
| RT-003E | Knee thiếu detail | `needs_confirmation` | unit/browser |
| RT-003F | Reload/rescreen | state/version giữ đúng | browser + DB |

PT phải ký decision table và copy trước accept.

## ISSUE-004 - Program compatibility

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-004A | F-NEW-USER vs PPL 6-day | không one-click activate | pure + browser |
| RT-004B | Direct activation API | cùng gate với UI | API |
| RT-004C | Activation reject | active program cũ giữ nguyên | transaction |
| RT-004D | Soft mismatch override | reason + confirmation + audit | browser + DB |
| RT-004E | Safety unresolved/medical_review | `blocked` | matrix test |
| RT-004F | List vs detail | same status/reasons/version | API comparison |

## ISSUE-005 - Beginner program quality

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-005A | Validate beginner seed | 2 nonconsecutive days | validator |
| RT-005B | Estimate each session | ≤30 minutes | contract |
| RT-005C | Week-1 dose | 1-2 sets, RIR 3-4 | fixture/validator |
| RT-005D | Exercise eligibility | no intermediate-only/advanced default | validator |
| RT-005E | Knee fixture | safe substitute or block | safety integration |
| RT-005F | Card/detail/muscle totals | exact same | snapshot/browser |
| RT-005G | Warm-up/cooldown | content matches phase/type | validator/PT |

Program chỉ visible sau PT sign-off.

## ISSUE-006 - Effective plan consistency

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-006A | Onboarding → dashboard | 2 days / 30 min | browser |
| RT-006B | Open generator | profile equipment selected | browser/API |
| RT-006C | Read context | same values/revision | contract/API |
| RT-006D | Choose unrestricted | only after explicit action | browser |
| RT-006E | Active program override | declared/effective/reason visible | browser/API |
| RT-006F | Stale settings write | typed revision conflict | concurrency |

## ISSUE-007 - Exercise content/taxonomy

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-007A | Run catalog validator | no blocking taxonomy/unit/encoding error | validator |
| RT-007B | Front Squat golden record | primary/rest/cues/stop rule consistent | golden test + PT |
| RT-007C | Substitution under knee constraint | passes Safety Engine or blocked | integration |
| RT-007D | Regular user submits video URL | cannot publish unreviewed media | role/API |
| RT-007E | Program rest differs default | both sources labeled correctly | UI snapshot |

## ISSUE-008 - Evidence-grounded reports

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-008A | 0 completed workout | `insufficient_data`, no Gemini | unit/provider spy |
| RT-008B | F-COMPLETED-WORKOUT only | `factual/limited`, workouts=1 | contract/E2E |
| RT-008C | Query failure | `training_data_unavailable`, not 0 | integration |
| RT-008D | Unsupported LLM claim | output validator rejects/fallback | unit |
| RT-008E | Done page | no A+/93/scientific hypertrophy claim | browser |
| RT-008F | Nutrition/recovery | no exact personal dosage without inputs | output fixture |
| RT-008G | Source attribution | measured/reported/estimated visible | browser |

## ISSUE-009 - Accessibility

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-009A | Register fields | stable labels/names | semantic locator |
| RT-009B | Selectable cards/toggles | selected state exposed | role assertion |
| RT-009C | 3 rating groups | unique group/value names + selected | browser |
| RT-009D | Modal keyboard flow | focus trap + return to trigger | Playwright |
| RT-009E | Full keyboard journey | no blocking control | E2E |
| RT-009F | Errors | announced, focus first invalid | E2E |

## ISSUE-010 - Vietnamese validation/state retention

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-010A | Empty fields | Vietnamese error | unit/browser |
| RT-010B | Invalid email | Vietnamese error | browser |
| RT-010C | Short password | no `ERR:` | browser |
| RT-010D | Server sign-up error | friendly mapped message | mocked integration |
| RT-010E | Retry after server error | valid fields retained | browser |
| RT-010F | Multiple errors | focus first invalid | browser |

## ISSUE-011 - Completion/read model consistency

| ID | Scenario | Expected | Evidence |
|---|---|---|---|
| RT-011A | Complete twice/concurrently | idempotent, same completed_at | DB/API |
| RT-011B | Reopen `/workouts/{id}` | redirect/read-only; timer frozen | browser |
| RT-011C | Add/edit/delete completed set | DB/server reject | authenticated tamper |
| RT-011D | Reload six consumer routes | exact canonical projection | multi-route E2E |
| RT-011E | Reload feedback | 2/3/3 retained | browser + DB |
| RT-011F | Missing actual RIR | null/Chưa ghi nhận, not 0/target | contract/browser |
| RT-011G | Actual reps 8 and 9 | range 8-9, not 9-11 | API/browser |
| RT-011H | Planned vs actual duration | 30 min planned, 360 sec actual, labeled | contract/browser |
| RT-011I | User B accesses User A | denied | two-user RLS |
| RT-011J | GET completed page | no default-set mutation | DB assertion |

---

## 5. Stage gates

| Gate | Packages | Pass condition |
|---|---|---|
| G0 Baseline | QA00 | fixtures locked; Critical/High characterization red |
| G1 Safety intake | QA01-QA02 | persistence/revision/RLS/screening green |
| G2 Safety enforcement | QA03 | exact prompt, empty pool, tamper, confirm green |
| G3 Effective program | QA04-QA06 | snapshot, activation, beginner content/PT green |
| G4 Completion | QA07 | terminal state + exact projection + feedback green |
| G5 Reports/UX | QA08-QA09 | no-data/facts/a11y/localization green |
| G6 Release | QA10 | full suite + staging E2E + QA ≥90 + PT PASS |

Không public canary trước khi G2 và G4 đều PASS.

---

## 6. Planned commands

Các script dưới đây là đầu ra của QA00; chúng chưa tồn tại đầy đủ ở baseline và không được ghi PASS trước khi Builder thêm/chạy thật:

```powershell
npm.cmd run test:unit
npm.cmd run test:qa:safety
npm.cmd run test:qa:completion
npm.cmd run test:qa:content
npm.cmd run test:e2e:new-user
npm.cmd run test:qa:release
```

Technical health gate sau khi implementation ổn định:

```powershell
npm.cmd run exercises:validate-taxonomy
npx.cmd tsc --noEmit --pretty false --incremental false
npm.cmd run lint
$env:NEXT_DIST_DIR='.next-build-verify'
npm.cmd run build
git diff --check
git diff --cached --name-only
```

Các suite baseline hiện có vẫn phải xanh:

```powershell
npm.cmd run test:workout-phases
npm.cmd run test:personalization
npm.cmd run test:ai-personalization
```

Build xanh không thay authenticated RLS/API E2E hoặc black-box QA.

---

## 7. DB migration/reconciliation verification

Trình tự bắt buộc:

1. Contractor inspect migration additive và policy/function/view semantics.
2. Dry-run row estimate/backfill count.
3. Homeowner phê duyệt mutation cụ thể.
4. Apply bằng Supabase MCP trên environment đã nêu.
5. Verify migration version và schema objects.
6. Run two-user RLS/API E2E.
7. Run shadow/checksum old vs new projection.
8. Chỉ sau khi app dùng RPC/read contract mới siết completed immutability policies/triggers.
9. Ghi report trước/sau; không drop schema/cache cũ trong remediation release.

Các view facts nếu được dùng phải giữ RLS bằng `security_invoker` hoặc boundary tương đương đã được test.
`workout_drafts` phải owner-only, TTL-indexed, không chứa raw health note/PII; expired/consumed draft không được tạo workout mới lần hai.

---

## 8. Canary verification

### Hard-stop metrics

```text
onboarding_context_revision_mismatch = 0
constraint_violation_confirmed = 0
program_activation_without_required_override = 0
completed_workout_editable_count = 0
workout_projection_checksum_mismatch = 0
feedback_hydration_mismatch = 0
report_fact_conflict = 0
```

### Stop immediately nếu

- confirmed workout chứa banned constraint;
- cross-user access/leak;
- completed workout có thể sửa;
- actuals khác nhau giữa consumer;
- query error bị hiểu thành no-data;
- rollback yêu cầu mở lại unsafe generator.

---

## 9. Final Contractor VERIFY checklist

- [ ] 11/11 issues có AC và evidence mới.
- [ ] 0 Critical; 0 High; P0 deferred = 0.
- [ ] PT safety PASS.
- [ ] QA score mới ≥90/100.
- [ ] Exact prompt QA pass generate + confirm.
- [ ] Exact completed fixture khớp mọi route.
- [ ] Two-user RLS/API E2E pass.
- [ ] Keyboard-only new-user journey pass.
- [ ] Taxonomy/content validator pass.
- [ ] Typecheck/lint/isolated build pass.
- [ ] Console JS error = 0; image warning target = 0.
- [ ] Migration/backfill/feature flags/rollback có evidence.
- [ ] Builder Completion Reports đầy đủ.
- [ ] Contractor trả READY.
- [ ] Homeowner chấp thuận rollout.

Nếu bất kỳ mục Critical/High nào fail, kết luận là `NOT READY`, không dùng điểm tổng để override.
