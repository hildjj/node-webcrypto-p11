import {Module, Mechanism, Session, Slot, SessionFlag} from "graphene-pk11";
import {SubtleCrypto} from "./subtlecrypto";
import {KeyStorage} from "./key_storage";
import * as utils from "./utils";

/**
 * PKCS11 with WebCrypto Interface
 */
class WebCrypto implements NodeCrypto {

    private module: Module;
    private session: Session;
    private slot: Slot;
    private initialized: boolean;

    public subtle: SubtleCrypto = null;

    keyStorage: KeyStorage;

    /**
     * Generates cryptographically random values
     * @param  {ArrayBufferView} array
     * @returns ArrayBufferView
     */
    getRandomValues(array: ArrayBufferView): ArrayBufferView {
        return new Uint8Array(this.session.generateRandom(array.byteLength));
    }

    getGUID() {
        return utils.GUID(this.session);
    }

    /**
     * @param  {P11WebCryptoParams} props PKCS11 module init parameters
     */
    constructor(props: P11WebCryptoParams) {
        let mod = this.module = Module.load(props.library, props.name);
        mod.initialize();
        this.initialized = true;
        let slot = mod.getSlots(props.slot);
        if (!slot)
            throw new Error(`Slot by index ${props.slot} is not found`);
        this.session = slot.open(props.sessionFlags);
        this.session.login(props.pin);
        for (let i in props.vendors) {
            Mechanism.vendor(props.vendors[i]);
        }
        this.subtle = new SubtleCrypto(this.session);
        this.keyStorage = new KeyStorage(this.session);
    }

    /**
     * Close PKCS11 module
     */
    close() {
        if (this.initialized) {
            this.session.logout();
            this.session.close();
            this.module.finalize();
        }
    }
}

interface P11WebCryptoParams extends Object {
    /**
     * Path to labrary
     */
    library: string;
    /**
     * Name of PKCS11 module
     */
    name: string;
    /**
     * Index of slot
     */
    slot: number;
    sessionFlags?: number;
    /**
     * PIN of slot
     */
    pin?: string;
    /**
     * list of vendor json files
     */
    vendors?: string[];
}
module.exports = WebCrypto;