# 🚀 Pushing Your Project to GitHub

Your project already has a `.gitignore` set up (so `node_modules` and secrets won't be uploaded). Follow these steps to push everything to GitHub.

---

## Step 1 — Create a new repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Give your repo a name (e.g. `my-project`)
3. Set it to **Public** or **Private** (your choice)
4. **Do NOT** check "Add a README" or "Add .gitignore" — we already have those
5. Click **Create repository**
6. Copy the repo URL — it will look like:
   ```
   https://github.com/YOUR-USERNAME/my-project.git
   ```

---

## Step 2 — Open a terminal in your project folder

In Claude Code, open the terminal (or use Windows Terminal / PowerShell) and `cd` into your project folder.

---

## Step 3 — Run these commands (one by one)

```bash
# If git isn't initialized yet:
git init
git branch -M main

# Stage all your files:
git add .

# Make your first commit:
git commit -m "Initial commit"

# Connect to your GitHub repo (replace with YOUR URL from Step 1):
git remote add origin https://github.com/YOUR-USERNAME/my-project.git

# Push to GitHub:
git push -u origin main
```

GitHub will ask for your username and password. For the password, use a **Personal Access Token** (not your regular password) — see Step 4.

---

## Step 4 — Create a Personal Access Token (PAT)

GitHub no longer accepts regular passwords for pushing. You need a token:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a name like `my-laptop`
4. Set expiration to **90 days** or **No expiration**
5. Check the **`repo`** scope (full control of private repositories)
6. Click **Generate token**
7. **Copy the token immediately** — you won't see it again!

Use this token as your password when git prompts you.

---

## Step 5 — Save your credentials (so you don't retype every time)

```bash
git config --global credential.helper store
```

After you enter your token once, git will remember it.

---

## ✅ You're done!

Your project is now on GitHub. Every time you want to save new changes:

```bash
git add .
git commit -m "Describe what you changed"
git push
```

---

## 💡 Pro tips for vibe coders

- **Commit often** — after every feature or fix, not just at the end
- **Use clear commit messages** — future you will thank you
- **Never commit `.env` files** — they contain secrets (already in your `.gitignore`!)
- **Use branches** for big experiments: `git checkout -b my-experiment`
