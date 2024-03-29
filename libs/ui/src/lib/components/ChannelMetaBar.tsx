import { HStack, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { useChannelStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import Uptime from './Uptime';

const ChannelMetaBar = observer(() => {
  const store = useChannelStore();

  return (
    <HStack spacing="20px" justify="flex-start">
      <Stat>
        <StatLabel fontSize="xs" color="whiteAlpha.500">
          Uptime
        </StatLabel>
        <Uptime startTime={store.channel?.stream?.startedAt ?? 0} />
      </Stat>

      <Stat>
        <StatLabel fontSize="xs" color="whiteAlpha.500">
          Viewers
        </StatLabel>
        <StatNumber fontSize="s">{store.currentViewerCount}</StatNumber>
      </Stat>
    </HStack>
  );
});

export default ChannelMetaBar;
