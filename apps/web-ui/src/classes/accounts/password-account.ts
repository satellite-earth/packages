import { PasswordSigner } from 'applesauce-signer';
import { Account } from './account';

export default class PasswordAccount extends Account {
	readonly type = 'local';

	protected declare _signer: PasswordSigner;
	public get signer(): PasswordSigner {
		return this._signer;
	}
	public set signer(value: PasswordSigner) {
		this._signer = value;
	}

	constructor(pubkey: string) {
		super(pubkey);
		this.signer = new PasswordSigner();
	}

	static fromNcryptsec(pubkey: string, ncryptsec: string) {
		const account = new PasswordAccount(pubkey);
		return account.fromJSON({ ncryptsec });
	}

	toJSON() {
		if (this.signer.ncryptsec) {
			return { ...super.toJSON(), ncryptsec: this.signer.ncryptsec };
		} else throw Error('Missing ncryptsec');
	}
	fromJSON(data: any): this {
		this.signer = new PasswordSigner();
		if (data.ncryptsec) {
			this.signer.ncryptsec = data.ncryptsec as string;
		} else throw Error('Missing ncryptsec');

		return super.fromJSON(data);
	}
}
