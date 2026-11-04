# Momentum

A calm personal productivity workspace: tasks, project filters, a workflow board, a 25/50-minute focus timer, and an autosaving scratchpad. Responsive, keyboard accessible, and built with plain HTML, CSS, and JavaScript.

**Site:** https://momentum-workspace-b749.alightlace1.chatgpt.site

**Code:** https://github.com/mt-boop/Workflow-web

## Use the app

- Add a task with **New task**, or press **N**. Select a task title to edit it.
- Tick its circle to complete it. Use the board's stage selector to move tasks.
- Create projects with the + beside Projects, or Getting started → Create a project.
- Start a focus session and add an intention. Breaks do not count as focus time.
- Write in Notes. Text saves automatically as you type.
- Press **/** to search tasks.
- Export or import a JSON backup from Getting started.

Data stays in the current browser and device using localStorage. There is no account database or cross-device sync. Clearing browser data deletes this workspace, so export a backup when needed. Each visitor has their own data. Example tasks can be removed with Clear examples.

The website starts private through Sites. Public GitHub code does not change the hosted website's audience. Personal task data is not included in this repository.

## Files

| File | Purpose |
| --- | --- |
| `dist/index.html` | Page structure and task/project dialogs |
| `dist/styles.css` | Colors, typography, layout, mobile styling |
| `dist/app.js` | Task management, notes, timer, local saving, backups |
| `.openai/hosting.json` | Sites identity and static folder configuration |

There is no build step and no package installation. Fonts use Google Fonts, with system font fallbacks.

## Push your first change

“Commit” means saving a named snapshot of your code. “Push” means uploading your local commits to GitHub. Publishing means deploying the code to a working website.

### Easiest: edit on GitHub

1. Open this repository and select `dist/index.html`.
2. Click the pencil button to edit it.
3. For example, change the page title inside `<title>…</title>`.
4. Click **Commit changes**, add a short description, and confirm.

GitHub saves the change directly; no terminal push is needed when using its editor.

### On your computer, with Git

Run these commands in PowerShell from the folder where you keep your projects:

```powershell
git clone https://github.com/mt-boop/Workflow-web.git
cd Workflow-web
```

Edit a file in the `dist` folder using your editor. Then:

```powershell
git status
git add dist/index.html dist/styles.css dist/app.js
git commit -m "Update my workspace"
git push origin main
```

Only changed files are committed. If you edit README.md too, add it explicitly with `git add README.md`. GitHub may ask you to sign in through your browser the first time you push. Never commit passwords or access tokens.

Before starting later changes, bring in any edits made elsewhere:

```powershell
git pull --ff-only origin main
```

If Git reports a conflict or rejected push, keep your work and ask Codex to reconcile it. Avoid force pushing.

### Preview locally

Open `dist/index.html` in a browser for a quick look. For reliable local browser storage, serve it over HTTP. If Python is installed:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Visit http://127.0.0.1:4173. Stop the server with Ctrl+C. The local preview and hosted site have separate browser storage.

## Publish updates to Sites

Pushing to GitHub does **not** automatically redeploy the Sites URL. This project does not include an automatic deployment workflow.

After a push, ask Codex:

> Update my existing Momentum Site from https://github.com/mt-boop/Workflow-web and publish it with Sites. Preserve its current audience and reuse the project ID in .openai/hosting.json.

Codex can fetch the GitHub changes, prepare the exact source state, and save and deploy it through Sites. Keep `.openai/hosting.json` so future edits target the same Site.

You can also ask Codex to edit the website, push the updated source to this repository, and publish it with Sites in one request.
