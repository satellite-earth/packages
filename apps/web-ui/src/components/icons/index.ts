import { IconProps, createIcon } from '@chakra-ui/react';
import CheckVerified01 from './components/check-verified-01';
import AlertOctagon from './components/alert-octagon';
import Zap from './components/zap';
import MessageChatSquare from './components/message-chat-square';
import ChevronDown from './components/chevron-down';
import ChevronUp from './components/chevron-up';
import ChevronLeft from './components/chevron-left';
import ChevronRight from './components/chevron-right';
import QrCode02 from './components/qr-code-02';
import SearchSm from './components/search-sm';
import Settings02 from './components/settings-02';
import SatelliteDish from './components/satellite-dish';

export const VerifiedIcon = CheckVerified01;
export const VerificationFailed = AlertOctagon;

const defaultProps: IconProps = { boxSize: 4 };

export const VerificationMissing = createIcon({
	displayName: 'VerificationFailed',
	d: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm2-1.645A3.502 3.502 0 0 0 12 6.5a3.501 3.501 0 0 0-3.433 2.813l1.962.393A1.5 1.5 0 1 1 12 11.5a1 1 0 0 0-1 1V14h2v-.645z',
	defaultProps,
});

export const ZapIcon = Zap;

export const DirectMessagesIcon = MessageChatSquare;

export const ThreadIcon = MessageChatSquare;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;

export const QrCodeIcon = QrCode02;
export const SearchIcon = SearchSm;
export const SettingsIcon = Settings02;
export const SatelliteDishIcon = SatelliteDish;
