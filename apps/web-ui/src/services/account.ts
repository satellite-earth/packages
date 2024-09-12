import { Account } from '../classes/accounts/account';
import ExtensionAccount from '../classes/accounts/extension-account';
import NostrConnectAccount from '../classes/accounts/nostr-connect-account';
import NsecAccount from '../classes/accounts/nsec-account';
import PasswordAccount from '../classes/accounts/password-account';
import { PersistentSubject } from '../classes/subject';
import { logger } from '../helpers/debug';
import db from './db';

class AccountService {
	log = logger.extend('AccountService');
	loading = new PersistentSubject(true);
	accounts = new PersistentSubject<Account[]>([]);
	current = new PersistentSubject<Account | null>(null);

	constructor() {
		db.getAll('accounts').then((accountData) => {
			const accounts: Account[] = [];

			for (const data of accountData) {
				try {
					const account = this.createAccountFromDatabaseRecord(data);
					if (account) accounts.push(account);
				} catch (error) {
					this.log(`Failed to read account ${data.pubkey}`, data, error);
				}
			}

			this.accounts.next(accounts);

			const lastAccount = localStorage.getItem('lastAccount');
			if (lastAccount && this.hasAccount(lastAccount)) {
				this.switchAccount(lastAccount);
			} else localStorage.removeItem('lastAccount');

			this.loading.next(false);
		});
	}

	private createAccountFromDatabaseRecord(data: { type: string; pubkey: string }) {
		switch (data.type) {
			case 'local':
				return new PasswordAccount(data.pubkey).fromJSON(data);
			case 'nsec':
				return new NsecAccount(data.pubkey).fromJSON(data);
			case 'extension':
				return new ExtensionAccount(data.pubkey).fromJSON(data);
			case 'nostr-connect':
				return new NostrConnectAccount(data.pubkey).fromJSON(data);
		}
	}

	hasAccount(pubkey: string) {
		return this.accounts.value.some((account) => account.pubkey === pubkey);
	}
	addAccount(account: Account) {
		if (this.hasAccount(account.pubkey)) {
			// replace account
			this.accounts.next(this.accounts.value.map((acc) => (acc.pubkey === account.pubkey ? account : acc)));

			// if this is the current account. update it
			if (this.current.value?.pubkey === account.pubkey) {
				this.current.next(account);
			}
		} else {
			// add account
			this.accounts.next(this.accounts.value.concat(account));
		}

		db.put('accounts', account.toJSON());
	}
	removeAccount(account: Account | string) {
		const pubkey = account instanceof Account ? account.pubkey : account;
		this.accounts.next(this.accounts.value.filter((acc) => acc.pubkey !== pubkey));

		db.delete('accounts', pubkey);
	}

	saveAccount(account: Account) {
		return db.put('accounts', account.toJSON());
	}

	switchAccount(pubkey: string) {
		const account = this.accounts.value.find((acc) => acc.pubkey === pubkey);
		if (account) {
			this.current.next(account);
			localStorage.setItem('lastAccount', pubkey);
		}
	}

	logout(clear = true) {
		if (clear && this.current.value) {
			this.removeAccount(this.current.value.pubkey);
		}

		this.current.next(null);
		localStorage.removeItem('lastAccount');
	}
}

const accountService = new AccountService();

if (import.meta.env.DEV) {
	// @ts-ignore
	window.accountService = accountService;
}

export default accountService;
