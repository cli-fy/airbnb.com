import { Cli } from "incur";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

//#region src/utils/fetch.ts
var FetchError = class extends Error {
	constructor(message, status, url) {
		super(message);
		this.status = status;
		this.url = url;
		this.name = "FetchError";
	}
};
async function fetchWithTimeout(url, options = {}, timeoutMs = 1e4) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...options,
			signal: controller.signal
		});
	} finally {
		clearTimeout(timeout);
	}
}
async function fetchJson(url, options = {}, timeoutMs = 1e4) {
	const response = await fetchWithTimeout(url, options, timeoutMs);
	if (!response.ok) throw new FetchError(`upstream returned ${response.status}`, response.status, url);
	return response.json();
}

//#endregion
//#region src/utils/html-extractor.ts
function extractSearchData(html) {
	for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
		const scriptContent = match[1];
		if (scriptContent === void 0) continue;
		const content = scriptContent.trim();
		if (content.includes("\"__typename\":\"StaySearchResult\"") && content.includes("listingParamOverrides")) {
			const jsonStr = findJsonObject(content, "{\"data\":{\"presentation\"");
			if (jsonStr !== null) try {
				return { searchResults: JSON.parse(jsonStr).data.presentation.staysSearch.results.searchResults };
			} catch {}
		}
	}
	return { searchResults: [] };
}
function extractDetailData(html) {
	for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
		const scriptContent = match[1];
		if (scriptContent === void 0) continue;
		const content = scriptContent.trim();
		if ((content.includes("\"__typename\":\"SectionDetail\"") || content.includes("\"__typename\":\"SectionContainer\"")) && content.includes("stayProductDetailPage")) {
			const jsonStr = findJsonObject(content, "{\"data\":{\"presentation\"");
			if (jsonStr !== null) try {
				const parsed = JSON.parse(jsonStr);
				return {
					sections: parsed.data.presentation.stayProductDetailPage.sections.sections,
					metadata: parsed.data.presentation.stayProductDetailPage.sections.metadata
				};
			} catch {}
		}
	}
	return {
		sections: [],
		metadata: null
	};
}
function findJsonObject(content, startMarker) {
	const start = content.indexOf(startMarker);
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let isEscaped = false;
	let jsonStr = "";
	for (let i = start; i < content.length; i++) {
		const ch = content[i];
		jsonStr += ch;
		if (isEscaped) {
			isEscaped = false;
			continue;
		}
		if (ch === "\\") {
			isEscaped = true;
			continue;
		}
		if (ch === "\"" && !inString) {
			inString = true;
			continue;
		}
		if (ch === "\"" && inString) {
			inString = false;
			continue;
		}
		if (!inString) {
			if (ch === "{") depth++;
			if (ch === "}") depth--;
			if (depth === 0 && ch === "}") break;
		}
	}
	return jsonStr;
}

