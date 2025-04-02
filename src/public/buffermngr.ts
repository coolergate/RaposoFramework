import { t } from "@rbxts/t";

export function BufferReader(bfr: buffer) {
	let nCurrentOffset = 0;

	const stContent = {
		READ_U8() {
			const data = buffer.readu8(bfr, nCurrentOffset);
			nCurrentOffset += 8;
			return data;
		},
		READ_I8() {
			const data = buffer.readi8(bfr, nCurrentOffset);
			nCurrentOffset += 8;
			return data;
		},
		READ_U16() {
			const data = buffer.readu16(bfr, nCurrentOffset);
			nCurrentOffset += 16;
			return data;
		},
		READ_I16() {
			const data = buffer.readi16(bfr, nCurrentOffset);
			nCurrentOffset += 16;
			return data;
		},
		READ_F32() {
			const data = buffer.readf32(bfr, nCurrentOffset);
			nCurrentOffset += 32;
			return data;
		},
		READ_F64() {
			const data = buffer.readf64(bfr, nCurrentOffset);
			nCurrentOffset += 64;
			return data;
		},
		READ_BOOL() {
			const data = buffer.readu8(bfr, nCurrentOffset);
			nCurrentOffset += 8;
			return data === 1;
		},
		READ_STRING() {
			const bytesize = buffer.readu8(bfr, nCurrentOffset);
			nCurrentOffset += 8;

			const data = buffer.readstring(bfr, nCurrentOffset, bytesize);
			nCurrentOffset += bytesize;
			return data;
		},
	};

	return stContent;
}
export function BufferWriter(bfr: buffer, sendFuncion: () => void) {
	let nCurrentOffset = 0;

	const stContent = {
		WRITE_U8(value: number) {
			buffer.writeu8(bfr, nCurrentOffset, value);
			nCurrentOffset += 8;

			return this;
		},
		WRITE_I8(value: number) {
			buffer.writei8(bfr, nCurrentOffset, value);
			nCurrentOffset += 8;

			return this;
		},
		WRITE_U16(value: number) {
			buffer.writeu16(bfr, nCurrentOffset, value);
			nCurrentOffset += 16;

			return this;
		},
		WRITE_I16(value: number) {
			buffer.writei16(bfr, nCurrentOffset, value);
			nCurrentOffset += 16;

			return this;
		},
		WRITE_F32(value: number) {
			buffer.writef32(bfr, nCurrentOffset, value);
			nCurrentOffset += 32;

			return this;
		},
		WRITE_F64(value: number) {
			buffer.writef64(bfr, nCurrentOffset, value);
			nCurrentOffset += 64;

			return this;
		},
		WRITE_BOOL(value: boolean) {
			buffer.writeu8(bfr, nCurrentOffset, value ? 1 : 0);
			nCurrentOffset += 8;

			return this;
		},
		WRITE_STRING(value: string) {
			if (!t.string(value))
				throw `Value must be a string!`;

			buffer.writeu8(bfr, nCurrentOffset, value.size());
			nCurrentOffset += 8;

			buffer.writestring(bfr, nCurrentOffset, value);
			nCurrentOffset += value.size();

			return this;
		},
		MESSAGE_END: sendFuncion,
	};

	return stContent;
}
