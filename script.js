const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-menu');
const quoteForm = document.querySelector('.quote-form');
const formStatus = document.querySelector('.form-status');
const year = document.querySelector('[data-year]');
const projectList = document.querySelector('#project-list');
const customServiceList = document.querySelector('#custom-service-list');

if (year) year.textContent = new Date().getFullYear();

const renderProjects = () => {
	if (!projectList) return;
	const projects = JSON.parse(localStorage.getItem('kb-projects') || '[]');
	if (!projects.length) return;
	projectList.innerHTML = projects.map((project) => `
		<article class="project-item reveal visible">
			<img src="${project.image}" alt="${project.title}" loading="lazy">
			<div><span>${project.location}</span><h3>${project.title}</h3><p>${project.description}</p></div>
		</article>`).join('');
};
renderProjects();

const renderCustomServices = () => {
	if (!customServiceList) return;
	const services = JSON.parse(localStorage.getItem('kb-services') || '[]');
	customServiceList.innerHTML = services.map((service) => `
		<article class="service-card custom-service reveal visible">
			<img class="service-photo" src="${service.image}" alt="${service.title}" loading="lazy">
			<span>KB</span><h3>${service.title}</h3><p>${service.description}</p>
			<a href="#contact" aria-label="Demander un devis ${service.title}">↗</a>
		</article>`).join('');
};
renderCustomServices();

const closeMenu = () => {
	navigation?.classList.remove('open');
	menuToggle?.setAttribute('aria-expanded', 'false');
};

menuToggle?.addEventListener('click', () => {
	const isOpen = navigation.classList.toggle('open');
	menuToggle.setAttribute('aria-expanded', String(isOpen));
});
navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

const observer = new IntersectionObserver((entries) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) entry.target.classList.add('visible');
	});
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

quoteForm?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!quoteForm.checkValidity()) {
		quoteForm.reportValidity();
		return;
	}
	const data = new FormData(quoteForm);
	const message = `Bonjour KB, je souhaite demander un devis.\nNom : ${data.get('name')}\nE-mail : ${data.get('email')}\nProjet : ${data.get('message')}`;
	try {
		await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), message: data.get('message') }) });
	} catch { /* WhatsApp reste disponible si le serveur n'est pas lancé. */ }
	formStatus.textContent = 'Demande enregistrée. WhatsApp va s’ouvrir pour terminer l’envoi.';
	window.open(`https://wa.me/2250747925674?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
	quoteForm.reset();
});

window.addEventListener('resize', () => {
	if (window.innerWidth > 900) closeMenu();
});
