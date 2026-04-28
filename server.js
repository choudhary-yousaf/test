// server.js
import express from 'express';

const app = express();

app.use(express.json());
app.use(express.static('.'));

function cleanBaseUrl(value) {
	return String(value || '').replace(/\/+$/, '');
}

async function invokeSupabaseSync(functionName, payload) {
	const supabaseUrl = cleanBaseUrl(process.env.SUPABASE_URL);
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

	if (!supabaseUrl) {
		throw new Error('Missing SUPABASE_URL');
	}
	if (!supabaseKey) {
		throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
	}

	const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: supabaseKey,
			Authorization: `Bearer ${supabaseKey}`
		},
		body: JSON.stringify(payload)
	});

	const json = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(json?.error || `${functionName} failed (${response.status})`);
	}
	return json;
}

function resolveShopifyDomain(requestDomain) {
	return String(requestDomain || process.env.SHOPIFY_STORE_DOMAIN || '').trim();
}

function resolveShopifyToken() {
	return String(process.env.SHOPIFY_ADMIN_API_TOKEN || '').trim();
}

app.post('/api/shopify/sync-products', async (req, res) => {
	try {
		const domain = resolveShopifyDomain(req.body?.domain);
		const token = resolveShopifyToken();

		if (!domain) {
			return res.status(400).json({ error: 'Missing Shopify domain' });
		}
		if (!token) {
			return res.status(500).json({ error: 'Missing SHOPIFY_ADMIN_API_TOKEN' });
		}

		const data = await invokeSupabaseSync('shopify-products-sync', { domain, token });
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: error.message || 'Product sync failed' });
	}
});

app.post('/api/shopify/sync-orders', async (req, res) => {
	try {
		const domain = resolveShopifyDomain(req.body?.domain);
		const token = resolveShopifyToken();

		if (!domain) {
			return res.status(400).json({ error: 'Missing Shopify domain' });
		}
		if (!token) {
			return res.status(500).json({ error: 'Missing SHOPIFY_ADMIN_API_TOKEN' });
		}

		const data = await invokeSupabaseSync('shopify-orders-sync', { domain, token });
		res.json(data);
	} catch (error) {
		res.status(500).json({ error: error.message || 'Order sync failed' });
	}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));