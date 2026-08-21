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
├── assets/
│   ├── css/            styles
│   ├── js/             scripts (i18n, theme toggle, interactions)
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

> 💡 Opening `index.html` directly via `file://` may prevent the translations from loading; use a local server as shown above.

---

## 👤 Author

**Vitor Rodrigues Ferreira**

- Portfolio: [vitordev18.github.io](https://vitordev18.github.io)
- GitHub: [@vitordev18](https://github.com/vitordev18)
- LinkedIn: [vitor-rodrigues-ferreira](https://linkedin.com/in/vitor-rodrigues-ferreira)
