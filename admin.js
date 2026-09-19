const projectForm = document.querySelector('#project-form');
const serviceForm = document.querySelector('#service-form');
const projectAdminList = document.querySelector('#project-admin-list');
const serviceAdminList = document.querySelector('#service-admin-list');
const leadAdminList = document.querySelector('#lead-admin-list');
const adminStatus = document.querySelector('#admin-status');
const loginForm = document.querySelector('#login-form');
const adminLogin = document.querySelector('#admin-login');
const adminContent = document.querySelector('#admin-content');
const loginStatus = document.querySelector('#login-status');

const readItems = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const saveItems = (key, items) => localStorage.setItem(key, JSON.stringify(items));

const showStatus = (message) => {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  window.setTimeout(() => { adminStatus.textContent = ''; }, 3000);
};

const renderList = (key, target, label) => {
  const items = readItems(key);
  target.innerHTML = items.length ? items.map((item, index) => `
    <div class="admin-list-item"><div><strong>${item.title}</strong><span>${item.location || item.description}</span></div><button type="button" data-delete-key="${key}" data-delete-index="${index}" aria-label="Supprimer ${label}">Supprimer</button></div>`).join('') : '<p class="admin-empty">Aucun élément ajouté.</p>';
};

const renderAll = () => {
  renderList('kb-projects', projectAdminList, 'la réalisation');
  renderList('kb-services', serviceAdminList, 'le service');
  const leads = JSON.parse(localStorage.getItem('kb-leads') || '[]');
  leadAdminList.innerHTML = leads.length ? leads.slice().reverse().map((lead) => `<div class="admin-list-item"><div><strong>${lead.name} · ${lead.email}</strong><span>${lead.message}</span></div><small>${new Date(lead.createdAt).toLocaleDateString('fr-FR')}</small></div>`).join('') : '<p class="admin-empty">Aucune demande enregistrée.</p>';
};

const loadLeads = async () => {
  try {
    const response = await fetch('/api/admin/leads');
    if (!response.ok) return;
    const leads = await response.json();
    leadAdminList.innerHTML = leads.length ? leads.slice().reverse().map((lead) => `<div class="admin-list-item"><div><strong>${lead.name} · ${lead.email}</strong><span>${lead.message}</span></div><small>${new Date(lead.createdAt).toLocaleDateString('fr-FR')}</small></div>`).join('') : '<p class="admin-empty">Aucune demande enregistrée.</p>';
  } catch { /* interface locale */ }
};

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: new FormData(loginForm).get('password') }) });
  if (!response.ok) { loginStatus.textContent = 'Mot de passe incorrect ou serveur indisponible.'; return; }
  adminLogin.hidden = true;
  adminContent.hidden = false;
  renderAll();
  loadLeads();
});

projectForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(projectForm);
  const items = readItems('kb-projects');
  items.push({ title: data.get('title'), location: data.get('location'), image: data.get('image'), description: data.get('description') });
  saveItems('kb-projects', items);
  projectForm.reset();
  renderAll();
  showStatus('Réalisation ajoutée au site.');
});

serviceForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(serviceForm);
  const items = readItems('kb-services');
  items.push({ title: data.get('title'), image: data.get('image'), description: data.get('description') });
  saveItems('kb-services', items);
  serviceForm.reset();
  renderAll();
  showStatus('Service ajouté.');
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete-key]');
  if (!button) return;
  const items = readItems(button.dataset.deleteKey);
  items.splice(Number(button.dataset.deleteIndex), 1);
  saveItems(button.dataset.deleteKey, items);
  renderAll();
  showStatus('Élément supprimé.');
});

renderAll();
