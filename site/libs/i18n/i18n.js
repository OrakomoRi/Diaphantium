/**
 * I18n - Internationalization library with zero dependencies
 * Provides translation, pluralization, interpolation, and formatting capabilities
 */
class I18n {
	/**
	 * Initialize I18n instance
	 * @param {Object} options - Configuration options
	 * @param {string} [options.locale='en'] - Active locale code (e.g., 'en', 'ru-RU')
	 * @param {string[]} [options.fallbacks=[]] - Fallback locale chain
	 * @param {Function} [options.missingHandler] - Handler for missing translation keys
	 * @param {Function} [options.loader] - Async loader function returning translations
	 * @param {boolean} [options.emptyIsMissing=false] - Treat empty strings as missing
	 * @param {boolean} [options.strict=false] - Strict mode: throw errors on missing keys
	 * @param {Object} [options.interpolation] - Interpolation configuration
	 */
	constructor({
		locale = 'en',
		fallbacks = [],
		missingHandler = (key) => `[missing: ${key}]`,
		loader = null,
		emptyIsMissing = false,
		strict = false,
		interpolation = {}
	} = {}) {
		// Core locale settings
		this._locale = this._normalizeLocale(locale);
		this._fallbacks = fallbacks.map(l => this._normalizeLocale(l));

		// Translation storage: Map<locale, flatTranslationsObject>
		this._dict = new Map();

		// Configuration
		this._missingHandler = missingHandler;
		this._loader = loader;
		this._emptyIsMissing = emptyIsMissing;
		this._strict = strict;

		// Performance optimizations
		this._plurals = new Map(); // Cache for Intl.PluralRules instances
		this._loadingPromises = new Map(); // Prevent duplicate async loads

		// Interpolation settings
		this._interpolationOptions = {
			prefix: '{',           // Start delimiter for variables
			suffix: '}',           // End delimiter for variables
			escapeValue: true,     // HTML escape interpolated values
			formatSeparator: ',',  // Separator for type and format options
			...interpolation
		};

		// LRU cache for translated strings
		this._cache = new Map();
		this._cacheSize = 0;
		this._maxCacheSize = 1000;
	}

	// Public getters
	get locale() { return this._locale; }
	get fallbacks() { return [...this._fallbacks]; }

	/**
	 * Normalize locale code to consistent format with fallback support
	 * Converts locale codes to lowercase with underscores: 'en-US' -> 'en_us', 'RU-ru' -> 'ru_ru'
	 * Returns fallback value for invalid inputs (null, undefined, non-string, empty string)
	 * @param {string} locale - Raw locale string to normalize
	 * @param {string} [fallback='en'] - Fallback locale to use for invalid inputs
	 * @returns {string} - Normalized locale in format 'xx_yy' or fallback value
	 * @private
	 */
	_normalizeLocale(locale, fallback = 'en') {
		if (!locale || typeof locale !== 'string') return fallback;
		return locale.toLowerCase().replace('-', '_');
	}

	/**
	 * Add translations to dictionary with validation
	 * @param {string} locale - Target locale
	 * @param {Object} messages - Nested or flat translation object
	 * @param {Object} [options] - Additional options
	 * @param {string|null} [options.namespace=null] - Optional namespace prefix
	 * @param {boolean} [options.override=true] - Whether to override existing keys
	 * @returns {I18n} - Chainable instance
	 */
	add(locale, messages, { namespace = null, override = true } = {}) {
		if (!locale || !messages) {
			throw new Error('Locale and messages are required');
		}

		locale = this._normalizeLocale(locale);
		const flat = this._flatten(messages, namespace);

		// Validate translation keys for common issues
		for (const key of Object.keys(flat)) {
			if (!this._isValidKey(key)) {
				console.warn(`Invalid i18n key: "${key}"`);
			}
		}

		const current = this._dict.get(locale) || {};
		// Merge strategy: override=true means new translations take precedence
		this._dict.set(locale, override ? { ...current, ...flat } : { ...flat, ...current });

		// Clear cache when dictionary changes
		this._clearCache();
		return this;
	}

