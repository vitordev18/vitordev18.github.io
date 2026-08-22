<h1 align="center">💼 Personal Portfolio</h1>

<p align="center">
  My personal portfolio website — bilingual, responsive, and built from scratch with vanilla web technologies.
</p>

<p align="center">
  <a href="https://vitordev18.github.io" target="_blank"><strong>🔗 Live site → vitordev18.github.io</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white" alt="GitHub Pages" />
</p>

---

## 📋 Overview

This is my personal portfolio: a single-page website that presents who I am, the technologies I work with, my experience and education, my projects, and a way to get in touch. It was built from scratch with **plain HTML, CSS, and JavaScript** — no frameworks and no build tools — and is deployed on **GitHub Pages**.

---

## ✨ Features

- 🌐 **Fully bilingual** (Portuguese 🇧🇷 / English 🇺🇸) through a custom i18n system — switch languages from the navbar with no page reload
- 🌗 **Light / dark theme** toggle
- 📱 **Responsive** layout, built to work well from mobile to desktop
- 📨 **Working contact form** powered by [Web3Forms](https://web3forms.com/) — submissions are sent via API without leaving the page (no redirect), with a `mailto` fallback
- 🗂️ **Content in a single JSON file** — projects, experience, education, and certificates live in `assets/data/content.json` and are rendered at runtime
- ✏️ **Built-in content editor** (`admin.html`) — add, edit, and reorder entries in both languages, import a repository straight from the GitHub API, and export the updated JSON
- 🎂 **Self-updating** — age and years of study are calculated on every page load, never hard-coded
- 📄 **Downloadable résumé (CV)**
- 🔍 **SEO-ready** — semantic HTML, meta description, `robots.txt`, and `sitemap.xml`

---

## 🧭 Sections

- **Home** — intro / hero
- **About** — who I am
- **Tech Stack** — the technologies I work with
- **Experience** — professional experience
- **Education** — academic background
- **Projects** — featured work
- **Contact** — contact form and links

---

## 🛠️ Built With

- **HTML5** — semantic markup
- **CSS3** — styling, layout, and theming
- **JavaScript (Vanilla)** — i18n, theme toggle, and interactions
- **[Web3Forms](https://web3forms.com/)** — contact form submissions
- **GitHub Pages** — hosting

---

## 📁 Project Structure

```
vitordev18.github.io/
├── index.html          single-page site
├── admin.html          content editor (see below)
├── assets/
│   ├── css/            styles — style.css (site) and admin.css (editor)
│   ├── data/           content.json — projects, experience, education, certificates
│   ├── js/             i18n.js, content.js, main.js, admin.js
│   ├── img/            images
│   └── cv/             downloadable résumé
├── robots.txt          SEO — crawler directives
└── sitemap.xml         SEO — sitemap
```

---

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/vitordev18/vitordev18.github.io.git
cd vitordev18.github.io
```

Then serve the folder with any static server — recommended so the language files load correctly:

```bash
# Python 3
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser. (You can also use the **Live Server** extension in VS Code.)

> 💡 Opening `index.html` directly via `file://` prevents the content and the translations from loading; use a local server as shown above.

---

## 🗂️ Content Management

Projects, experience, education, and certificates are **not written into the HTML**. They
live in `assets/data/content.json`, with a Portuguese and an English value for every text,
and are rendered by `assets/js/content.js`.

To change them, open `admin.html` while the site is running locally:

1. The editor loads the current `content.json`.
2. Add, edit, reorder, or remove entries — PT and EN fields side by side.
3. For a project, type a repository name and hit **Preencher** to pull its name,
   description, language, topics, and URLs from the public GitHub API.
4. Click **Baixar content.json**, replace `assets/data/content.json`, and commit.

Work in progress is kept in `localStorage`, so the tab can be closed and reopened later.

> ⚠️ The editor is **not** a protected area — a static site cannot authenticate anyone.
> It only edits a copy held in your browser and produces a file to download; it never
> writes to the repository and holds no secrets. It is marked `noindex` and disallowed
> in `robots.txt`.

Interface text — section titles, labels, form messages — lives in `assets/js/i18n.js` and
is edited directly, always in both languages.

---

## 👤 Author

**Vitor Rodrigues Ferreira**

- Portfolio: [vitordev18.github.io](https://vitordev18.github.io)
- GitHub: [@vitordev18](https://github.com/vitordev18)
- LinkedIn: [vitor-rodrigues-ferreira](https://linkedin.com/in/vitor-rodrigues-ferreira)