//#endregion
//#region src/clients/airbnb-client.ts
const BASE_URL = "https://www.airbnb.com";
const API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";
function buildHeaders() {
	return {
		"X-Airbnb-API-Key": API_KEY,
		"X-CSRF-Without-Token": "1",
		Referer: `${BASE_URL}/`,
		"Content-Type": "application/json"
	};
}
async function fetchAutocomplete(query, limit = 5) {
	const url = new URL(`${BASE_URL}/api/v2/autocompletes-personalized`);
	url.searchParams.set("locale", "en");
	url.searchParams.set("currency", "USD");
	url.searchParams.set("country", "US");
	url.searchParams.set("key", API_KEY);
	url.searchParams.set("language", "en");
	url.searchParams.set("num_results", String(limit));
	url.searchParams.set("user_input", query);
	url.searchParams.set("api_version", "1.2.0");
	url.searchParams.set("vertical_refinement", "homes");
	url.searchParams.set("region", "-1");
	url.searchParams.set("options", "should_filter_by_vertical_refinement|hide_nav_results|should_show_stays|simple_search");
	return fetchJson(url.toString(), { headers: buildHeaders() });
}
async function fetchUserMarkets() {
	const url = new URL(`${BASE_URL}/api/v2/user_markets`);
	url.searchParams.set("locale", "en");
	url.searchParams.set("currency", "USD");
	url.searchParams.set("language", "en");
	return fetchJson(url.toString(), { headers: buildHeaders() });
}
async function fetchStaysSearch(location) {
	const response = await fetchWithTimeout(`${BASE_URL}/s/${encodeURIComponent(location)}/homes`, { headers: {
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9"
	} });
	if (!response.ok) throw new Error(`upstream returned ${response.status}`);
	return { results: extractSearchData(await response.text()).searchResults };
}
async function fetchStayDetail(listingId) {
	const response = await fetchWithTimeout(`${BASE_URL}/rooms/${listingId}`, { headers: {
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9"
	} });
	if (!response.ok) throw new Error(`upstream returned ${response.status}`);
	const extracted = extractDetailData(await response.text());
	return {
		sections: extracted.sections,
		metadata: extracted.metadata
	};
}

