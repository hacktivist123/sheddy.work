# sheddy.work


A terminal-style homepage for my personal projects that auto-discovers project domains & subdomains from a `projects.json` file.


## Features

- Terminal UI with typing effect (whoami, echo, ls)
- Auto-loads project links from /projects.json
- Manual refresh button + r keyboard shortcut
- “last updated” timestamp (uses Last-Modified when available)
- Zero build tools, zero deps


## Local development

Just open index.html in a browser.
If you want to test projects.json, run a tiny server:

```bash
# Python 3
python -m http.server 8080
# or Node
npx http-server -p 8080
```

Then visit http://localhost:8080/.


## License

MIT © Shedrack Akintayo
