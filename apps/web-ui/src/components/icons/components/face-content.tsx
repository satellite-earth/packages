import { createIcon } from '@chakra-ui/icons';

const FaceContent = createIcon({
	displayName: 'FaceContent',
	viewBox: '0 0 24 24',
	path: [
		<path
			d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14M17 9.24C16.605 9.725 16.065 10 15.5 10C14.935 10 14.41 9.725 14 9.24M10 9.24C9.605 9.725 9.065 10 8.5 10C7.935 10 7.41 9.725 7 9.24M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		></path>,
	],
	defaultProps: { boxSize: 4 },
});

export default FaceContent;
