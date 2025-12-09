/**
 * Builder Configuration Service
 * 
 * Manages Polymarket Builder Program credentials and configuration.
 * Supports both local signing and remote signing modes.
 * 
 * For bethub: Uses Next.js environment variables (NEXT_PUBLIC_ prefix)
 * 
 * @see https://docs.polymarket.com/developers/builders/builder-profile
 * @see https://docs.polymarket.com/developers/builders/order-attribution
 */

import { BuilderConfig, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';

// ============= Types =============

export interface BuilderCredentials {
    apiKey: string;
    secret: string;
    passphrase: string;
}

export interface RemoteSigningConfig {
    url: string;
    token?: string;  // Optional authorization token for signing server
}

export type SigningMode = 'local' | 'remote' | 'none';

export interface BuilderConfigOptions {
    mode: SigningMode;
    localCredentials?: BuilderCredentials;
    remoteConfig?: RemoteSigningConfig;
}

// ============= Environment Variable Keys =============

const ENV_KEYS = {
    // Server-side only (no NEXT_PUBLIC_)
    API_KEY: 'POLY_BUILDER_API_KEY',
    SECRET: 'POLY_BUILDER_SECRET',
    PASSPHRASE: 'POLY_BUILDER_PASSPHRASE',
    
    // Can be public (signing server URL)
    SIGNING_SERVER_URL: 'NEXT_PUBLIC_POLY_SIGNING_SERVER_URL',
    SIGNING_SERVER_TOKEN: 'POLY_SIGNING_SERVER_TOKEN',
} as const;

// ============= Helper Functions =============

/**
 * Get environment variable (Next.js compatible)
 */
function getEnvVar(key: string, defaultValue?: string): string | undefined {
    // Client-side: Only NEXT_PUBLIC_ variables available
    if (typeof window !== 'undefined') {
        if (key.startsWith('NEXT_PUBLIC_')) {
            return process.env[key] || defaultValue;
        }
        return defaultValue;
    }
    
    // Server-side: All variables available
    return process.env[key] || defaultValue;
}

/**
 * Check if all required local credentials are available (server-side only)
 */
function hasLocalCredentials(): boolean {
    // Can only check on server-side
    if (typeof window !== 'undefined') {
        return false;
    }
    
    const apiKey = getEnvVar(ENV_KEYS.API_KEY);
    const secret = getEnvVar(ENV_KEYS.SECRET);
    const passphrase = getEnvVar(ENV_KEYS.PASSPHRASE);
    
    return !!(apiKey && secret && passphrase);
}

/**
 * Check if remote signing is configured
 */
function hasRemoteSigningConfig(): boolean {
    const serverUrl = getEnvVar(ENV_KEYS.SIGNING_SERVER_URL);
    return !!serverUrl;
}

/**
 * Get local credentials from environment (server-side only)
 */
function getLocalCredentials(): BuilderCredentials | null {
    // Can only get on server-side
    if (typeof window !== 'undefined') {
        return null;
    }
    
    const apiKey = getEnvVar(ENV_KEYS.API_KEY);
    const secret = getEnvVar(ENV_KEYS.SECRET);
    const passphrase = getEnvVar(ENV_KEYS.PASSPHRASE);
    
    if (!apiKey || !secret || !passphrase) {
        return null;
    }
    
    return { apiKey, secret, passphrase };
}

/**
 * Get remote signing configuration from environment
 */
function getRemoteSigningConfig(): RemoteSigningConfig | null {
    // Try explicit env var first
    let url = getEnvVar(ENV_KEYS.SIGNING_SERVER_URL);
    
    // Fall back to current origin + /api/builder/sign (bethub pattern)
    if (!url && typeof window !== 'undefined') {
        url = `${window.location.origin}/api/builder/sign`;
    } else if (!url) {
        // Server-side fallback
        url = 'http://localhost:3000/api/builder/sign';
    }
    
    const token = getEnvVar(ENV_KEYS.SIGNING_SERVER_TOKEN);
    
    return { url, token };
}

// ============= Main Class =============

/**
 * BuilderConfigManager - Manages Polymarket Builder credentials and configuration
 * 
 * Usage:
 * ```typescript
 * const manager = BuilderConfigManager.getInstance();
 * const config = manager.getConfig();
 * 
 * // Use with CLOB client
 * const clobClient = new ClobClient(host, chainId, wallet, creds, signatureType, funder, undefined, false, config);
 * ```
 */
export class BuilderConfigManager {
    private static instance: BuilderConfigManager | null = null;
    
    private signingMode: SigningMode;
    private builderConfig: BuilderConfig | null = null;
    private localCreds: BuilderCredentials | null = null;
    private remoteConfig: RemoteSigningConfig | null = null;
    
    private constructor() {
        this.signingMode = this.detectSigningMode();
        this.initialize();
    }
    
    /**
     * Get singleton instance
     */
    static getInstance(): BuilderConfigManager {
        if (!BuilderConfigManager.instance) {
            BuilderConfigManager.instance = new BuilderConfigManager();
        }
        return BuilderConfigManager.instance;
    }
    
    /**
     * Reset instance (for testing)
     */
    static resetInstance(): void {
        BuilderConfigManager.instance = null;
    }
    
    /**
     * Detect which signing mode to use based on available configuration
     */
    private detectSigningMode(): SigningMode {
        // For bethub: Always use remote signing (via /api/builder/sign)
        // Builder credentials are kept server-side for security
        if (hasRemoteSigningConfig()) {
            console.log('[BuilderConfig] Remote signing server detected');
            return 'remote';
        }
        
        // Fall back to local signing if credentials available (server-side only)
        if (hasLocalCredentials()) {
            console.log('[BuilderConfig] Local credentials detected');
            return 'local';
        }
        
        console.log('[BuilderConfig] No builder credentials configured');
        return 'none';
    }
    
    /**
     * Initialize the builder configuration
     */
    private initialize(): void {
        if (this.signingMode === 'remote') {
            this.remoteConfig = getRemoteSigningConfig();
            if (this.remoteConfig) {
                this.builderConfig = new BuilderConfig({
                    remoteBuilderConfig: {
                        url: this.remoteConfig.url,
                        token: this.remoteConfig.token
                    }
                });
                console.log('[BuilderConfig] Initialized with remote signing:', this.remoteConfig.url);
            }
        } else if (this.signingMode === 'local') {
            this.localCreds = getLocalCredentials();
            if (this.localCreds) {
                const builderCreds: BuilderApiKeyCreds = {
                    key: this.localCreds.apiKey,
                    secret: this.localCreds.secret,
                    passphrase: this.localCreds.passphrase
                };
                this.builderConfig = new BuilderConfig({
                    localBuilderCreds: builderCreds
                });
                console.log('[BuilderConfig] Initialized with local credentials');
            }
        }
    }
    
    /**
     * Get the current signing mode
     */
    getSigningMode(): SigningMode {
        return this.signingMode;
    }
    
    /**
     * Check if builder is configured and ready
     */
    isReady(): boolean {
        return this.signingMode !== 'none' && this.builderConfig !== null;
    }
    
    /**
     * Check if using local signing
     */
    isLocalSigning(): boolean {
        return this.signingMode === 'local';
    }
    
    /**
     * Check if using remote signing
     */
    isRemoteSigning(): boolean {
        return this.signingMode === 'remote';
    }
    
    /**
     * Get the BuilderConfig instance for use with SDK clients
     */
    getConfig(): BuilderConfig | undefined {
        return this.builderConfig || undefined;
    }
    
    /**
     * Get local credentials (only if using local signing)
     */
    getLocalCredentials(): BuilderCredentials | null {
        return this.localCreds;
    }
    
    /**
     * Get remote signing URL (only if using remote signing)
     */
    getRemoteSigningUrl(): string | null {
        return this.remoteConfig?.url || null;
    }
    
    /**
     * Get builder status information
     */
    getStatus(): {
        isReady: boolean;
        mode: SigningMode;
        remoteUrl?: string;
        hasCredentials: boolean;
    } {
        return {
            isReady: this.isReady(),
            mode: this.signingMode,
            remoteUrl: this.remoteConfig?.url,
            hasCredentials: this.localCreds !== null || this.remoteConfig !== null
        };
    }
    
    /**
     * Manually configure with custom options (overrides environment detection)
     */
    configure(options: BuilderConfigOptions): void {
        this.signingMode = options.mode;
        this.localCreds = options.localCredentials || null;
        this.remoteConfig = options.remoteConfig || null;
        this.builderConfig = null;
        
        this.initialize();
    }
}

// ============= Exports =============

/**
 * Get the singleton BuilderConfigManager instance
 */
export function getBuilderConfigManager(): BuilderConfigManager {
    return BuilderConfigManager.getInstance();
}

/**
 * Quick check if builder is configured
 */
export function isBuilderConfigured(): boolean {
    return getBuilderConfigManager().isReady();
}

/**
 * Get BuilderConfig for SDK clients
 */
export function getBuilderConfig(): BuilderConfig | undefined {
    return getBuilderConfigManager().getConfig();
}

// Default export
export default BuilderConfigManager;