	/**
	 * Load translations asynchronously with deduplication
	 * Prevents multiple simultaneous loads of the same locale
	 * @param {string} [locale=this._locale] - Locale to load
	 * @returns {Promise<Object>} - Promise resolving to loaded translation data
	 */
	async load(locale = this._locale) {
		if (!this._loader) throw new Error('No loader provided');

		locale = this._normalizeLocale(locale);

		// Prevent multiple simultaneous loads of the same locale
		if (this._loadingPromises.has(locale)) {
			return this._loadingPromises.get(locale);
		}

		const promise = this._loader(locale)
			.then(data => {
				if (!data || typeof data !== 'object') {
					throw new Error(`Invalid translation data for locale: ${locale}`);
				}
				this.add(locale, data);
				return data;
			})
			.finally(() => {
				// Clean up loading promise once completed
				this._loadingPromises.delete(locale);
			});

		this._loadingPromises.set(locale, promise);
		return promise;
	}

	/**
	 * Switch active locale with optional preloading
	 * @param {string} locale - New active locale
	 * @param {Object} [options] - Loading options
	 * @param {boolean} [options.preload=true] - Whether to preload the locale
	 * @param {boolean} [options.loadFallbacks=false] - Whether to preload fallback locales
	 * @returns {Promise<I18n>} - Promise resolving to this instance
	 */
	async setLocale(locale, { preload = true, loadFallbacks = false } = {}) {
		const oldLocale = this._locale;
		this._locale = this._normalizeLocale(locale);

		// Preload translations if requested and loader is available
		if (preload && this._loader) {
			const toLoad = [this._locale];
			if (loadFallbacks) toLoad.push(...this._fallbacks);

			// Load missing locales in parallel, catch failures gracefully
			const promises = toLoad
				.filter(l => !this._dict.has(l))
				.map(l => this.load(l).catch(err => console.warn(`Failed to load ${l}:`, err)));

			await Promise.allSettled(promises);
		}

		// Clear cache if locale actually changed
		if (oldLocale !== this._locale) {
			this._clearCache();
		}
		return this;
	}

	/**
	 * Main translation method with caching and fallback logic
	 * @param {string} key - Translation key (supports dot notation)
	 * @param {Object} [params={}] - Interpolation parameters and count for plurals
	 * @param {Object} [opts={}] - Translation options
	 * @param {string} [opts.locale] - Override locale for this translation
	 * @param {string[]} [opts.fallbacks] - Override fallback chain
	 * @param {boolean} [opts.returnKeyOnMissing=true] - Return key if translation missing
	 * @returns {string} - Translated and interpolated string
	 */
	t(key, params = {}, opts = {}) {
		// Input validation
		if (!key || typeof key !== 'string') {
			return this._strict ? this._throwMissingKey(key) : this._missingHandler(key);
		}

		const locale = this._normalizeLocale(opts.locale, this._locale);
		const fallbacks = opts.fallbacks || this._fallbacks;
		const returnKeyOnMissing = opts.returnKeyOnMissing ?? true;

		// Check cache first for performance
		const cacheKey = `${locale}:${key}:${JSON.stringify(params)}`;
		if (this._cache.has(cacheKey)) {
			return this._cache.get(cacheKey);
		}

		// Build locale chain for fallback resolution
		const chain = [locale, ...fallbacks];
		const count = this._extractCount(params);

		let result;
		// Try each locale in the chain until we find a translation
		for (const loc of chain) {
			const msg = this._pick(loc, key, count);
			if (msg !== undefined && (!this._emptyIsMissing || msg !== '')) {
				result = this._interpolate(String(msg), params, loc);
				break;
			}
		}

		// Handle missing translations
		if (result === undefined) {
			if (this._strict) {
				this._throwMissingKey(key);
			}
			result = returnKeyOnMissing ? this._missingHandler(key) : '';
		}

		// Cache the result for future lookups
		this._cacheResult(cacheKey, result);
		return result;
	}

