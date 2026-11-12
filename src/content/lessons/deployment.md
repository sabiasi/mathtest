**[Deployment](term:deployment)** means putting your app on a server on the internet, so anyone can use it with a link. A deployed project, one an employer can click and try, is worth far more than one that only runs on your laptop.

## Two kinds of deploys

**Static sites** (HTML, CSS and JavaScript only, like DevPath) are the easy ones. You upload the built files and a host serves them:

```bash
npm run build     # creates the dist/ folder: the finished site
```

Free hosts include **GitHub Pages**, Netlify, Vercel and Cloudflare Pages. Many can rebuild automatically every time you push to GitHub.

**Backends** (like a [FastAPI](/roadmap/backend-fastapi) app) need a server that keeps running your code. Services like Render, Railway and Fly.io run it for you. You tell them how to install (`pip install -r requirements.txt`) and how to start your app.

## Things that change in production

- **Environment variables**: secrets like API keys and database passwords are set in the host's dashboard, never committed to Git.
- **Localhost is gone**: your frontend must call the backend's real URL, and CORS must allow your real domain.
- **Logs**: you can't see a terminal anymore, so read the host's log viewer when something breaks.

"Production" means the real, live version that users see; "development" is your laptop.

## Your own domain

Buy a name like `yourname.dev` and point it at your host with [DNS](/roadmap/dns) records. The host's docs tell you exactly which records to add.

## Key takeaways

- **Static** sites are uploaded files; **backends** need a host that runs your code.
- Secrets go in the host's **environment variables**, never in Git.
- When it breaks in production, check the **logs**.
