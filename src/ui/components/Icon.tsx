import {MaterialCommunityIcons} from '@expo/vector-icons';
import {ComponentProps} from 'react';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: IconName;
  size: number;
  color: string;
};

// The app's icon set (MaterialCommunityIcons, Apache-2.0). Icons are
// decorative: the element using one carries the text or accessibility label.
export const Icon = ({name, size, color}: Props) => (
  <MaterialCommunityIcons
    name={name}
    size={size}
    color={color}
    accessibilityElementsHidden
    importantForAccessibility="no"
  />
);