	/**
	 * Translate multiple keys at once
	 * @param {string[]} keys - Array of translation keys
	 * @param {Object} [params={}] - Shared interpolation parameters
	 * @param {Object} [opts={}] - Shared translation options
	 * @returns {Object} - Object mapping keys to translated values
	 */
	tMultiple(keys, params = {}, opts = {}) {
		if (!Array.isArray(keys)) return {};

		return keys.reduce((acc, key) => {
			acc[key] = this.t(key, params, opts);
			return acc;
		}, {});
	}

	/**
	 * Check if a translation key exists
	 * @param {string} key - Translation key to check
	 * @param {Object} [options] - Check options
	 * @param {string} [options.locale=this._locale] - Locale to check in
	 * @param {boolean} [options.checkFallbacks=false] - Also check fallback locales
	 * @returns {boolean} - True if key exists
	 */
	exists(key, { locale = this._locale, checkFallbacks = false } = {}) {
		locale = this._normalizeLocale(locale);

		if (this._hasKey(locale, key)) return true;

		if (checkFallbacks) {
			return this._fallbacks.some(fb => this._hasKey(fb, key));
		}

		return false;
	}

	/**
	 * Get all translation keys for a locale
	 * @param {string} [locale=this._locale] - Target locale
	 * @param {Object} [options] - Retrieval options
	 * @param {boolean} [options.includeNamespaces=false] - Include namespaced keys
	 * @returns {string[]} - Array of available keys
	 */
	getKeys(locale = this._locale, { includeNamespaces = false } = {}) {
		locale = this._normalizeLocale(locale);
		const dict = this._dict.get(locale) || {};
		const keys = Object.keys(dict);

		if (!includeNamespaces) {
			return keys.filter(key => !key.includes('.'));
		}

		return keys;
	}

	/**
	 * Format numbers using Intl.NumberFormat with error handling
	 * @param {number} value - Number to format
	 * @param {Object} [options] - Formatting options
	 * @param {string} [options.locale=this._locale] - Locale for formatting
	 * @returns {string} - Formatted number string
	 */
	formatNumber(value, { locale = this._locale, ...options } = {}) {
		try {
			return new Intl.NumberFormat(this._normalizeLocale(locale), options).format(value);
		} catch (err) {
			console.warn('Number formatting failed:', err);
			return String(value);
		}
	}

	/**
	 * Format dates using Intl.DateTimeFormat with error handling
	 * @param {Date|string|number} value - Date to format
	 * @param {Object} [options] - Formatting options
	 * @param {string} [options.locale=this._locale] - Locale for formatting
	 * @returns {string} - Formatted date string
	 */
	formatDate(value, { locale = this._locale, ...options } = {}) {
		try {
			const date = value instanceof Date ? value : new Date(value);
			if (isNaN(date.getTime())) throw new Error('Invalid date');

			return new Intl.DateTimeFormat(this._normalizeLocale(locale), options).format(date);
		} catch (err) {
			console.warn('Date formatting failed:', err);
			return String(value);
		}
	}

	/**
	 * Format relative time (e.g., "2 days ago", "in 3 hours")
	 * @param {number} value - Numeric value (positive for future, negative for past)
	 * @param {string} unit - Time unit ('second', 'minute', 'hour', 'day', etc.)
	 * @param {Object} [options] - Formatting options
	 * @param {string} [options.locale=this._locale] - Locale for formatting
	 * @returns {string} - Formatted relative time string
	 */
	formatRelativeTime(value, unit, { locale = this._locale, ...options } = {}) {
		try {
			return new Intl.RelativeTimeFormat(this._normalizeLocale(locale), options)
				.format(value, unit);
		} catch (err) {
			console.warn('Relative time formatting failed:', err);
			return `${value} ${unit}`;
		}
	}

	/**
	 * Get statistics about the i18n instance
	 * @returns {Object} - Statistics object containing locale info and cache stats
	 */
	getStats() {
		return {
			locales: Array.from(this._dict.keys()),
			totalKeys: Array.from(this._dict.values())
				.reduce((sum, dict) => sum + Object.keys(dict).length, 0),
			cacheSize: this._cacheSize,
			currentLocale: this._locale,
			fallbacks: this._fallbacks
		};
	}

