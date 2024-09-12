import chroma from 'chroma-js';
import { DeepPartial, Theme, extendTheme, createMultiStyleConfigHelpers } from '@chakra-ui/react';
import { drawerAnatomy } from '@chakra-ui/anatomy';

import { pallet } from './helpers';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(drawerAnatomy.keys);
const drawerBase = definePartsStyle({
	dialog: {
		paddingTop: 'var(--safe-top)',
		paddingBottom: 'var(--safe-top)',
	},
	closeButton: {
		top: 'calc(var(--chakra-space-2) + var(--safe-top))',
		right: 'calc(var(--chakra-space-3) + var(--safe-right))',
	},
});
const drawerTheme = defineMultiStyleConfig({ baseStyle: drawerBase });

export const theme = extendTheme({
	config: {
		initialColorMode: 'system',
		useSystemColorMode: true,
	},
	colors: {
		gray: pallet(chroma.scale(['#eeeeee', '#0e0e0e']).colors(10)),
		brand: pallet(chroma.scale(['#dbaa31', '#dbaa31']).colors(10)),
	},
	semanticTokens: {
		colors: {
			'card-hover-overlay': {
				_light: 'blackAlpha.50',
				_dark: 'whiteAlpha.50',
			},
			'chakra-body-text': { _light: 'gray.800', _dark: 'white' },
			'chakra-body-bg': { _light: 'white', _dark: 'gray.900' },
			'chakra-subtle-bg': { _light: 'gray.100', _dark: 'gray.800' },
			'chakra-subtle-text': { _light: 'gray.600', _dark: 'gray.400' },
		},
	},
	components: {
		Drawer: drawerTheme,
	},
} as DeepPartial<Theme>);
