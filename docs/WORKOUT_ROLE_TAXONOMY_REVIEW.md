# Workout-role taxonomy review

Reviewed: 2026-08-21

Manifest: `data/exercise-taxonomy/workout-role-classification.json`

## Eligibility rule

Only entries with `workout_role_review_status = reviewed` are eligible for planner candidate pools. A numeric confidence score never overrides `needs_review`.

## Reviewed subset

| Role | Count | Reviewed slugs |
|---|---:|---|
| `general_warmup` | 3 | `jump-rope`, `stationary-bike-run-v-3`, `hands-bike` |
| `dynamic_mobility` | 4 | `dynamic-chest-stretch-male`, `inchworm`, `world-greatest-stretch`, `walking-high-knees-lunge` |
| `activation` | 5 | `dead-bug`, `glute-bridge-march`, `scapula-push-up`, `scapular-pull-up`, `high-knee-against-wall` |
| `main_strength` | 10 | `barbell-bench-press`, `dumbbell-standing-overhead-press`, `push-up`, `barbell-bent-over-row`, `pull-up`, `cable-lat-pulldown-full-range-of-motion`, `barbell-full-squat`, `barbell-deadlift`, `dumbbell-goblet-squat`, `sled-45-leg-press` |
| `cooldown_aerobic` | 3 | `stationary-bike-walk`, `walk-elliptical-cross-trainer`, `walking-on-incline-treadmill` |
| `static_stretch` | 5 | `hamstring-stretch`, `calf-stretch-with-hands-against-wall`, `overhead-triceps-stretch`, `kneeling-lat-stretch`, `assisted-seated-pectoralis-major-stretch-with-stability-ball` |

The subset covers Push, Pull, Legs, and Full Body. It includes bodyweight options and common gym equipment (barbell, dumbbell, cable, pull-up bar, leg press, treadmill, stationary bike, elliptical, jump rope, upper-body ergometer, and stability ball).

## Unresolved queue

| Slug | Why it is blocked |
|---|---|
| `air-bike` | Name suggests a cardio machine but source content describes a floor bicycle abdominal drill. |
| `all-fours-squad-stretch` | Likely naming typo; dynamic-versus-held intent is unclear. |
| `pike-to-cobra-push-up` | Could be mobility or a main push movement depending on cadence and prescription. |
| `back-pec-stretch` | Name, translated goal, and target muscle disagree. |
| `circles-knee-stretch` | “Circles” implies dynamic movement while “stretch” may imply a hold. |
| `chair-leg-extended-stretch` | Required chair is absent from equipment metadata. |

These entries must remain outside candidate pools until a reviewer completes the `next_action` recorded in the manifest.

## Review method and limitations

This first subset was manually classified from canonical names, instructions, goals, movement patterns, and equipment. No LLM or remote service was used. Ambiguous records were deliberately left unresolved; their source animations still require visual review before approval.
