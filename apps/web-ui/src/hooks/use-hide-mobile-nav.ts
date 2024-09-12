import { useMount, useUnmount } from 'react-use';
import { showMobileNav } from '../components/layout/mobile';

/** a little hacky way to hide the mobile nav on certain views */
export default function useHideMobileNav() {
	useMount(() => showMobileNav.next(false));
	useUnmount(() => showMobileNav.next(true));
}
