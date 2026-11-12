[Git](/roadmap/git) runs on your computer. **GitHub** is a website that stores Git repositories online, so you can back them up, share them, and work on them with other people. It's also where employers look at what you've built.

## Git vs. GitHub

| | Git | GitHub |
|---|---|---|
| What | A program | A website / service |
| Where | Your computer | The internet |
| Does | Tracks history | Hosts repos, plus collaboration tools |

Git works fine without GitHub. GitHub is one of several hosting services; GitLab and Bitbucket are others.

## Remotes: your repo's online copy

A **[remote](term:remote)** is a copy of your repository somewhere else, usually on GitHub. By convention the main remote is called `origin`.

```bash
git remote add origin https://github.com/YOUR-NAME/devpath.git   # connect once
git push -u origin main       # upload your commits ("-u" remembers the pairing)
git push                      # later uploads: just this
git pull                      # download new commits from GitHub
git clone https://github.com/someone/project.git   # copy someone's repo to your computer
```

- **push** = send my commits up to GitHub.
- **pull** = bring GitHub's new commits down to me.

## Putting DevPath on GitHub (when you're ready)

1. Create a free account at github.com.
2. Click **New repository**, name it `devpath`, and **don't** add a README (DevPath already has one).
3. GitHub shows you the commands: the `git remote add` and `git push` lines above.
4. The first push will ask you to log in. The easiest way is GitHub's own **`gh`** tool: install it from cli.github.com, then run `gh auth login`.

⚠️ Public repos are visible to everyone. Check that no passwords or API keys were ever committed.

## Pull requests: proposing changes

On a team, nobody pushes straight to `main`. Instead:

1. Create a branch and commit your work there.
2. Push the branch and open a **[pull request](term:pull-request)** (PR) on GitHub: "please merge my branch into main".
3. Teammates **review** the code, leave comments, and approve (see [Code review](/roadmap/code-review)).
4. The branch is merged.

PRs are how almost all professional software gets built, and how you contribute to open-source projects.

## Other GitHub features

- **README.md**: shown on the repo's front page. It's your project's welcome sign.
- **Issues**: a to-do list and bug tracker for the project.
- **Stars**: bookmarks, and a rough measure of a project's popularity.
- **GitHub Actions**: run your tests automatically on every push.
- **GitHub Pages**: free hosting for websites ([Deployment](/roadmap/deployment)).

## Your profile is part of your resume

Recruiters look at GitHub profiles. Pinned repos with clear READMEs, regular commits, and a profile README all help. See [Portfolio](/roadmap/portfolio).

## Try it

Create a GitHub account (if you don't have one) and find a project you use, like the `requests` library at github.com/psf/requests. Look at its README, open Issues and recent pull requests. Notice how the maintainers talk to each other.

## Key takeaways

- **Git** is the tool; **GitHub** is a website that hosts Git repos.
- `push` uploads your commits, `pull` downloads new ones, and `clone` copies a repo.
- **Pull requests** propose changes and are reviewed before merging.
- Public means public: never push secrets.