//#endregion
//#region src/routes/autocomplete/schema.ts
const AutocompleteQuerySchema = z.object({
	q: z.string().min(1).openapi({
		description: "Search query for location autocomplete",
		example: "Paris"
	}),
	limit: z.coerce.number().int().min(1).max(20).default(5).openapi({
		description: "Maximum number of suggestions to return",
		example: 5
	})
}).openapi("AutocompleteQuery");
const AutocompleteSuggestionSchema = z.object({
	id: z.string().openapi({ example: "abc123" }),
	displayName: z.string().openapi({ example: "Paris, France" }),
	suggestionType: z.string().openapi({ example: "LOCATION" }),
	verticalType: z.string().openapi({ example: "homes" }),
	location: z.object({
		locationName: z.string().openapi({ example: "Paris, France" }),
		googlePlaceId: z.string().openapi({ example: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ" }),
		countryCode: z.string().openapi({ example: "FR" }),
		boundingBox: z.object({
			swLat: z.number().openapi({ example: 48.8155622 }),
			swLng: z.number().openapi({ example: 2.2242171 }),
			neLat: z.number().openapi({ example: 48.9021476 }),
			neLng: z.number().openapi({ example: 2.4698511 })
		}).optional()
	}).optional()
}).openapi("AutocompleteSuggestion");
const AutocompleteResponseSchema = z.object({ suggestions: z.array(AutocompleteSuggestionSchema).openapi({ description: "List of autocomplete suggestions" }) }).openapi("AutocompleteResponse");

//#endregion
//#region src/routes/autocomplete/route.ts
const autocompleteRoute = createRoute({
	method: "get",
	path: "/search/autocomplete",
	request: { query: AutocompleteQuerySchema },
	responses: {
		200: {
			description: "Autocomplete suggestions",
			content: { "application/json": { schema: AutocompleteResponseSchema } }
		},
		502: {
			description: "Upstream API error",
			content: { "application/json": { schema: AutocompleteResponseSchema } }
		}
	}
});
function registerAutocompleteRoute(app$1) {
	app$1.openapi(autocompleteRoute, async (c) => {
		const { q, limit } = c.req.valid("query");
		try {
			const suggestions = (await fetchAutocomplete(q, limit)).autocomplete_terms.map((term) => ({
				id: term.id,
				displayName: term.display_name,
				suggestionType: term.suggestion_type,
				verticalType: term.vertical_type,
				location: term.location ? {
					locationName: term.location.location_name,
					googlePlaceId: term.location.google_place_id,
					countryCode: term.location.country_code,
					boundingBox: term.location.bounding_box ? {
						swLat: term.location.bounding_box.sw_lat,
						swLng: term.location.bounding_box.sw_lng,
						neLat: term.location.bounding_box.ne_lat,
						neLng: term.location.bounding_box.ne_lng
					} : void 0
				} : void 0
			}));
			return c.json({ suggestions }, 200);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return c.json({
				suggestions: [],
				error: message
			}, 502);
		}
	});
}

//#endregion
//#region src/routes/markets/schema.ts
const MarketSchema = z.object({
	market: z.string().openapi({ example: "Seoul" }),
	countryCode: z.string().openapi({ example: "KR" }),
	locale: z.string().openapi({ example: "en" })
}).openapi("Market");
const MarketsResponseSchema = z.object({
	market: z.string().openapi({ example: "Seoul" }),
	countryCode: z.string().openapi({ example: "KR" }),
	userMarkets: z.array(MarketSchema).openapi({ description: "List of user markets" })
}).openapi("MarketsResponse");

//#endregion
//#region src/routes/markets/route.ts
const marketsRoute = createRoute({
	method: "get",
	path: "/markets",
	request: {},
	responses: {
		200: {
			description: "User market information",
			content: { "application/json": { schema: MarketsResponseSchema } }
		},
		502: {
			description: "Upstream API error",
			content: { "application/json": { schema: MarketsResponseSchema } }
		}
	}
});
function registerMarketsRoute(app$1) {
	app$1.openapi(marketsRoute, async (c) => {
		try {
			const upstream = await fetchUserMarkets();
			const userMarkets = upstream.user_markets.map((m) => ({
				market: m.market,
				countryCode: m.country_code,
				locale: m.locale
			}));
			return c.json({
				market: upstream.market,
				countryCode: upstream.country_code,
				userMarkets
			}, 200);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return c.json({
				market: "",
				countryCode: "",
				userMarkets: [],
				error: message
			}, 502);
		}
	});
}

//#endregion
//#region src/routes/stay-detail/schema.ts
const StayDetailParamsSchema = z.object({ id: z.string().min(1).openapi({
	description: "Airbnb listing ID",
	example: "32705269"
}) }).openapi("StayDetailParams");
const StayDetailResponseSchema = z.object({
	id: z.string().openapi({ example: "32705269" }),
	sections: z.array(z.record(z.unknown())).openapi({ description: "Listing detail sections" }),
	metadata: z.record(z.unknown()).nullable().openapi({ description: "Listing metadata" })
}).openapi("StayDetailResponse");

//#endregion
//#region src/routes/stay-detail/route.ts
const stayDetailRoute = createRoute({
	method: "get",
	path: "/stays/:id",
	request: { params: StayDetailParamsSchema },
	responses: {
		200: {
			description: "Stay detail",
			content: { "application/json": { schema: StayDetailResponseSchema } }
		},
		502: {
			description: "Upstream error",
			content: { "application/json": { schema: StayDetailResponseSchema } }
		}
	}
});
function registerStayDetailRoute(app$1) {
	app$1.openapi(stayDetailRoute, async (c) => {
		const { id } = c.req.valid("param");
		try {
			const upstream = await fetchStayDetail(id);
			const sections = upstream.sections.map((section) => typeof section === "object" && section !== null ? section : {});
			return c.json({
				id,
				sections,
				metadata: typeof upstream.metadata === "object" && upstream.metadata !== null ? upstream.metadata : null
			}, 200);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return c.json({
				id,
				sections: [],
				metadata: null,
				error: message
			}, 502);
		}
	});
}

//#endregion
//#region src/routes/stays-search/schema.ts
const StaysSearchQuerySchema = z.object({
	location: z.string().min(1).openapi({
		description: "Location to search for stays",
		example: "Paris"
	}),
	checkIn: z.string().optional().openapi({
		description: "Check-in date (YYYY-MM-DD)",
		example: "2025-06-01"
	}),
	checkOut: z.string().optional().openapi({
		description: "Check-out date (YYYY-MM-DD)",
		example: "2025-06-05"
	}),
	guests: z.coerce.number().int().min(1).max(16).optional().openapi({
		description: "Number of guests",
		example: 2
	})
}).openapi("StaysSearchQuery");
const StaySearchResultSchema = z.object({
	title: z.string().optional().openapi({ example: "Room in Paris" }),
	subtitle: z.string().optional().openapi({ example: "Private bedroom with Eiffel Tower view" }),
	avgRating: z.string().optional().openapi({ example: "4.98 (229)" }),
	price: z.string().optional().openapi({ example: "$150 total" }),
	pictureUrls: z.array(z.string()).optional().openapi({ example: ["https://a0.muscache.com/im/pictures/1.jpg"] }),
	badges: z.array(z.string()).optional().openapi({ example: ["Guest favorite"] })
}).openapi("StaySearchResult");
const StaysSearchResponseSchema = z.object({
	location: z.string().openapi({ example: "Paris" }),
	results: z.array(StaySearchResultSchema).openapi({ description: "List of stay search results" })
}).openapi("StaysSearchResponse");

//#endregion
//#region src/routes/stays-search/route.ts
const staysSearchRoute = createRoute({
	method: "get",
	path: "/stays",
	request: { query: StaysSearchQuerySchema },
	responses: {
		200: {
			description: "Stay search results",
			content: { "application/json": { schema: StaysSearchResponseSchema } }
		},
		502: {
			description: "Upstream error",
			content: { "application/json": { schema: StaysSearchResponseSchema } }
		}
	}
});
function registerStaysSearchRoute(app$1) {
	app$1.openapi(staysSearchRoute, async (c) => {
		const { location } = c.req.valid("query");
		try {
			const results = (await fetchStaysSearch(location)).results.map((result) => {
				const pictures = Array.isArray(result.contextualPictures) ? result.contextualPictures.map((pic) => {
					if (typeof pic === "object" && pic !== null && "picture" in pic && typeof pic.picture === "string") return String(pic.picture);
					return null;
				}).filter((url) => url !== null) : [];
				const badges = Array.isArray(result.badges) ? result.badges.map((badge) => {
					if (typeof badge === "object" && badge !== null && "text" in badge && typeof badge.text === "string") return String(badge.text);
					return null;
				}).filter((text) => text !== null) : [];
				const price = typeof result.structuredDisplayPrice === "object" && result.structuredDisplayPrice !== null && "primaryLine" in result.structuredDisplayPrice ? String(result.structuredDisplayPrice.primaryLine.price ?? "") : "";
				return {
					title: result.title ?? "",
					subtitle: result.subtitle ?? "",
					avgRating: result.avgRatingLocalized ?? "",
					price,
					pictureUrls: pictures,
					badges
				};
			});
			return c.json({
				location,
				results
			}, 200);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return c.json({
				location,
				results: [],
				error: message
			}, 502);
		}
	});
}

//#endregion
//#region src/app.ts
function createApp() {
	const app$1 = new OpenAPIHono();
	registerAutocompleteRoute(app$1);
	registerMarketsRoute(app$1);
	registerStaysSearchRoute(app$1);
	registerStayDetailRoute(app$1);
	return app$1;
}

//#endregion
//#region src/open-api.ts
function generateOpenApiSpec(app$1) {
	return app$1.getOpenAPIDocument({
		openapi: "3.1.0",
		info: {
			title: "Airbnb API Plugin",
			version: "0.1.0",
			description: "RESTful API for fetching Airbnb data including search, autocomplete, and listing details"
		},
		servers: [{
			url: "https://www.airbnb.com",
			description: "Airbnb upstream"
		}]
	});
}

//#endregion
//#region src/index.ts
const app = createApp();
const spec = generateOpenApiSpec(app);
const cli = Cli.create("airbnb", { description: "Fetch Airbnb listings, search, and market data via RESTful API" }).command("api", {
	description: "Call the Airbnb website API",
	fetch: app.fetch,
	openapi: spec
});
var src_default = cli;

//#endregion
export { src_default as default };
//# sourceMappingURL=index.mjs.map