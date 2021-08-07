import { Flex } from '@chakra-ui/react';
import CoinBalance from './CoinBalance';
import LoginButton from './LoginButton';

const Header = () => {
  return (
    <Flex bg="gray.700" direction="row" w="100%" p="8px">
      <CoinBalance />
      <LoginButton />
    </Flex>
  );
};
export default Header;