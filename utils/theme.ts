export interface Theme {
  text: string;
  secondaryText: string;
  diff: {
    added: string;
    removed: string;
    addedDimmed: string;
    removedDimmed: string;
  };
}

const darkTheme: Theme = {
  text: '#fff',
  secondaryText: '#999',
  diff: {
    added: '#225c2b',
    removed: '#7a2936',
    addedDimmed: '#47584a',
    removedDimmed: '#69484d',
  },
};

const lightTheme: Theme = {
  text: '#000',
  secondaryText: '#666',
  diff: {
    added: '#69db7c',
    removed: '#ffa8b4',
    addedDimmed: '#c7e1cb',
    removedDimmed: '#fdd2d8',
  },
};

export type ThemeNames = 'dark' | 'light';

export function getTheme(overrideTheme?: ThemeNames): Theme {
  switch (overrideTheme) {
    case 'light':
      return lightTheme;
    default:
      return darkTheme;
  }
}
