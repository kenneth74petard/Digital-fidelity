import { Request, Response, NextFunction } from 'express';

let warnedMissingToken = false;

function getConfiguredToken(): string {
  return (process.env.ADMIN_API_TOKEN || process.env.EXPO_PUBLIC_ADMIN_TOKEN || '').trim();
}

function parseScopedTokens(): Array<{ restaurantId: string; token: string }> {
  const raw = (process.env.ADMIN_API_TOKENS || '').trim();
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const sep = entry.indexOf(':');
      if (sep <= 0 || sep >= entry.length - 1) return null;
      const restaurantId = entry.slice(0, sep).trim();
      const token = entry.slice(sep + 1).trim();
      if (!restaurantId || !token) return null;
      return { restaurantId, token };
    })
    .filter((item): item is { restaurantId: string; token: string } => Boolean(item));
}

function resolveRestaurantScopeFromRequest(req: Request): string {
  const headerRestaurantId = String(req.header('x-restaurant-id') || '').trim();
  const queryRestaurantId = String((req.query.restaurantId || req.query.restaurant_id || '') as string).trim();
  const bodyRestaurantId = String((req.body?.restaurant_id || req.body?.restaurantId || '') as string).trim();

  const candidates = [headerRestaurantId, queryRestaurantId, bodyRestaurantId].filter(Boolean);
  if (candidates.length === 0) return '';

  const first = candidates[0];
  if (candidates.some((value) => value !== first)) {
    return '__mismatch__';
  }

  return first;
}

function isPublicApiRoute(req: Request): boolean {
  const method = req.method.toUpperCase();
  const path = req.path;

  if (method === 'GET' && /^\/passes\/[^/]+\/(download|qr)$/.test(path)) {
    return true;
  }

  if (method === 'POST' && path === '/passes/register') {
    return true;
  }

  return false;
}

function isScopeOptionalRoute(req: Request): boolean {
  return req.method.toUpperCase() === 'POST' && req.path === '/restaurant/setup';
}

export function requireApiToken(req: Request, res: Response, next: NextFunction): void {
  if (isPublicApiRoute(req)) {
    next();
    return;
  }

  const configuredToken = getConfiguredToken();
  if (!configuredToken) {
    if (!warnedMissingToken) {
      console.error('[SECURITY] ADMIN_API_TOKEN is not configured. API access is blocked.');
      warnedMissingToken = true;
    }
    res.status(500).json({
      error: 'Configuration serveur manquante: ADMIN_API_TOKEN requis',
    });
    return;
  }

  const authHeader = req.header('authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const apiHeaderToken = (req.header('x-api-token') || '').trim();
  const providedToken = bearerToken || apiHeaderToken;

  const scopedTokens = parseScopedTokens();
  const matchedScope = scopedTokens.find((entry) => entry.token === providedToken);

  if (matchedScope) {
    req.restaurantScopeId = matchedScope.restaurantId;
    next();
    return;
  }

  if (!providedToken || providedToken !== configuredToken) {
    res.status(401).json({ error: 'Non autorise' });
    return;
  }

  const restaurantScope = resolveRestaurantScopeFromRequest(req);
  if (restaurantScope === '__mismatch__') {
    res.status(400).json({ error: 'Conflit de scope restaurant dans la requete' });
    return;
  }

  if (!restaurantScope) {
    if (isScopeOptionalRoute(req)) {
      next();
      return;
    }
    res.status(400).json({
      error: 'Scope restaurant manquant. Envoyez x-restaurant-id ou restaurant_id/restaurantId.',
    });
    return;
  }

  req.restaurantScopeId = restaurantScope;

  next();
}