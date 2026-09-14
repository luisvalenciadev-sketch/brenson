Branch `shopify-theme` — purpose and steps

This branch will be used to link the repository to Shopify (Online Store → Themes → Connect from GitHub).

Goal: prepare a branch where the theme files appear at the repository root (layout/, templates/, sections/, snippets/, assets/, config/, locales/) so Shopify can read `layout/theme.liquid` directly.

If you want the branch to contain the theme at root automatically, run the helper script in this repo:

From repo root (PowerShell):

```powershell
# create the branch (if not created by the helper)
# git checkout -b shopify-theme

# populate the branch with theme files at the repository root (this will overwrite files on that branch)
.\scripts\prepare-theme-branch.ps1 -ThemeDir ".\brenson-theme" -TargetRoot . -DryRun:$false

# review changes, then commit and push:
# git add .
# git commit -m "Prepare theme at repository root for Shopify GitHub linking"
# git push origin shopify-theme
```

Notes:
- The helper script will copy the theme directory contents into the given target root (default: repo root). Use `-DryRun $true` to preview actions.
- Pushing requires proper remote access; this script only modifies local files.

If you'd rather keep the theme inside a folder (e.g., `/brenson-theme`) and configure Shopify to use a subfolder, instruct me and I'll adapt the flow.
