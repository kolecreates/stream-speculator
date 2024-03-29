import { Collapse, Container, Heading, Stack } from '@chakra-ui/react';
import { useUserStore } from '@stream-speculator/state';
import { observer } from 'mobx-react-lite';
import FollowedStreams from '../components/FollowedStreams';
import Header from '../components/Header';
import Search from '../components/Search';

const HomepageBlurb = observer(() => {
  const store = useUserStore();
  return (
    <Container maxW="container.md">
      <Collapse in={store.followedStreams.length === 0} animateOpacity>
        <Heading size="2xl" fontWeight="extrabold">
          Automated Twitch Predictions with cross-channel points.
        </Heading>
      </Collapse>
    </Container>
  );
});
const Homepage = () => {
  return (
    <Stack w="100%" h="100%" spacing="40px">
      <Header />
      <Stack
        spacing="40px"
        align="center"
        w="100%"
        justify="center"
        pl="10px"
        pr="10px"
      >
        <HomepageBlurb />
        <Container maxW="container.sm">
          <Search />
        </Container>
      </Stack>
      <FollowedStreams />
    </Stack>
  );
};
export default Homepage;
