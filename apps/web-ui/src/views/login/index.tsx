import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useSubject from '../../hooks/use-subject';
import accountService from '../../services/account';
import { Flex, Heading } from '@chakra-ui/react';

export default function LoginView() {
	const current = useSubject(accountService.current);
	const location = useLocation();

	if (current) return <Navigate to={location.state?.back ?? '/'} replace />;

	return (
		<Flex justifyContent="center" w="full">
			<Flex direction="column" alignItems="center" gap="2" maxW="md" w="full" px="4" py="10">
				<Heading size="lg" mb="2">
					Satellite Node
				</Heading>
				<Outlet />
			</Flex>
		</Flex>
	);
}
