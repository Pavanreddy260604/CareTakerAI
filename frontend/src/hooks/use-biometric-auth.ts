import { useState, useCallback } from 'react';

interface BiometricAuthResult {
    supported: boolean;
    authenticated: boolean;
}

/**
 * Hook for WebAuthn-based biometric authentication
 * Provides FaceID/TouchID/Windows Hello support
 */
export function useBiometricAuth() {
    const [isSupported] = useState(() => {
        return typeof window !== 'undefined' &&
            window.PublicKeyCredential !== undefined &&
            typeof window.PublicKeyCredential === 'function';
    });

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Check if platform authenticator is available (FaceID, TouchID, Windows Hello)
    const checkPlatformAuthenticator = useCallback(async (): Promise<boolean> => {
        if (!isSupported) return false;

        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        } catch (e) {
            console.error('Platform authenticator check failed:', e);
            return false;
        }
    }, [isSupported]);

    // Generate a random challenge
    const generateChallenge = (): Uint8Array => {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return array;
    };

    // Convert ArrayBuffer to base64
    const bufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let str = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            str += String.fromCharCode(bytes[i]);
        }
        return btoa(str);
    };

    // Register a new biometric credential
    const register = useCallback(async (userId: string): Promise<boolean> => {
        if (!isSupported) {
            console.warn('WebAuthn not supported');
            return false;
        }

        setIsAuthenticating(true);

        try {
            const challenge = generateChallenge();

            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge: challenge as unknown as BufferSource,
                rp: {
                    name: 'Caretaker AI',
                    id: window.location.hostname
                },
                user: {
                    id: new TextEncoder().encode(userId) as unknown as BufferSource,
                    name: userId,
                    displayName: 'Caretaker User'
                },
                pubKeyCredParams: [
                    { alg: -7, type: 'public-key' },   // ES256
                    { alg: -257, type: 'public-key' }  // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'preferred'
                },
                timeout: 60000,
                attestation: 'none'
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            }) as PublicKeyCredential;

            if (credential) {
                // Store credential ID in localStorage for verification later
                const credentialId = bufferToBase64(credential.rawId);
                localStorage.setItem('biometric_credential_id', credentialId);
                localStorage.setItem('biometric_enabled', 'true');
                setIsAuthenticated(true);
                return true;
            }

            return false;
        } catch (error: any) {
            console.error('Biometric registration failed:', error);
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    }, [isSupported]);

    // Authenticate using stored biometric credential
    const authenticate = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('WebAuthn not supported');
            return false;
        }

        const storedCredentialId = localStorage.getItem('biometric_credential_id');
        if (!storedCredentialId) {
            console.warn('No biometric credential registered');
            return false;
        }

        setIsAuthenticating(true);

        try {
            const challenge = generateChallenge();

            // Convert stored credential ID back to ArrayBuffer
            const credentialIdBytes = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));

            const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
                challenge: challenge as unknown as BufferSource,
                rpId: window.location.hostname,
                allowCredentials: [{
                    id: credentialIdBytes as unknown as BufferSource,
                    type: 'public-key',
                    transports: ['internal']
                }],
                userVerification: 'required',
                timeout: 60000
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            }) as PublicKeyCredential;

            if (assertion) {
                setIsAuthenticated(true);
                return true;
            }

            return false;
        } catch (error: any) {
            console.error('Biometric authentication failed:', error);
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    }, [isSupported]);

    // Check if biometric is already set up
    const isEnabled = useCallback((): boolean => {
        return localStorage.getItem('biometric_enabled') === 'true' &&
            localStorage.getItem('biometric_credential_id') !== null;
    }, []);

    // Disable biometric auth
    const disable = useCallback((): void => {
        localStorage.removeItem('biometric_enabled');
        localStorage.removeItem('biometric_credential_id');
        setIsAuthenticated(false);
    }, []);

    return {
        isSupported,
        isAuthenticated,
        isAuthenticating,
        checkPlatformAuthenticator,
        register,
        authenticate,
        isEnabled,
        disable
    };
}

export default useBiometricAuth;
