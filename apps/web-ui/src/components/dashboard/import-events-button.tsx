import { NostrEvent } from 'nostr-tools';
import { useRef, useState } from 'react';
import TextButton from './text-button';

export default function ImportEventsButton({
	onLoad,
	onEvent,
}: {
	onLoad?: (events: NostrEvent[]) => Promise<void>;
	onEvent?: (event: NostrEvent) => Promise<any>;
}) {
	const ref = useRef<HTMLInputElement | null>(null);
	const [imported, setImported] = useState(0);

	const importFile = (file: File) => {
		setImported(0);
		const reader = new FileReader();

		reader.readAsText(file, 'utf8');
		reader.onload = async () => {
			if (typeof reader.result !== 'string') return;
			const lines = reader.result.split('\n');
			const events: NostrEvent[] = [];
			for (const line of lines) {
				try {
					const event = JSON.parse(line) as NostrEvent;
					setImported((v) => v + 1);

					if (onLoad) events.push(event);
					if (onEvent) await onEvent(event);
				} catch (e) {}
			}
			if (onLoad) await onLoad(events);
		};
	};

	return (
		<>
			<TextButton onClick={() => ref.current?.click()}>[{imported > 0 ? imported : 'IMPORT'}]</TextButton>
			<input
				hidden
				type="file"
				accept=".jsonl"
				onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
				ref={ref}
			/>
		</>
	);
}
