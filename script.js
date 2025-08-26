/* Chef Tools — unified scripts for:
   1) Tab navigation
   2) Menu Planner app (namespaced)
   3) Ingredient Converter app (namespaced)
*/

/* ------------------------
   1) Tab Navigation
-------------------------*/
(function tabs(){
  function setActive(tab){
    const allBtns = document.querySelectorAll('.tabbar .tab');
    const allPanels = document.querySelectorAll('.tab-content');
    allBtns.forEach(btn => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });
    allPanels.forEach(panel => {
      const isActive = panel.id === `tab-${tab}`;
      panel.classList.toggle('active', isActive);
      panel.hidden = !isActive;
    });
    // update hash (optional deep link)
    if (typeof history.replaceState === 'function') {
      history.replaceState(null, '', `#${tab}`);
    } else {
      location.hash = `#${tab}`;
    }
  }
  // Click handlers
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tabbar .tab');
    if (!btn) return;
    setActive(btn.dataset.tab);
    // manage focus for a11y
    document.getElementById(`tab-${btn.dataset.tab}`)?.focus?.();
  });
  // Keyboard navigation: Left/Right on tabs
  document.querySelectorAll('.tabbar .tab').forEach(btn => {
    btn.addEventListener('keydown', (e) => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      const btns = Array.from(document.querySelectorAll('.tabbar .tab'));
      const i = btns.indexOf(e.currentTarget);
      let next = i;
      if (e.key === 'ArrowRight') next = (i + 1) % btns.length;
      if (e.key === 'ArrowLeft')  next = (i - 1 + btns.length) % btns.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End')  next = btns.length - 1;
      btns[next].focus();
      btns[next].click();
      e.preventDefault();
    });
  });
  // Initial tab from hash: support the new "preppar" tab as well
  const initialTab = location.hash.replace('#','') || 'menu';
  // include the new 'catalog' tab when validating the initial hash
  if (['menu','converter','preppar','catalog'].includes(initialTab)) {
    setActive(initialTab);
  } else {
    setActive('menu');
  }
})();

