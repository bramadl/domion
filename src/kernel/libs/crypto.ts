import * as crypto from "node:crypto";

const customCrypto = {
	randomUUID: (): string => {
		const hexChars = "0123456789abcdef";
		let uuid = "";
		for (let i = 0; i < 36; i++) {
			if (i === 8 || i === 13 || i === 18 || i === 23) {
				uuid += "-";
			} else if (i === 14) {
				uuid += "4";
			} else if (i === 19) {
				uuid += hexChars.charAt(Math.floor(Math.random() * 4) + 8);
			} else {
				uuid += hexChars.charAt(Math.floor(Math.random() * 16));
			}
		}
		return uuid;
	},
};

// Node.js
if (typeof process !== "undefined" && crypto?.randomUUID) {
	customCrypto.randomUUID = crypto.randomUUID;
}
// Browser
else if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
	customCrypto.randomUUID = globalThis.crypto.randomUUID.bind(
		globalThis.crypto,
	);
}

export const UUID = customCrypto.randomUUID;
