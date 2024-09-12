import { PropsWithChildren } from 'react';
import { Navigate, To, useLocation } from 'react-router-dom';

import useCurrentAccount from '../../hooks/use-current-account';

export default function RequireCurrentAccount({ children }: PropsWithChildren) {
	const account = useCurrentAccount();
	const location = useLocation();

	if (!account)
		return <Navigate to="/login" replace state={{ back: (location.state?.back ?? location) satisfies To }} />;

	return <>{children}</>;
}
