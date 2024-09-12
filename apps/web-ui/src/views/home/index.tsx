import { Flex, Heading, IconButton, Input, useDisclosure } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';

import { ChevronRightIcon } from '../../components/icons';
import { useBreakpointValue } from '../../providers/global/breakpoint-provider';
import DrawerNav from '../../components/layout/mobile/drawer-nav';

export default function HomeView() {
	const mobile = useBreakpointValue({ base: true, md: false });
	const navigate = useNavigate();
	const { register, handleSubmit } = useForm({ defaultValues: { query: '' } });
	const drawer = useDisclosure();

	const submit = handleSubmit((values) => {
		navigate('/search?q=' + values.query);
	});

	const body = (
		<Flex
			overflow="auto"
			h="full"
			w="full"
			alignItems="center"
			justifyContent={{ base: 'flex-start', md: 'center' }}
			gap="2"
			direction="column"
		>
			<Flex as="form" gap="2" w="full" p="4" maxW="xl" onSubmit={submit}>
				<Input
					type="search"
					placeholder="Search your network..."
					p="4"
					{...register('query', { required: true })}
					isRequired
				/>
				<IconButton type="submit" icon={<ChevronRightIcon boxSize={6} />} aria-label="Search" colorScheme="brand" />
			</Flex>
		</Flex>
	);

	if (mobile) {
		return (
			<>
				<Flex alignItems="center" borderBottomWidth={1} gap="4" p="2" mt="var(--safe-top)">
					<IconButton
						icon={<HamburgerIcon boxSize={5} />}
						aria-label="Show Menu"
						variant="ghost"
						onClick={drawer.onOpen}
					/>
					<Heading as="h1" size="md">
						Satellite
					</Heading>
				</Flex>
				{body}
				<DrawerNav isOpen={drawer.isOpen} onClose={drawer.onClose} />
			</>
		);
	}

	return body;
}
