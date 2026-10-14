# Prior art on element references for language-model browser agents

Read 2026-10-07 by the Opus research lane; filed by the orchestrator because the lane had no write tool. Every claim is a paraphrase of the named source.

## Rulings

1. **Reference bound to element identity across page changes: partly, in one shipped surface.** Vercel's agent-browser keeps an element's reference (`@e1`) across snapshots while the element survives DOM updates, and asks for a fresh snapshot after a navigation (github.com/vercel-labs/agent-browser). browser-use re-assigns its indexes every step and tells the model to use only the current step's (browser-use `system_prompt.md`). WebVoyager draws new labels on every screenshot (arxiv.org/html/2401.13919). Stagehand hands the model XPath or CSS selectors and re-asks the model when a cached selector stops matching (docs.stagehand.dev/v4/best-practices/caching.md). Playwright MCP's README states nothing about reference behavior across navigations.
2. **Smallest shipped tool count for navigating, reading, and acting: 7, in WebVoyager** (Click, Input, Scroll, Wait, Back, Jump to Search Engine, Answer). Mind2Web's MindAct has 3 operations but is not a full navigating surface. Products are larger: Anthropic's computer toolset has 17, Playwright MCP about 24 core tools, browser-use 31 actions, agent-browser more than 80.
3. **Missing numeric argument accepted: yes; string-typed: not settled.** browser-use's click action takes `index` as `int | None` with x/y coordinates as the alternative (browser_use/tools/views.py). No read source describes turning a string into a number; browser-use validates through Pydantic, whose coercion there is unverified. Anthropic's coordinates are plain integer pairs.

## Unknowns

- How Playwright MCP generates references and whether they stay stable; the source path tried returned 404.
- How Stagehand presents elements to the model internally.
- A published measurement on 2B–4B models for these surfaces. The closest is Mind2Web's fine-tuned Flan-T5 (base, large, XL), which beat GPT-4 on step success (52.0 against 36.2 cross-task), and browser-use's unquantified claim that smaller models do well on easy tasks.
