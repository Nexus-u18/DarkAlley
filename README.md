# 🛡️ DarkAlley

DarkAlley is a safety-focused route-planning dashboard. It helps users compare route options on a map, review route and incident information, and submit a safety report through an in-app assistant. 🗺️

> ⚠️ **Demo notice:** DarkAlley is a prototype, not an emergency service. Route safety scores, coverage, incident information, and some route details are simulated or sample data. Do not rely on them to make real-world safety decisions. If you are in immediate danger, contact local emergency services.

## ✨ Features

- 📍 Search for an origin and destination and view available driving routes.
- 🛣️ Compare route distance, estimated travel time, and safety indicators.
- 🗺️ View routes and locations on an interactive map.
- 🚨 Browse sample incident and safety data.
- 🤖 File a safety report using the assistant; reports are saved in the current browser.
- 🎨 Choose dark, light, or system theme.

## 🧰 Tech Stack

**🖥️ Frontend**

<p>
  <img alt="Vue.js" src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img alt="Lucide Vue Next" src="https://img.shields.io/badge/Lucide_Vue_Next-F56565?style=for-the-badge">
  <img alt="Lenis" src="https://img.shields.io/badge/Lenis_Smooth_Scroll-111111?style=for-the-badge">
</p>

**📡 Mapping and location services**

<p>
  <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white">
  <img alt="OpenStreetMap" src="https://img.shields.io/badge/OpenStreetMap-7EBC6F?style=for-the-badge&logo=openstreetmap&logoColor=white">
  <img alt="OSRM" src="https://img.shields.io/badge/OSRM-2C3E50?style=for-the-badge">
  <img alt="Photon Geocoder" src="https://img.shields.io/badge/Photon_Geocoder-4B8BBE?style=for-the-badge">
  <img alt="Nominatim" src="https://img.shields.io/badge/Nominatim_Geocoder-6DAA54?style=for-the-badge">
</p>

**⚙️ Build tools and browser APIs**

<p>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
  <img alt="npm" src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white">
  <img alt="Browser APIs" src="https://img.shields.io/badge/Browser_APIs_Geolocation_%26_localStorage-555555?style=for-the-badge">
</p>

## 🚀 Getting Started

### 📋 Prerequisites

- Node.js
- npm

### 📦 Install and run

```bash
git clone https://github.com/SourinKar/DarkAlley.git
cd DarkAlley
npm install
npm run dev
```

Vite prints the local development URL in the terminal after the server starts.

### 🏗️ Production build

```bash
npm run build
npm run preview
```

The production bundle is generated in `dist/`.

## 🌐 Data and external services

- **🛣️ Routing:** Driving routes are requested from the public OSRM demo service.
- **🔎 Place search:** Photon and Nominatim provide geocoding and location suggestions.
- **🧭 Map tiles:** The map uses OpenStreetMap tiles through Leaflet.
- **💾 Reports and theme:** Stored in browser `localStorage`; they are not sent to a backend.
- **⚠️ Safety information:** Scores and factors are demo estimates, not verified live safety data.

These public services require an internet connection and are subject to their own availability and usage policies. 🌍

## 🧪 Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the app for production |
| `npm run preview` | Preview the production build locally |
