# Project AI Agent Guidelines & GStack Skills

This repository is equipped with the **gstack** virtual engineering team skill suite.

## Strict Formatting Rules

- **NO EM-DASH (`—`)**: Tuyệt đối không bao giờ dùng dấu gạch ngang dài (`—`). Luôn luôn sử dụng dấu gạch ngang ngắn tiêu chuẩn (`-`) cho tất cả các phần phân cách, dải giá trị, placeholder và mô tả trong toàn bộ source code, giao diện UI và tài liệu.

## Available GStack Skills

| Skill | Command | Purpose |
| :--- | :--- | :--- |
| **office-hours** | /office-hours | Product Strategist - brainstorm product ideas, refine problem statements |
| **plan-ceo-review** | /plan-ceo-review | Founder / CEO - review strategy, ambition, and scope |
| **plan-eng-review** | /plan-eng-review | Eng Manager - lock architecture, data flow, API boundaries |
| **plan-design-review** | /plan-design-review | Designer - review UI/UX, interaction states, accessibility |
| **autoplan** | /autoplan | Autonomous Planning - runs complete review pipeline before coding |
| **investigate** | /investigate | Root Cause Investigator - deep root-cause debugging for bugs and errors |
| **qa** | /qa | QA Engineer - test site/features using real browser automation |
| **qa-only** | /qa-only | QA Inspector - audit and report bugs without modifying code |
| **review** | /review | Staff Engineer - rigorous pre-landing code review, check diffs & edge cases |
| **design-review** | /design-review | Visual Designer - audit live UI for visual polish & consistency |
| **cso** | /cso | Security Officer - OWASP and STRIDE security audit |
| **ship** | /ship | Release Engineer - run tests, sync, commit, push, and open PR |
| **land-and-deploy** | /land-and-deploy | Deploy Master - merge, deploy, and verify in one step |
| **retro** | /retro | Team Lead - weekly retrospective based on commit history |
| **context-save** | /context-save | Save progress checkpoint |
| **context-restore** | /context-restore | Restore previous working context |
| **spec** | /spec | Backlog Engineer - author backlog-ready issue/spec |

## Skill Routing Rules

When a user request matches a specialized skill workflow, activate and follow the corresponding skill:
- **Idea / Pitch / Brainstorm** -> office-hours
- **Strategy / Scope Expansion** -> plan-ceo-review
- **Architecture / Tech Plan Review** -> plan-eng-review
- **Full Review Pipeline** -> autoplan
- **Bugs / Errors / Unexpected behavior** -> investigate
- **Testing Site / Browser QA** -> qa or browse
- **Code Review / Diff Check** -> review
- **Security / Vulnerability Check** -> cso
- **Deploy / Release / PR** -> ship or land-and-deploy
