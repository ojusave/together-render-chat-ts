export async function loadModelPicker(selectEl) {
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
      option.textContent = model.displayName
        ? `${model.displayName} (${model.id})`
        : model.id;
      group.append(option);
    }
    selectEl.append(group);
  }

  const preferred = data.default || models[0]?.id || "";
  if (preferred) selectEl.value = preferred;
  return selectEl.value;
}

export function selectedModel(selectEl) {
  return selectEl instanceof HTMLSelectElement ? selectEl.value : "";
}
