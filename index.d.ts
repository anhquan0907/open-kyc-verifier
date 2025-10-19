declare global {
    namespace JSX {
        interface IntrinsicElements {
            'kyc-verifier': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                'api-key'?: string;
            };
        }
    }
}

export interface KycVerificationEventDetail {
    verified: boolean;
    success: boolean;
}

export declare class KycVerifier extends HTMLElement {
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
}

declare global {
    interface HTMLElementEventMap {
        'kyc-verification-complete': CustomEvent<KycVerificationEventDetail>;
    }
}

export default KycVerifier;