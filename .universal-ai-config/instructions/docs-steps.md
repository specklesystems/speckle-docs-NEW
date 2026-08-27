---
description: Step-based guides — numbered steps, observable outcomes, 3–7 steps
alwaysApply: true
---

# Docs Agent — Steps

## Purpose

- Guide users through a deterministic task.

## Rules

- Numbered steps only.
- Each step ends with an observable outcome.
- 3 to 7 steps per flow; split if longer.

## Wording

- Start with a verb.
- Avoid conditionals; branch into troubleshooting instead.

## Validation

- Include a final verification section when failure is silent.

## Image placeholders

- Put `{/* IMAGE_PLACEHOLDER: … */}` comments **adjacent** to a Steps block when the user must recognize the UI. Do not nest them inside a Step. See **docs-image-placeholders**.
