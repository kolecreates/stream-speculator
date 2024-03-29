import { Icon, IconProps } from '@chakra-ui/react';
const UserIcon = ({ color, ...rest }: { color?: string } & IconProps) => (
  <Icon viewBox="0 0 100 100" color={color ?? 'white'} {...rest}>
    <g>
      <g>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M50.184,55.674c-13.642,0-24.741-11.099-24.741-24.741S36.541,6.191,50.184,6.191S74.925,17.29,74.925,30.933    S63.826,55.674,50.184,55.674z"
        />
      </g>
      <g>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M92.802,93.809c1.218,0,2.205-0.987,2.205-2.205v-6.359c0-11.213-9.122-20.335-20.335-20.335H25.696    c-11.213,0-20.335,9.122-20.335,20.335v6.359c0,1.218,0.987,2.205,2.205,2.205H92.802z"
        />
      </g>
    </g>
  </Icon>
);

export default UserIcon;