/* ------------------------
   2) Menu Planner (based on your existing app)
   Notes:
   - LocalStorage keys: mp_menuList, mp_ingredientList, mp_ingredientCatalog, mp_expectedSeats
   - Units & conversions preserved
-------------------------*/
(function MenuPlanner(){
  // Unit maps
  const WEIGHT_UNIT_GRAMS = { Pounds: 453.592, Ounces: 28.3495, Grams: 1, Kilograms: 1000 };
  const VOLUME_UNIT_ML   = { Liters: 1000, Milliliters: 1, Cups: 240 };
  const UNCONVERTIBLE_UNITS = ["Bag", "Case"];
  const ALL_UNITS = [
    ...Object.keys(WEIGHT_UNIT_GRAMS),
    ...Object.keys(VOLUME_UNIT_ML),
    ...UNCONVERTIBLE_UNITS,
  ];

  // State
  let menuList = [];
  let ingredientList = [];
  let ingredientCatalog = {}; // { ingredient: { unit: pricePerUnit } }
  let expectedSeats = 1;
  let shoppingList = []; // derived

  // DOM
  const menuTableBody       = document.querySelector('#menu-table tbody');
  const ingredientsTableBody= document.querySelector('#ingredients-table tbody');
  const catalogTableBody    = document.querySelector('#catalog-table tbody');
  const shoppingTableBody   = document.querySelector('#shopping-table tbody');
  const expectedSeatsInput  = document.querySelector('#expected-seats');

  // Data IO
  function loadData() {
    const storedMenu = localStorage.getItem('mp_menuList');
    const storedIngredients = localStorage.getItem('mp_ingredientList');
    const storedCatalog = localStorage.getItem('mp_ingredientCatalog');
    const storedSeats = localStorage.getItem('mp_expectedSeats');
    if (storedMenu && storedIngredients && storedCatalog && storedSeats) {
      try {
        menuList = JSON.parse(storedMenu) || [];
        ingredientList = JSON.parse(storedIngredients) || [];
        ingredientCatalog = JSON.parse(storedCatalog) || {};
        expectedSeats = parseInt(storedSeats, 10) || 1;
      } catch (err) {
        console.error('Failed to parse stored data', err);
        seedSampleData();
      }
    } else {
      seedSampleData();
    }
    expectedSeatsInput.value = expectedSeats;
  }
  function seedSampleData() {
    menuList = [
      { name: 'Salad', description: 'Fresh garden salad' },
      { name: 'Spaghetti', description: 'Classic pasta with tomato sauce' },
    ];
    ingredientList = [
      { dish: 'Salad', ingredient: 'Lettuce', amount: 0.5, unit: 'Pounds' },
      { dish: 'Salad', ingredient: 'Tomato', amount: 0.3, unit: 'Pounds' },
      { dish: 'Salad', ingredient: 'Olive Oil', amount: 0.05, unit: 'Liters' },
      { dish: 'Spaghetti', ingredient: 'Spaghetti Pasta', amount: 100, unit: 'Grams' },
      { dish: 'Spaghetti', ingredient: 'Tomato Sauce', amount: 0.5, unit: 'Liters' },
    ];
    ingredientCatalog = {
      Lettuce: { Pounds: 2.0 },
      Tomato: { Pounds: 1.5 },
      'Olive Oil': { Liters: 10.0 },
      'Spaghetti Pasta': { Grams: 0.01 },
      'Tomato Sauce': { Liters: 3.0 },
    };
    expectedSeats = 4;
  }
  function saveData() {
    localStorage.setItem('mp_menuList', JSON.stringify(menuList));
    localStorage.setItem('mp_ingredientList', JSON.stringify(ingredientList));
    localStorage.setItem('mp_ingredientCatalog', JSON.stringify(ingredientCatalog));
    localStorage.setItem('mp_expectedSeats', String(expectedSeats));
  }

  // Menu ops
  function addDish() {
    menuList.push({ name: '', description: '' });
    renderMenuTable();
    saveData();
  }
  function removeDish(index) {
    const removedDish = menuList.splice(index, 1)[0];
    ingredientList = ingredientList.filter(item => item.dish !== removedDish.name);
    renderMenuTable();
    renderIngredientsTable();
    saveData();
  }
  function renderMenuTable() {
    menuTableBody.innerHTML = '';
    menuList.forEach((dish, idx) => {
      const tr = document.createElement('tr');
      // name
      const nameTd = document.createElement('td');
      const nameInput = Object.assign(document.createElement('input'), { type: 'text', value: dish.name, placeholder: 'Dish Name' });
      nameInput.addEventListener('input', () => {
        const old = dish.name;
        dish.name = nameInput.value;
        updateDishNamesInIngredients(old, dish.name);
        saveData();
      });
      nameTd.appendChild(nameInput);
      tr.appendChild(nameTd);
      // desc
      const descTd = document.createElement('td');
      const descInput = Object.assign(document.createElement('input'), { type: 'text', value: dish.description, placeholder: 'Description' });
      descInput.addEventListener('input', () => { dish.description = descInput.value; saveData(); });
      descTd.appendChild(descInput);
      tr.appendChild(descTd);
      // remove
      const removeTd = document.createElement('td');
      const removeBtn = Object.assign(document.createElement('button'), { textContent: 'Remove', className: 'remove-btn' });
      removeBtn.addEventListener('click', () => removeDish(idx));
      removeTd.appendChild(removeBtn);
      tr.appendChild(removeTd);
      menuTableBody.appendChild(tr);
    });
    updateDishSelectOptions();
  }
  function updateDishNamesInIngredients(oldName, newName) {
    ingredientList.forEach(item => { if (item.dish === oldName) item.dish = newName; });
    renderIngredientsTable();
  }

  // Ingredient ops
  function addIngredient() {
    ingredientList.push({
      dish: menuList.length ? menuList[0].name : '',
      ingredient: '', amount: '', unit: ALL_UNITS[0]
    });
    renderIngredientsTable();
    saveData();
  }
  function removeIngredient(index) {
    ingredientList.splice(index, 1);
    renderIngredientsTable();
    saveData();
  }
  function renderIngredientsTable() {
    ingredientsTableBody.innerHTML = '';
    ingredientList.forEach((item, idx) => {
      const tr = document.createElement('tr');

      // dish select
      const dishTd = document.createElement('td');
      const dishSelect = document.createElement('select');
      updateSelectOptions(dishSelect, menuList.map(d => d.name));
      dishSelect.value = item.dish;
      dishSelect.addEventListener('change', () => { item.dish = dishSelect.value; saveData(); });
      dishTd.appendChild(dishSelect); tr.appendChild(dishTd);

      // ingredient name
      const ingrTd = document.createElement('td');
      const ingrInput = Object.assign(document.createElement('input'), { type: 'text', value: item.ingredient, placeholder: 'Ingredient' });
      ingrInput.addEventListener('input', () => { item.ingredient = ingrInput.value; saveData(); });
      ingrTd.appendChild(ingrInput); tr.appendChild(ingrTd);

      // amount
      const amtTd = document.createElement('td');
      const amtInput = Object.assign(document.createElement('input'), { type: 'number', min: '0', step: 'any', value: item.amount, placeholder: 'Amount' });
      amtInput.addEventListener('input', () => { const v = parseFloat(amtInput.value); item.amount = isNaN(v) ? '' : v; saveData(); });
      amtTd.appendChild(amtInput); tr.appendChild(amtTd);

      // unit
      const unitTd = document.createElement('td');
      const unitSelect = document.createElement('select');
      updateSelectOptions(unitSelect, ALL_UNITS);
      unitSelect.value = item.unit;
      unitSelect.addEventListener('change', () => { item.unit = unitSelect.value; saveData(); });
      unitTd.appendChild(unitSelect); tr.appendChild(unitTd);

      // remove
      const removeTd = document.createElement('td');
      const removeBtn = Object.assign(document.createElement('button'), { textContent: 'Remove', className: 'remove-btn' });
      removeBtn.addEventListener('click', () => removeIngredient(idx));
      removeTd.appendChild(removeBtn); tr.appendChild(removeTd);

      ingredientsTableBody.appendChild(tr);
    });
  }
  function updateDishSelectOptions() {
    const selects = ingredientsTableBody.querySelectorAll('select');
    selects.forEach((select, idx) => {
      if (idx % 2 === 0) { // first select in each row is dish select
        const selected = select.value;
        updateSelectOptions(select, menuList.map(d => d.name));
        if (!menuList.map(d => d.name).includes(selected)) {
          if (menuList.length > 0) {
            select.value = menuList[0].name;
            if (ingredientList[idx / 2]) ingredientList[idx / 2].dish = select.value;
          }
        }
      }
    });
  }
  function updateSelectOptions(selectEl, options) {
    selectEl.innerHTML = '';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      selectEl.appendChild(o);
    });
  }

  // Shopping list & conversions
  function convertAmount(amount, fromUnit, toUnit) {
    if (fromUnit === toUnit) return amount;
    if (WEIGHT_UNIT_GRAMS[fromUnit] && WEIGHT_UNIT_GRAMS[toUnit]) {
      const grams = amount * WEIGHT_UNIT_GRAMS[fromUnit];
      return grams / WEIGHT_UNIT_GRAMS[toUnit];
    }
    if (VOLUME_UNIT_ML[fromUnit] && VOLUME_UNIT_ML[toUnit]) {
      const ml = amount * VOLUME_UNIT_ML[fromUnit];
      return ml / VOLUME_UNIT_ML[toUnit];
    }
    return null; // incompatible
  }
  function computeShoppingData() {
    const seats = expectedSeats;
    const agg = {};
    ingredientList.forEach(item => {
      const { ingredient, amount, unit } = item;
      if (!ingredient || amount === '' || amount == null) return;
      const total = parseFloat(amount) * seats;
      const key = ingredient;
      if (!agg[key]) {
        agg[key] = { amount: total, unit };
      } else {
        const converted = convertAmount(total, unit, agg[key].unit);
        if (converted !== null) agg[key].amount += converted;
        else {
          const newKey = `${ingredient} (${unit})`;
          agg[newKey] = agg[newKey] || { amount: total, unit };
        }
      }
    });
    return Object.keys(agg).map(k => ({ ingredient: k, totalAmount: agg[k].amount, unit: agg[k].unit }));
  }
  function generateShoppingList() {
    const rows = computeShoppingData();
    shoppingList = rows.map(({ ingredient, totalAmount, unit }) => {
      const base = ingredient.includes(' (') ? ingredient.slice(0, ingredient.indexOf(' (')) : ingredient;
      return {
        ingredient: base,
        displayName: ingredient,
        totalAmount,
        unit,
        numUnits: '',
        typeOfUnit: unit,
        price: '',
        priceAuto: true
      };
    });
    renderShoppingTable();
  }
  function clearShoppingList() {
    shoppingList = [];
    renderShoppingTable();
  }
  function convertPricePerUnit(price, fromUnit, toUnit) {
    if (fromUnit === toUnit) return price;
    if (WEIGHT_UNIT_GRAMS[fromUnit] && WEIGHT_UNIT_GRAMS[toUnit]) {
      const pricePerGram = price / WEIGHT_UNIT_GRAMS[fromUnit];
      return pricePerGram * WEIGHT_UNIT_GRAMS[toUnit];
    }
    if (VOLUME_UNIT_ML[fromUnit] && VOLUME_UNIT_ML[toUnit]) {
      const pricePerMl = price / VOLUME_UNIT_ML[fromUnit];
      return pricePerMl * VOLUME_UNIT_ML[toUnit];
    }
    return null;
    }
  function updatePriceForRow(index, priceInputEl) {
    const item = shoppingList[index];
    if (!item.priceAuto && item.price !== '') return;
    const { ingredient, numUnits, typeOfUnit } = item;
    if (!numUnits || numUnits === '' || !typeOfUnit) {
      item.price = ''; item.priceAuto = true;
      if (priceInputEl) priceInputEl.value = '';
      return;
    }
    const unit = typeOfUnit;
    let pricePerUnit = null;
    if (ingredientCatalog[ingredient] && ingredientCatalog[ingredient][unit] !== undefined) {
      pricePerUnit = ingredientCatalog[ingredient][unit];
    } else if (ingredientCatalog[ingredient]) {
      const entries = ingredientCatalog[ingredient];
      for (const u of Object.keys(entries)) {
        const converted = convertPricePerUnit(entries[u], u, unit);
        if (converted !== null) { pricePerUnit = converted; break; }
      }
    }
    if (pricePerUnit !== null) {
      item.price = (pricePerUnit * numUnits).toFixed(2);
      item.priceAuto = true;
      if (priceInputEl) priceInputEl.value = item.price;
    } else {
      item.price = ''; item.priceAuto = true;
      if (priceInputEl) priceInputEl.value = '';
    }
  }
  function updateCatalogFromRow(item) {
    const { ingredient, numUnits, typeOfUnit, price } = item;
    const units = typeOfUnit;
    if (!ingredientCatalog[ingredient]) ingredientCatalog[ingredient] = {};
    const pricePerUnit = parseFloat(price) / parseFloat(numUnits);
    ingredientCatalog[ingredient][units] = pricePerUnit;

    if (WEIGHT_UNIT_GRAMS[units]) {
      const pricePerGram = pricePerUnit / WEIGHT_UNIT_GRAMS[units];
      Object.keys(WEIGHT_UNIT_GRAMS).forEach(u => {
        ingredientCatalog[ingredient][u] = pricePerGram * WEIGHT_UNIT_GRAMS[u];
      });
    } else if (VOLUME_UNIT_ML[units]) {
      const pricePerMl = pricePerUnit / VOLUME_UNIT_ML[units];
      Object.keys(VOLUME_UNIT_ML).forEach(u => {
        ingredientCatalog[ingredient][u] = pricePerMl * VOLUME_UNIT_ML[u];
      });
    } else {
      ingredientCatalog[ingredient][units] = pricePerUnit; // unconvertible
    }
    item.priceAuto = false;
    saveData();
    renderCatalogTable();
  }

  function renderShoppingTable() {
    shoppingTableBody.innerHTML = '';
    shoppingList.forEach((item, idx) => {
      const tr = document.createElement('tr');

      // ingredient
      const ingrTd = document.createElement('td');
      ingrTd.textContent = item.displayName; tr.appendChild(ingrTd);

      // total
      const totalTd = document.createElement('td');
      totalTd.textContent = Number(item.totalAmount.toFixed(3)); tr.appendChild(totalTd);

      // unit display
      const unitTd = document.createElement('td');
      unitTd.textContent = item.unit; tr.appendChild(unitTd);

      // prepare inputs first (closures)
      const priceInput = Object.assign(document.createElement('input'), { type:'number', min:'0', step:'any', value:item.price, placeholder:'Price' });
      priceInput.addEventListener('input', () => {
        item.price = priceInput.value; item.priceAuto = false;
        if (item.numUnits && item.price !== '') updateCatalogFromRow(item);
      });

      // num units
      const numTd = document.createElement('td');
      const numSelect = document.createElement('select');
      const blankOpt = new Option('', '');
      numSelect.appendChild(blankOpt);
      for (let i = 0; i <= 100; i++) numSelect.appendChild(new Option(String(i), String(i)));
      numSelect.value = item.numUnits !== '' ? String(item.numUnits) : '';
      numSelect.addEventListener('change', () => {
        item.numUnits = numSelect.value === '' ? '' : parseInt(numSelect.value, 10);
        updatePriceForRow(idx, priceInput);
      });
      numTd.appendChild(numSelect); tr.appendChild(numTd);

      // type of unit
      const typeTd = document.createElement('td');
      const typeSelect = document.createElement('select');
      [...Object.keys(WEIGHT_UNIT_GRAMS), ...Object.keys(VOLUME_UNIT_ML), ...UNCONVERTIBLE_UNITS].forEach(u => typeSelect.appendChild(new Option(u, u)));
      typeSelect.value = item.typeOfUnit;
      typeSelect.addEventListener('change', () => { item.typeOfUnit = typeSelect.value; updatePriceForRow(idx, priceInput); });
      typeTd.appendChild(typeSelect); tr.appendChild(typeTd);

      // price input
      const priceTd = document.createElement('td');
      priceTd.appendChild(priceInput); tr.appendChild(priceTd);

      // remove
      const removeTd = document.createElement('td');
      const removeBtn = Object.assign(document.createElement('button'), { textContent: 'Remove', className: 'remove-btn' });
      removeBtn.addEventListener('click', () => { shoppingList.splice(idx, 1); renderShoppingTable(); });
      removeTd.appendChild(removeBtn); tr.appendChild(removeTd);

      shoppingTableBody.appendChild(tr);

      if (item.priceAuto && item.numUnits && item.typeOfUnit) updatePriceForRow(idx, priceInput);
    });
    renderCatalogTable();
  }
  function renderCatalogTable() {
    catalogTableBody.innerHTML = '';
    Object.keys(ingredientCatalog).forEach(ingredient => {
      const units = ingredientCatalog[ingredient];
      Object.keys(units).forEach(unit => {
        const price = units[unit];
        const tr = document.createElement('tr');
        const ingrTd = document.createElement('td'); ingrTd.textContent = ingredient; tr.appendChild(ingrTd);
        const numTd  = document.createElement('td'); numTd.textContent = '1';       tr.appendChild(numTd);
        const unitTd = document.createElement('td'); unitTd.textContent = unit;    tr.appendChild(unitTd);
        const priceTd= document.createElement('td');
        priceTd.textContent = (price < 0.01 && price > 0) ? price.toFixed(4) : price.toFixed(2);
        tr.appendChild(priceTd);
        catalogTableBody.appendChild(tr);
      });
    });
  }

  // Wire up buttons
  document.querySelector('#add-dish-btn')?.addEventListener('click', addDish);
  document.querySelector('#add-ingredient-btn')?.addEventListener('click', addIngredient);
  document.querySelector('#generate-btn')?.addEventListener('click', () => {
    expectedSeats = parseInt(expectedSeatsInput.value, 10) || 1;
    saveData();
    generateShoppingList();
  });
  document.querySelector('#clear-shopping-btn')?.addEventListener('click', clearShoppingList);

  // Init
  (function init(){
    loadData();
    renderMenuTable();
    renderIngredientsTable();
    renderCatalogTable();
  })();
})();

