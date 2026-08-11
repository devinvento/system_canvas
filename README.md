# 🎨 System Canvas - Visual ERP Architecture Designer

[![Frappe App](https://img.shields.io/badge/Frappe-Framework-blueviolet.svg)](https://frappeframework.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**System Canvas** is a visual system architecture and database design platform for ERPNext and Frappe. It enables developers and functional teams to visually design projects, model custom DocTypes and fields, map relationships, and synchronize schemas directly with the Frappe database from an interactive canvas.

---

## 🏗️ System Architecture

The following diagram illustrates the flow of data between the interactive frontend canvas, the backend API handler, and the Frappe database system:

```mermaid
graph TD
    subgraph Browser_UI
        UI_Control[Control Toolbar]
        DocType_Cards[Interactive DOM Cards]
        SVG_Layer[SVG Overlay Layer]
        Inspector[Right Sidebar Inspector]
    end

    subgraph Frappe_Backend
        API_Endpoints[Python REST API Endpoints]
        Sync_Engine[Schema Sync Engine]
    end

    subgraph Database_Layer
        Canvas_Docs[System Canvas DocTypes]
        Frappe_Schema[Frappe Core Meta Tables]
    end

    DocType_Cards --> UI_Control
    SVG_Layer --> DocType_Cards
    UI_Control --> API_Endpoints
    API_Endpoints --> Canvas_Docs
    API_Endpoints --> Sync_Engine
    Sync_Engine --> Frappe_Schema
```

---

## ✨ Features

*   **Interactive Visual Modeling**: Drag-and-drop DocType cards to arrange them on an infinite canvas with viewport scale (zoom) and coordinate persistence (`localStorage`).
*   **Smart Axis Connection Routing**: Connection lines dynamically route from **Left/Right side ports** (for horizontal layout dominance) to **Top/Bottom center ports** (for vertical layout dominance) to prevent lines from overlapping or crossing over cards.
*   **Arrowhead Offset Boundary**: Smooth bezier curve calculation with a `6px` target boundary offset ensures that connection arrowheads sit perfectly on the card borders and remain 100% visible.
*   **Frappe Custom DocType Generator**: Synchronize your canvas design directly into actual Custom DocTypes (`custom = 1`) complete with field lists, field types, child table associations, and **System Manager** read/write/create/delete permissions.
*   **Explorer Sidebar & Inspector Panel**: Search and filter DocTypes (including a Child Table toggle), view detailed schema fields, and delete items from the database in real-time.

---

## 🚀 Installation

Install the app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/your-username/system_canvas.git --branch main
bench --site your_site_name install-app system_canvas
```

---

## 🧪 Testing

To run the Python backend test suite (covering project lifecycles, database synchronization, and relation inference):

```bash
# If using a local bench installation:
bench --site your_site_name run-tests --app system_canvas

# If using a docker-based environment:
docker exec shangu_localhost-app bench --site shangu.localhost run-tests --app system_canvas
```

---

## 🛠️ Development & Contribution

This app uses `pre-commit` for code formatting and linting. Enable it for your local workspace:

```bash
cd apps/system_canvas
pre-commit install
```

Pre-commit runs the following tools:
*   `ruff` (Python linting & formatting)
*   `eslint` (JavaScript style checking)
*   `prettier` (Code formatting)
*   `pyupgrade` (Upgrade syntax to newer Python versions)

---

## 📄 License

This application is licensed under the [MIT License](license.txt).
