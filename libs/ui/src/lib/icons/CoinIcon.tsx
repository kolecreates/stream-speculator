import { Icon, IconProps } from '@chakra-ui/react';
const CoinIcon = ({ color, ...rest }: { color?: string } & IconProps) => (
  <Icon viewBox="0 0 100 100" color={color ?? 'white'} {...rest}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M66.289,10.229C61.254,8.209,55.758,7.093,50,7.093c-22.27,0-40.646,16.678-43.314,38.226   c-0.223,1.779-0.338,3.589-0.338,5.424C6.348,74.853,25.896,94.39,50,94.39c24.113,0,43.652-19.537,43.652-43.646   C93.652,32.393,82.332,16.683,66.289,10.229z M53.854,70.952h-1.422v5.012c0,1.346-1.09,2.433-2.432,2.433   c-1.346,0-2.436-1.087-2.436-2.433v-5.012h-8.27c-1.342,0-2.438-1.091-2.438-2.434c0-1.345,1.096-2.435,2.438-2.435h14.559   c3.555,0,6.451-2.895,6.451-6.454c0-3.559-2.896-6.452-6.451-6.452H45.98c-0.047,0-0.096-0.002-0.141-0.006   c-6.1-0.166-11.01-5.178-11.01-11.318c0-6.24,5.074-11.319,11.316-11.319h1.418v-5.016c0-1.342,1.09-2.434,2.436-2.434   c1.342,0,2.432,1.091,2.432,2.434v5.016h7.709c1.34,0,2.43,1.087,2.43,2.433c0,1.342-1.09,2.432-2.43,2.432H46.146   c-3.555,0-6.451,2.897-6.451,6.454c0,3.562,2.896,6.456,6.451,6.456h7.707c6.242,0,11.318,5.08,11.318,11.321   C65.172,65.872,60.096,70.952,53.854,70.952z"
    />
  </Icon>
);

export default CoinIcon;
