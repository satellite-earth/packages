import { createIcon } from '@chakra-ui/icons';

const CheckHeart = createIcon({
	displayName: 'CheckHeart',
	viewBox: '0 0 24 24',
	path: [
		<path
			d="M9 11L11 13L15.5 8.5M11.9932 5.13581C9.9938 2.7984 6.65975 2.16964 4.15469 4.31001C1.64964 6.45038 1.29697 10.029 3.2642 12.5604C4.75009 14.4724 8.97129 18.311 10.948 20.0749C11.3114 20.3991 11.4931 20.5613 11.7058 20.6251C11.8905 20.6805 12.0958 20.6805 12.2805 20.6251C12.4932 20.5613 12.6749 20.3991 13.0383 20.0749C15.015 18.311 19.2362 14.4724 20.7221 12.5604C22.6893 10.029 22.3797 6.42787 19.8316 4.31001C17.2835 2.19216 13.9925 2.7984 11.9932 5.13581Z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		></path>,
	],
	defaultProps: { boxSize: 4 },
});

export default CheckHeart;
