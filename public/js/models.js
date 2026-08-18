export async function loadModelPicker(selectEl, filterEl) {
  const res = await fetch("/ui/models");
  const data = await res.json();
  const models = Array.isArray(data.models) ? data.models : [];
  const groups = new Map();
  for (const model of models) {
    const type = model.type || "chat";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(model);
  }

  selectEl.replaceChildren();
  for (const [type, rows] of groups) {
    const group = document.createElement("optgroup");
    group.label = type;
    for (const model of rows) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.displayName || model.id;
      option.title = model.id;
      option.dataset.search = `${model.displayName} ${model.id} ${type}`.toLowerCase();
      group.append(option);
    }
    selectEl.append(group);
  }

  const preferred = data.default || models[0]?.id || "";
  if (preferred) selectEl.value = preferred;

  function applyFilter() {
    const query =
      filterEl instanceof HTMLInputElement
        ? filterEl.value.trim().toLowerCase()
        : "";
    for (const group of selectEl.querySelectorAll("optgroup")) {
      let visible = 0;
      for (const option of group.querySelectorAll("option")) {
        const match =
          !query || (option.dataset.search || option.value).includes(query);
        option.hidden = !match;
        if (match) visible += 1;
      }
      group.hidden = visible === 0;
    }
  }

  if (filterEl instanceof HTMLInputElement) {
    filterEl.addEventListener("input", applyFilter);
  }

  return selectEl.value;
}

export function selectedModel(selectEl) {
  return selectEl instanceof HTMLSelectElement ? selectEl.value : "";
}
