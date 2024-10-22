// theme/index.ts
import { extendTheme } from '@chakra-ui/react';

const customTheme = extendTheme({
  // Customize your theme here
  colors: {
    brand: {
      100: '#f7fafc',
      // ...other color definitions
    },
  },
});

export default customTheme;