	/**
	 * Clean up resources and clear caches
	 * Call this when disposing of the i18n instance
	 */
	dispose() {
		this._dict.clear();
		this._plurals.clear();
		this._cache.clear();
		this._loadingPromises.clear();
	}

	// ===== PRIVATE METHODS =====

	/**
	 * Extract count parameter for pluralization
	 * @param {Object} params - Parameter object
	 * @returns {number|null} - Count value or null if not found/invalid
	 * @private
	 */

	_extractCount(params) {
		const count = params.count;
		return typeof count === 'number' ? count : null;
	}

	/**
	 * Pick the best translation from a locale's dictionary
	 * Handles pluralization by trying different key variations
	 * @param {string} locale - Locale to search in
	 * @param {string} key - Base translation key
	 * @param {number|null} count - Count for pluralization (null if not applicable)
	 * @returns {string|undefined} - Found translation or undefined
	 * @private
	 */
	_pick(locale, key, count) {
		const dict = this._dict.get(locale);
		if (!dict) return undefined;

		// Handle pluralization if count is provided
		if (count !== null) {
			const pr = this._getPluralRules(locale);
			const category = pr.select(Math.abs(count)); // 'one', 'few', 'many', 'other', etc.

			// Priority order: exact number -> plural category -> base key
			const candidates = [
				`${key}.${count}`,      // e.g., "item.0", "item.1"
				`${key}.${category}`,   // e.g., "item.one", "item.many"
				key                     // e.g., "item"
			];

			for (const candidate of candidates) {
				if (dict.hasOwnProperty(candidate)) return dict[candidate];
			}
		}

		// Simple key lookup for non-plural cases
		return dict.hasOwnProperty(key) ? dict[key] : undefined;
	}

	/**
	 * Get or create Intl.PluralRules instance with caching
	 * @param {string} locale - Locale for plural rules
	 * @returns {Intl.PluralRules} - Plural rules instance
	 * @private
	 */

	_getPluralRules(locale) {
		if (!this._plurals.has(locale)) {
			try {
				this._plurals.set(locale, new Intl.PluralRules(locale));
			} catch (err) {
				console.warn(`Invalid locale for plural rules: ${locale}, using 'en'`);
				this._plurals.set(locale, new Intl.PluralRules('en'));
			}
		}
		return this._plurals.get(locale);
	}

	/**
	 * Interpolate variables in translation template
	 * Supports basic {variable} replacement and typed formatting
	 * @param {string} template - Translation template with placeholders
	 * @param {Object} params - Parameters for interpolation
	 * @param {string} locale - Locale for formatting operations
	 * @returns {string} - Interpolated string
	 * @private
	 */

	_interpolate(template, params, locale) {
		const { prefix, suffix, escapeValue, formatSeparator } = this._interpolationOptions;

		// Enhanced regex for interpolation: {variable,type,format}
		const regex = new RegExp(
			`\\${prefix}([\\w\\.]+)(?:\\${formatSeparator}([\\w]+)(?:\\${formatSeparator}([^\\${suffix}]+))?)?\\${suffix}`,
			'g'
		);

		return template.replace(regex, (match, name, type, format) => {
			const value = this._getNestedProperty(params, name);
			if (value === undefined || value === null) return match;

			let result = this._formatValue(value, type, format, locale);

			// XSS protection: escape HTML in interpolated values
			if (escapeValue && typeof result === 'string') {
				result = this._escapeHtml(result);
			}

			return result;
		});
	}

	/**
	 * Format a value based on type and format specification
	 * @param {*} value - Value to format
	 * @param {string} type - Format type ('number', 'date', 'relative')
	 * @param {string} format - Format specification string
	 * @param {string} locale - Locale for formatting
	 * @returns {string} - Formatted value
	 * @private
	 */

