# Speckle Docs – Authoring Guide

This repository contains the official documentation for Speckle. The goal is to make our docs **clear, consistent, and useful** for both new and experienced users.

## Structure & Style

* **Quick Reference**
  A concise entry point for essential actions and terminology. Designed to give new users a fast orientation and provide experienced users with a rapid lookup.

* **Your Speckle Workspace**
  Guides that explain how to set up and manage workspaces, projects, and models. These are deliberately briefer than connector docs, focusing on universal web application features that every user touches. To balance brevity, they are supported with FAQs, best practices, and tips.

* **Viewing & Sharing**
  Instructions on how to explore models, create saved views, apply filters, and share data with others. Emphasis is on clarity and speed to first success, with optional callouts for tips and best practices.

* **Publishing & Loading (formerly Connectors)**
  Each connector follows the same skeleton: installation, sign-in, day-0 tasks (send/receive), followed by FAQs and troubleshooting.

  We deliberately describe this section as **Publishing & Loading** rather than "Connectors." This keeps the docs user-first and purpose-driven: users think in terms of publishing data into Speckle or loading it into another tool, not in terms of underlying plumbing. It frames the outcome (why) rather than the mechanism (how).

  **Connector Documentation Structure:**
  - Use main page sections for step-by-step guides (e.g., "Setting up Data Gateway")
  - Use accordions for FAQs and troubleshooting questions
  - Import and use standard components: `<Setup>`, `<Load>`, `<Publish>`, `<SetupFaq>`, `<LoadFaq>`, `<PublishFaq>`
  - Avoid "How to do X" accordion titles that contain step-by-step instructions—these should be main sections instead

## Tone

* Direct, simple, and jargon-light.
* Instructions are imperative (“Click…”, “Select…”, “Run…”).
* Visual where possible: screenshots, diagrams, or short clips.

## FAQs, Best Practices, and Tips

* **FAQs**: Maintained as the first stop for common issues and questions. They should be phrased in user language, short and atomic, and cover both obvious and edge-case scenarios. Use accordions for FAQs—they should answer specific questions, not provide step-by-step guides.
* **Best Practices**: Principles and recommendations that help users avoid pitfalls and make good choices. They should read as guidance, not rigid rules.
* **Tips & Tricks**: Small, optional enhancements or shortcuts. Presented as quick callouts, not workflows, and always optional to the main path.

**When to use accordions vs. main sections:**
- **Accordions**: For FAQs, troubleshooting questions, and quick reference information
- **Main sections**: For step-by-step guides, detailed procedures, and comprehensive workflows

## Guardrails

* Keep **tutorials** separate. Tutorials are narrative, multi-step guides that live outside the core docs.
* Docs should remain **reference-driven**: quick answers, reproducible steps, clear explanations.

## Balance Across Sections

Connector pages are naturally more detailed because they must cover multiple host tools, installation steps, and technical caveats. User guides, by contrast, should remain concise and focused on universal actions, but must be reinforced with FAQs, best practices, and tips to feel equally rich. This balance avoids the perception that non-connector content is “thin” by design, while still keeping it accessible.

## How We Measure Quality

* Can a new user follow a page and succeed on day 0?
* Can an experienced user land on a page, scan for the answer, and leave in under a minute?
* Are FAQs current and accurate?
* Are best practices and tips useful without being prescriptive?


## Note for Contributors

### Development

Ensure you have node 19 or above.
Install the [Mintlify CLI](https://www.npmjs.com/package/mintlify) to preview the documentation changes locally:

```bash
npm i -g mintlify
```

Run the following command at the root of your documentation (where `docs.json` is):

```bash
mintlify dev
```

### Publishing Changes

Install our GitHub App to auto-propagate changes from your repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch. Find the link to install on your dashboard.

### Troubleshooting

* **Mintlify dev isn’t running** → Run `mintlify install` to re-install dependencies.
* **Page loads as 404** → Make sure you are running in a folder with `docs.json`.

### Optional: Using Devcontainers

This repository also includes a devcontainer/Dockerfile setup. It provides a pre-configured environment with Node, Mintlify, and ZSH installed, along with a convenient `mintdev` alias.

* To use it in VS Code, open the repo and choose **Reopen in Container**. The devcontainer will build itself.
* Once inside the container, run:

```bash
mintdev
```

This will start Mintlify in verbose mode with polling enabled, ensuring file changes are picked up reliably.

Using the devcontainer is optional but recommended if you want a consistent, containerised environment without managing Node or Mintlify versions on your local machine.
