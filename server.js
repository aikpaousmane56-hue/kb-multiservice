import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 3000;
const adminPassword = process.env.ADMIN_PASSWORD;
const dataDirectory = join(root, 'data');
const leadsFile = join(dataDirectory, 'leads.json');
const sessions = new Set();
const types = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp'
};

const json = (response, status, body) => {
	response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify(body));
};

const readBody = async (request) => {
	let body = '';
	for await (const chunk of request) {
		body += chunk;
		if (body.length > 20_000) throw new Error('body_too_large');
	}
	return JSON.parse(body || '{}');
};

const isAdmin = (request) => {
	const token = request.headers.cookie?.match(/kb_admin=([^;]+)/)?.[1];
	return Boolean(token && sessions.has(token));
};

const validLead = (payload) => ['name', 'email', 'message'].every((key) => typeof payload[key] === 'string' && payload[key].trim());

const serve = async (request, response) => {
	const pathname = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
	const filePath = normalize(join(root, pathname));
	
	// Protection contre le Directory Traversal (sécurisé et compatible Linux/Windows)
	const rel = relative(root, filePath);
	if (rel.startsWith('..') || isAbsolute(rel)) {
		response.writeHead(403);
		response.end('Forbidden');
		return;
	}

	try {
		const file = await stat(filePath);
		if (!file.isFile()) throw new Error('not_file');
		response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' });
		createReadStream(filePath).pipe(response);
	} catch {
		response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('Not found');
	}
};

createServer(async (request, response) => {
	if (request.method === 'POST' && request.url === '/api/leads') {
		try {
			const payload = await readBody(request);
			if (!validLead(payload)) { json(response, 400, { error: 'Champs requis manquants.' }); return; }
			await mkdir(dataDirectory, { recursive: true });
			let leads = [];
			try { leads = JSON.parse(await readFile(leadsFile, 'utf8')); } catch { /* premier enregistrement */ }
			leads.push({ name: payload.name.trim().slice(0, 120), email: payload.email.trim().slice(0, 180), message: payload.message.trim().slice(0, 4000), createdAt: new Date().toISOString() });
			await writeFile(leadsFile, JSON.stringify(leads, null, 2));
			json(response, 201, { saved: true });
		} catch (error) { json(response, error.message === 'body_too_large' ? 413 : 400, { error: 'Demande invalide.' }); }
		return;
	}
	if (request.method === 'POST' && request.url === '/api/admin/login') {
		try {
			const payload = await readBody(request);
			const expected = Buffer.from(adminPassword || '');
			const received = Buffer.from(String(payload.password || ''));
			if (!adminPassword || expected.length !== received.length || !timingSafeEqual(expected, received)) { json(response, 401, { error: 'Identifiants invalides.' }); return; }
			const token = randomBytes(32).toString('hex'); sessions.add(token);
			response.writeHead(200, { 'Set-Cookie': `kb_admin=${token}; HttpOnly; SameSite=Strict; Path=/`, 'Content-Type': 'application/json' }); response.end(JSON.stringify({ authenticated: true }));
		} catch { json(response, 400, { error: 'Requête invalide.' }); }
		return;
	}
	if (request.method === 'GET' && request.url === '/api/admin/leads') {
		if (!isAdmin(request)) { json(response, 401, { error: 'Authentification requise.' }); return; }
		try { json(response, 200, JSON.parse(await readFile(leadsFile, 'utf8'))); } catch { json(response, 200, []); }
		return;
	}
	if (request.method === 'GET' && request.url === '/api/health') {
		json(response, 200, { status: 'ok', service: 'kb-site' });
		return;
	}
	if (request.method === 'GET') {
		await serve(request, response);
		return;
	}
	response.writeHead(405, { Allow: 'GET' });
	response.end('Method not allowed');
}).listen(port, () => console.log(`KB est disponible sur http://localhost:${port}`));
