# Tools for a Professional Chef (software by her fiancé)

**Chef Tools** is a browser-based Progressive Web App (PWA) for chefs, caterers, and kitchen managers. It combines three tools into one interface:

1. **Menu Planner** – Build menus, assign ingredients, and generate costed shopping lists.
2. **Ingredient Converter** – Convert between metric weights/volumes and US kitchen measures with ingredient-specific densities.
3. **Prep & Par Manager** – Manage kitchen prep lists, par levels, recipes, and generate daily prep sheets.

All data is stored locally in the browser. No accounts or servers are required.

---

## Features

### 1. Menu Planner

* Define dishes and assign per-dish ingredient amounts and units.
* Input expected seat counts to scale quantities.
* Generate a **shopping list** aggregating totals across all dishes.
* Maintain an **ingredient catalog** with saved prices per unit.
* Auto-calculate costs for shopping lists using catalog entries.

### 2. Ingredient Converter

* Convert between grams, kilograms, milliliters, liters, and cups/tbsp/tsp.
* Built-in densities for common ingredients.
* Add or edit your own densities (grams per cup).
* Copy individual or entire tables to clipboard.
* Export conversions as CSV.
* Saved ingredient densities persist in local storage.

### 3. Prep & Par Manager

* Context bar to choose **date, location, and shift**.
* Manage **Items** (ingredient preps, recipe outputs, or line items).
* Define **Recipes** with yield amounts, ingredients, and instructions.
* Create **Par Templates** for each location/shift.
* **On-Hand Worksheets**:

  * Export as CSV or printable worksheet.
  * Staff fill in on-hand amounts digitally or on paper.
  * Import on-hand data via CSV or OCR (photo/PDF).
* **Generate Prep Lists**:

  * Auto-calculate “needed” vs. “par” based on on-hand snapshots.
  * Suggest prep amounts using recipe batch yields or unit counts.
  * Allow manual overrides, assign prep tasks to stations, and add notes.
  * Export prep sheets as CSV and finalize them into history.
* **History View**:

  * Review past on-hand snapshots and prep lists.
  * Export/import complete history as JSON.

---

## Technology

* **Pure static app**: HTML, CSS, JavaScript – no build tools required.
* **Service Worker** (`sw.js`) – offline caching for PWA use.
* **Web App Manifest** (`manifest.json`) – addable to home screen on mobile.
* **LocalStorage** – persistent data in the browser.
* **Tesseract.js** – optional OCR for on-hand worksheets.

---

## Installation & Usage

1. Clone or download this repository.

2. Open `index.html` in a modern browser (Chrome, Edge, Firefox).

3. Optional: Serve via a simple static server (for service worker support):

   ```bash
   npx serve .
   ```

4. Add the app to your home screen (mobile) or install as a PWA (desktop).

---

## File Structure

```
index.html       # Main app shell (tabs, templates)
style.css        # Unified theme & styles
script.js        # Tab navigation, Menu Planner, Ingredient Converter
app.js           # Prep & Par app logic
sw.js            # Service Worker for offline caching
manifest.json    # PWA metadata
```

---

## Data & Storage

* Data is stored in the browser’s LocalStorage under keys like:

  * `mp_menuList`, `mp_ingredientList` (Menu Planner)
  * `chef_ing_densities_v1` (Converter)
  * `pp_items_v1`, `pp_par_templates_v1`, `pp_onhand_log_v1` (Prep & Par)
* To reset the app, clear local storage in your browser.

---

## Enhancements Implemented

* Item IDs hidden from UI; human-readable names shown instead.
* Support for **Unit Count** in items.
* Recipes synced with default batch yields.
* Simplified CSV export formats (`station,item,unit,par,on_hand`).
* Modifiers removed; manual per-item adjustments allowed in prep generation.
* On-screen editing for on-hand worksheets.
* History export/import for full traceability.

---

## Roadmap

* Multi-user sync (cloud storage integration).
* More robust OCR templates for corporate kitchens.
* Integration with POS or reservation systems for demand forecasting.

---

## License

MIT License – free to use, adapt, and distribute.

---