/* ------------------------
   3) Ingredient Converter (based on your existing single-file app)
   Notes:
   - LocalStorage keys: chef_ing_densities_v1, chef_conv_rows_v1
   - UI restyled to match Menu Planner brand
-------------------------*/
(function Converter(){
  const DEFAULT_DENSITIES = {
    "All-Purpose Flour":120,"Bread Flour":125,"Cake Flour":110,"Granulated Sugar":200,
    "Brown Sugar (packed)":220,"Powdered Sugar":120,"Kosher Salt":145,"Table Salt":292,
    "Baking Soda":230,"Baking Powder":192,"Instant Yeast":150,"Rice (uncooked)":185,
    "Quinoa (uncooked)":170,"Rolled Oats":90,"Cornmeal":160
  };
  const STORAGE_ING  = 'chef_ing_densities_v1';
  const STORAGE_ROWS = 'chef_conv_rows_v1';
  const CUP_ML = 236.588;
  const METRIC_UNITS = [{value:'g',label:'g'},{value:'kg',label:'kg'},{value:'ml',label:'ml'},{value:'l',label:'l'}];

  let tbody, addRowBtn, copyTableBtn, exportCSVBtn, autoConvertToggle, ingListEl, savedCountEl, addIngredientBtn, newIngName, newIngDensity, resetDefaultsBtn, clearStorageBtn, debugBanner;
  let densities = {};

  /*
    Synchronization between unified Catalog ingredients and the Converter densities.

    The Ingredient Converter originally stores ingredient densities in
    `chef_ing_densities_v1`.  The new unified data model stores all ingredients
    as objects in `ct_ingredients_v1` with fields `name`, `density` and
    optional `price`.  To keep data consistent:
      - When loading densities, we merge values from both `chef_ing_densities_v1`
        and `ct_ingredients_v1` (unified ingredients) into the `densities`
        object.
      - When densities are saved or modified through the Converter, we update
        both `chef_ing_densities_v1` and `ct_ingredients_v1` accordingly.  New
        ingredients added in the converter are created in the unified data with
        undefined price.
  */
  function syncDensitiesFromUnified() {
    try {
      const raw = localStorage.getItem('ct_ingredients_v1');
      if (!raw) return;
      const arr = JSON.parse(raw) || [];
      arr.forEach(ing => {
        if (ing && typeof ing.name === 'string' && ing.density != null) {
          densities[ing.name] = ing.density;
        }
      });
    } catch (err) {
      console.warn('Failed to merge unified ingredient densities', err);
    }
  }
  function syncUnifiedFromDensities() {
    try {
      // Update unified catalog (ct_ingredients_v1) with current densities, preserving existing price if present
      const raw = localStorage.getItem('ct_ingredients_v1');
      let arr = [];
      if (raw) {
        try { arr = JSON.parse(raw) || []; } catch (_) { arr = []; }
      }
      // Build a map for quick lookup
      const map = {};
      arr.forEach(item => { if (item && item.name) map[item.name] = item; });
      for (const name in densities) {
        const densVal = densities[name];
        if (!map[name]) {
          map[name] = { name: name, density: densVal, price: null };
        } else {
          map[name].density = densVal;
        }
      }
      // Rebuild array from map
      const out = Object.values(map);
      localStorage.setItem('ct_ingredients_v1', JSON.stringify(out));
      // Also save densities to the legacy key so old code stays in sync
      localStorage.setItem(STORAGE_ING, JSON.stringify(densities));
    } catch (err) {
      console.warn('Failed to sync densities to unified storage', err);
    }
  }

  function el(tag, props={}, ...children){
    const n = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'html') n.innerHTML = props[k];
      else n.setAttribute(k, props[k]);
    }
    children.forEach(c => {
      if (typeof c === 'string') n.appendChild(document.createTextNode(c));
      else if (c) n.appendChild(c);
    });
    return n;
  }
  function showDebug(msg){
    if (debugBanner){ debugBanner.textContent = msg; debugBanner.style.display = 'block'; }
    else console.warn('DEBUG:', msg);
  }
  function safeParseJSON(raw){ try { return JSON.parse(raw); } catch(e){ return null; } }

  function loadDensities(){
    try {
      const raw = localStorage.getItem(STORAGE_ING);
      if (!raw) return {...DEFAULT_DENSITIES};
      const parsed = safeParseJSON(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        localStorage.removeItem(STORAGE_ING); return {...DEFAULT_DENSITIES};
      }
      return {...DEFAULT_DENSITIES, ...parsed};
    } catch(e) {
      console.warn('loadDensities failed', e);
      try { localStorage.removeItem(STORAGE_ING); } catch(_){}
      return {...DEFAULT_DENSITIES};
    }
  }
  function saveDensities(){
    try {
      localStorage.setItem(STORAGE_ING, JSON.stringify(densities));
    } catch(e) { console.warn(e); }
    // Whenever densities are saved, synchronize them to the unified catalog so other tools can read updated values
    syncUnifiedFromDensities();
  }

  function loadRows(){
    try {
      const raw = localStorage.getItem(STORAGE_ROWS);
      if (!raw) return [];
      const parsed = safeParseJSON(raw);
      if (!Array.isArray(parsed)) { localStorage.removeItem(STORAGE_ROWS); return []; }
      return parsed;
    } catch(e) {
      console.warn(e);
      try { localStorage.removeItem(STORAGE_ROWS); } catch(_){}
      return [];
    }
  }
  function saveRows(){
    try {
      const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => ({
        ingredient: tr.querySelector('.ing-select')?.value || '',
        override:   tr.querySelector('.override-input')?.value || '',
        amount:     tr.querySelector('.amount-input')?.value || '',
        unit:       tr.querySelector('.unit-select')?.value || ''
      }));
      localStorage.setItem(STORAGE_ROWS, JSON.stringify(rows));
    } catch(e){ console.warn('saveRows', e); }
  }

  function createIngredientSelect(value=''){
    const s = el('select',{class:'ing-select'});
    s.appendChild(el('option',{value:''}, '— pick ingredient —'));
    const names = Object.keys(densities).sort((a,b)=>a.localeCompare(b));
    for (const n of names) {
      const o = el('option',{value:n}, n);
      if (n === value) o.selected = true;
      s.appendChild(o);
    }
    s.addEventListener('change', ()=> { const tr = s.closest('tr'); if (tr && autoConvertToggle.checked) convertRow(tr); });
    return s;
  }

  function addRow(pref={ingredient:'', override:'', amount:'', unit:'g'}, focus=true){
    const tr = document.createElement('tr');

    // Ingredient cell (override + select)
    const ingTd = el('td'); ingTd.className = 'ingredient-cell';
    const overrideInput = el('input',{type:'text', placeholder:'Override name (optional)', class:'override-input'});
    overrideInput.value = pref.override || '';
    overrideInput.addEventListener('input', ()=> { if (autoConvertToggle.checked) convertRow(tr); });
    const ingSelect = createIngredientSelect(pref.ingredient || '');
    ingTd.appendChild(overrideInput); ingTd.appendChild(ingSelect); tr.appendChild(ingTd);

    // Amount
    const amtTd = el('td');
    const amtInput = el('input',{type:'number', step:'0.01', class:'amount-input', placeholder:'0'});
    amtInput.value = pref.amount || '';
    amtInput.addEventListener('input', ()=> { if (autoConvertToggle.checked) convertRow(tr); });
    amtTd.appendChild(amtInput); tr.appendChild(amtTd);

    // Unit
    const unitTd = el('td');
    const unitSelect = el('select',{class:'unit-select'});
    METRIC_UNITS.forEach(u => {
      const o = el('option',{value:u.value}, u.label);
      if (u.value === (pref.unit || 'g')) o.selected = true;
      unitSelect.appendChild(o);
    });
    unitSelect.addEventListener('change', ()=> { if (autoConvertToggle.checked) convertRow(tr); });
    unitTd.appendChild(unitSelect); tr.appendChild(unitTd);

    // Conversions
    const convTd = el('td',{class:'conv-cell'}, '—');
    tr.appendChild(convTd);

    // Actions
    const actionsTd = el('td',{class:'actions'});
    const convertBtn = el('button',{type:'button'}, 'Convert');
    convertBtn.addEventListener('click', ()=> convertRow(tr));
    const copyRowBtn = el('button',{type:'button'}, 'Copy');
    copyRowBtn.addEventListener('click', ()=> copyRow(tr));
    const removeBtn = el('button',{type:'button', class:'removeBtn'}, 'Remove');
    removeBtn.addEventListener('click', ()=> { tr.remove(); saveRows(); renderSavedCount(); });
    const stack = el('div',{style:'display:flex;flex-direction:column;align-items:flex-end;gap:8px'});
    stack.appendChild(convertBtn); stack.appendChild(copyRowBtn); stack.appendChild(removeBtn);
    actionsTd.appendChild(stack);
    tr.appendChild(actionsTd);

    tbody.appendChild(tr);

    if (pref.ingredient && pref.amount) convertRow(tr);
    if (focus) overrideInput.focus();
    saveRows(); renderSavedCount();
    return tr;
  }

  function roundTo(n,d){ const f = Math.pow(10,d); return (Math.round((n + Number.EPSILON) * f) / f).toFixed(d); }

  function convertRow(tr){
    if (!tr) return;
    const overrideName = tr.querySelector('.override-input')?.value.trim();
    const ingredient   = tr.querySelector('.ing-select')?.value || '';
    const amountStr    = tr.querySelector('.amount-input')?.value;
    const unit         = tr.querySelector('.unit-select')?.value;
    const convCell     = tr.querySelector('.conv-cell');

    if (!ingredient){ convCell.textContent = 'Pick ingredient'; return; }
    const density = densities[ingredient];
    if (!density){ convCell.textContent = 'Unknown density — add it below'; return; }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0){ convCell.textContent = 'Enter amount'; return; }

    let grams;
    if (unit === 'g') grams = amount;
    else if (unit === 'kg') grams = amount * 1000;
    else if (unit === 'ml') grams = amount * (density / CUP_ML);
    else if (unit === 'l')  grams = (amount * 1000) * (density / CUP_ML);
    else grams = amount;

    const cups = grams / density;
    const tbsp = cups * 16;
    const tsp  = tbsp * 3;

    const cupsFmt = roundTo(cups, 3);
    const tbspFmt = roundTo(tbsp, 2);
    const tspFmt  = roundTo(tsp, 2);
    const display = (overrideName || ingredient).replace(/\s+/g,' ').trim();

    // UPDATED: stack conversions vertically with spacing to prevent overflow
    convCell.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px">
        <div class="conv-block" style="margin:0">
          <button class="conv-copy" data-copy="${display}\t${cupsFmt} cup(s)">📋</button>
          <div>${cupsFmt} cup(s)</div>
        </div>
        <div class="conv-block" style="margin:0">
          <button class="conv-copy" data-copy="${display}\t${tbspFmt} tbsp">📋</button>
          <div>${tbspFmt} tbsp</div>
        </div>
        <div class="conv-block" style="margin:0">
          <button class="conv-copy" data-copy="${display}\t${tspFmt} tsp">📋</button>
          <div>${tspFmt} tsp</div>
        </div>
        <div style="color:#777;font-size:0.9em">(${grams.toFixed(1)} g)</div>
      </div>`;
    saveRows();
  }

  async function copyText(text){
    try { if (navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(text); return true; } }
    catch(e){ console.warn('clipboard', e); }
    try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; }
    catch(e){ console.warn('fallback copy', e); return false; }
  }
  function rowToDisplayText(tr){
    const override = tr.querySelector('.override-input')?.value.trim();
    const ing = tr.querySelector('.ing-select')?.value || '';
    const display = override || ing || '(untitled)';
    const amt = tr.querySelector('.amount-input')?.value || '';
    const unit = tr.querySelector('.unit-select')?.value || '';
    const conv = tr.querySelector('.conv-cell')?.textContent || '';
    return `${display}\t${amt} ${unit}\t${conv}`;
  }
  function copyRow(tr){ const txt = rowToDisplayText(tr); copyText(txt).then(ok => console.log(ok ? 'Row copied' : 'Row copy failed')); }

  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest && ev.target.closest('.conv-copy');
    if (btn && btn.dataset && btn.dataset.copy) {
      copyText(btn.dataset.copy).then(ok => {
        const old = btn.textContent;
        if (ok){ btn.textContent = '✅'; setTimeout(()=> btn.textContent = old, 700); }
      });
    }
  });

  function renderIngredientList(){
    ingListEl.innerHTML = '';
    const names = Object.keys(densities).sort((a,b)=>a.localeCompare(b));
    if (names.length === 0){
      ingListEl.appendChild(el('div',{style:'color:#777;padding:10px;border-radius:8px;background:#fafafa'}, 'No ingredients saved. Add one above.'));
      return;
    }
    for (const n of names){
      const row = el('div',{style:'display:flex;gap:8px;align-items:center;margin-bottom:8px'});
      const nameSpan = el('div',{style:'flex:1;font-weight:600'}, n);
      const densInput = el('input',{type:'number', value: densities[n], style:'width:120px;padding:8px;border-radius:8px;border:1px solid #eee'});
      densInput.addEventListener('change', (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0){
          densities[n] = v; saveDensities();
          if (autoConvertToggle.checked) for (const tr of tbody.querySelectorAll('tr')) {
            const sel = tr.querySelector('.ing-select'); if (sel && sel.value === n) convertRow(tr);
          }
        } else { e.target.value = densities[n]; alert('Density must be positive'); }
      });
      const del = el('button',{class:'removeBtn'}, 'Delete');
      del.addEventListener('click', ()=> {
        if (!confirm(`Delete "${n}"?`)) return;
        delete densities[n];
        saveDensities(); renderIngredientList(); updateSelects();
        for (const tr of tbody.querySelectorAll('tr')) {
          const sel = tr.querySelector('.ing-select');
          if (sel && sel.value === n){ sel.value=''; tr.querySelector('.conv-cell').textContent='Unknown density'; }
        }
        saveRows();
      });
      row.appendChild(nameSpan); row.appendChild(densInput); row.appendChild(del);
      ingListEl.appendChild(row);
    }
    savedCountEl.textContent = `${Object.keys(densities).length} ingredients`;
  }
  function handleAddIngredient(){
    const name = (newIngName.value || '').trim();
    const dens = parseFloat(newIngDensity.value);
    if (!name) return alert('Enter an ingredient name');
    if (isNaN(dens) || dens <= 0) return alert('Enter a valid density (g per cup)');
    densities[name] = dens; saveDensities();
    newIngName.value=''; newIngDensity.value='';
    renderIngredientList(); updateSelects();
  }
  function updateSelects(){
    const names = Object.keys(densities).sort((a,b)=>a.localeCompare(b));
    for (const sel of document.querySelectorAll('.ing-select')){
      const prev = sel.value;
      sel.innerHTML = '';
      sel.appendChild(el('option',{value:''}, '— pick ingredient —'));
      for (const n of names){
        const o = el('option',{value:n}, n);
        if (n === prev) o.selected = true;
        sel.appendChild(o);
      }
    }
  }
  function renderSavedCount(){ savedCountEl.textContent = `${Object.keys(densities).length} ingredients`; }
  function hydrateRows(){
    const saved = loadRows();
    if (saved && saved.length){
      for (const r of saved) addRow({ingredient:r.ingredient||'', override:r.override||'', amount:r.amount||'', unit:r.unit||'g'}, false);
    } else {
      addRow({ingredient:'All-Purpose Flour', override:'', amount:'100', unit:'g'}, false);
    }
  }
  function copyAll(){
    const rows = Array.from(tbody.querySelectorAll('tr')).map(rowToDisplayText);
    const text = ['Ingredient\tAmount\tConversions', ...rows].join('\n');
    copyText(text).then(ok => console.log(ok ? 'Table copied' : 'Table copy failed'));
  }
  function exportCSV(){
    const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => {
      const override = tr.querySelector('.override-input')?.value.trim();
      const ing = tr.querySelector('.ing-select')?.value || '';
      const display = override || ing || '';
      const amt = tr.querySelector('.amount-input')?.value || '';
      const unit = tr.querySelector('.unit-select')?.value || '';
      const conv = tr.querySelector('.conv-cell')?.textContent || '';
      return [display, amt, unit, conv].map(s => `"${String(s).replace(/"/g,'""')}"`).join(',');
    });
    const csv = ['"Ingredient","Amount","Unit","Conversions"', ...rows].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ingredient_conversions_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function init(){
    tbody = document.querySelector('#convTable tbody');
    addRowBtn = document.getElementById('addRowBtn');
    copyTableBtn = document.getElementById('copyTableBtn');
    exportCSVBtn = document.getElementById('exportCSVBtn');
    autoConvertToggle = document.getElementById('autoConvertToggle');
    ingListEl = document.getElementById('ingList');
    savedCountEl = document.getElementById('savedCount');
    addIngredientBtn = document.getElementById('addIngredientBtn');
    newIngName = document.getElementById('newIngName');
    newIngDensity = document.getElementById('newIngDensity');
    resetDefaultsBtn = document.getElementById('resetDefaults');
    clearStorageBtn = document.getElementById('clearStorage');
    debugBanner = document.getElementById('debugBanner');

    if (!tbody) return; // converter tab not on page? (defensive)

    densities = loadDensities();
    // Merge unified ingredient densities into the local densities.  This picks up
    // values from `ct_ingredients_v1` and ensures both sources are in sync.
    syncDensitiesFromUnified();
    renderIngredientList();
    hydrateRows();
    updateSelects();
    renderSavedCount();

    addRowBtn?.addEventListener('click', ()=> addRow({ingredient:'',override:'',amount:'',unit:'g'}, true));
    copyTableBtn?.addEventListener('click', copyAll);
    exportCSVBtn?.addEventListener('click', exportCSV);
    autoConvertToggle?.addEventListener('change', ()=> { if (autoConvertToggle.checked) for (const tr of tbody.querySelectorAll('tr')) convertRow(tr); saveRows(); });
    addIngredientBtn?.addEventListener('click', handleAddIngredient);

    resetDefaultsBtn?.addEventListener('click', ()=> {
      if (!confirm('Reset density list to defaults?')) return;
      densities = {...DEFAULT_DENSITIES}; saveDensities(); renderIngredientList(); updateSelects(); renderSavedCount();
    });
    clearStorageBtn?.addEventListener('click', ()=> {
      if (!confirm('Clear saved densities and rows?')) return;
      try { localStorage.removeItem(STORAGE_ING); localStorage.removeItem(STORAGE_ROWS); } catch(e){ console.warn(e); }
      densities = {...DEFAULT_DENSITIES}; tbody.innerHTML = '';
      saveDensities(); renderIngredientList(); renderSavedCount();
    });

    tbody?.addEventListener('input', ()=> {
      if (window.__save_timer) clearTimeout(window.__save_timer);
      window.__save_timer = setTimeout(()=> { saveRows(); window.__save_timer = null; }, 400);
    });
  }

  // Initialize now (DOM is ready because script is at end of body)
  init();
})();
