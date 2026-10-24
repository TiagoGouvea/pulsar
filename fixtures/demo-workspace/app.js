const storageKey = "harness-demo-items";
const form = document.querySelector("#item-form");
const title = document.querySelector("#title");
const filter = document.querySelector("#filter");
const list = document.querySelector("#items");
const empty = document.querySelector("#empty");
const error = document.querySelector("#error");

let items = JSON.parse(localStorage.getItem(storageKey) ?? "[]");

export function matchesFilter(item, query) {
  return item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

function save() {
  localStorage.setItem(storageKey, JSON.stringify(items));
}

function render() {
  const visible = items.filter((item) => matchesFilter(item, filter.value));
  list.replaceChildren(...visible.map((item) => {
    const row = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = item.title;
    const edit = document.createElement("button");
    edit.textContent = "Editar";
    edit.addEventListener("click", () => {
      const next = window.prompt("Novo título", item.title)?.trim();
      if (next) { item.title = next; save(); render(); }
    });
    const remove = document.createElement("button");
    remove.textContent = "Excluir";
    remove.addEventListener("click", () => { items = items.filter((candidate) => candidate.id !== item.id); save(); render(); });
    row.append(text, edit, remove);
    return row;
  }));
  empty.hidden = items.length !== 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = title.value.trim();
  if (!value) { error.textContent = "Informe um título."; title.focus(); return; }
  error.textContent = "";
  items.push({ id: crypto.randomUUID(), title: value });
  save(); title.value = ""; render();
});
filter.addEventListener("input", render);
render();