	_formatValue(value, type, format, locale) {
		try {
			switch (type) {
				case 'number':
					const numOptions = this._parseFormatOptions(format);
					return this.formatNumber(value, { locale, ...numOptions });
				case 'date':
					const dateOptions = this._parseFormatOptions(format);
					return this.formatDate(value, { locale, ...dateOptions });
				case 'relative':
					// Format: "day" or "day:numeric" 
					const [unit, ...relOptions] = (format || '').split(':');
					return this.formatRelativeTime(value, unit, { locale });
				default:
					return String(value);
			}
		} catch (err) {
			console.warn('Value formatting failed:', err);
			return String(value);
		}
	}

	/**
	 * Parse format options from string specification
	 * Converts "key1=val1:key2=val2" to {key1: 'val1', key2: 'val2'}
	 * @param {string} format - Format specification string
	 * @returns {Object} - Parsed options object
	 * @private
	 */

	_parseFormatOptions(format) {
		if (!format) return {};

		return format.split(':').reduce((opts, pair) => {
			const [key, val] = pair.split('=');
			if (key && val) opts[key.trim()] = val.trim();
			return opts;
		}, {});
	}

	/**
	 * Get nested property from object using dot notation
	 * Supports paths like "user.profile.name"
	 * @param {Object} obj - Source object
	 * @param {string} path - Dot-separated property path
	 * @returns {*} - Property value or undefined if not found
	 * @private
	 */
	_getNestedProperty(obj, path) {
		return path.split('.').reduce((current, key) =>
			current && current[key] !== undefined ? current[key] : undefined, obj
		);
	}

	/**
	 * Escape HTML characters in string for XSS protection
	 * @param {string} text - Text to escape
	 * @returns {string} - HTML-escaped text
	 * @private
	 */
	_escapeHtml(text) {
		const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
		return text.replace(/[&<>"']/g, m => map[m]);
	}

	/**
	 * Check if a key exists in a specific locale dictionary
	 * @param {string} locale - Locale to check
	 * @param {string} key - Key to look for
	 * @returns {boolean} - True if key exists
	 * @private
	 */

	_hasKey(locale, key) {
		const dict = this._dict.get(locale);
		return dict && dict.hasOwnProperty(key);
	}

	/**
	 * Validate translation key format
	 * @param {string} key - Key to validate
	 * @returns {boolean} - True if key is valid
	 * @private
	 */
	_isValidKey(key) {
		return typeof key === 'string' &&
			key.length > 0
	}

	/**
	 * Add result to LRU cache with size management
	 * @param {string} key - Cache key
	 * @param {string} result - Result to cache
	 * @private
	 */
	_cacheResult(key, result) {
		// Simple LRU: remove oldest entry when cache is full
		if (this._cacheSize >= this._maxCacheSize) {
			const firstKey = this._cache.keys().next().value;
			this._cache.delete(firstKey);
			this._cacheSize--;
		}
		this._cache.set(key, result);
		this._cacheSize++;
	}

	/**
	 * Clear the translation cache
	 * @private
	 */
	_clearCache() {
		this._cache.clear();
		this._cacheSize = 0;
	}

	/**
	 * Throw error for missing translation key (strict mode)
	 * @param {string} key - Missing key
	 * @throws {Error} - Translation key not found error
	 * @private
	 */

	_throwMissingKey(key) {
		throw new Error(`Translation key not found: ${key}`);
	}

	/**
	 * Flatten nested translation object into dot-notation keys
	 * Converts {user: {name: 'Name'}} to {'user.name': 'Name'}
	 * @param {Object} obj - Nested translation object
	 * @param {string|null} namespace - Optional namespace prefix
	 * @param {string} prefix - Current key prefix for recursion
	 * @param {Object} out - Output object for accumulating results
	 * @returns {Object} - Flattened object with dot-notation keys
	 * @private
	 */
	_flatten(obj, namespace = null, prefix = '', out = {}) {
		for (const [key, value] of Object.entries(obj || {})) {
			// Build the full key path
			const fullKey = namespace ? `${namespace}.${prefix}${key}` :
				prefix ? `${prefix}.${key}` : key;

			// Recursively flatten nested objects, but not arrays
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				this._flatten(value, null, fullKey, out);
			} else {
				out[fullKey] = value;
			}
		}
		return out;
	}
}

export default I18n;