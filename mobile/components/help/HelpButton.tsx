import { useState } from 'react';
import { TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { HelpDrawer } from './HelpDrawer';
import { getHelpForPath } from './help-content';

interface HelpButtonProps {
  path: string;
}

export function HelpButton({ path }: HelpButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [open, setOpen] = useState(false);

  const section = getHelpForPath(path);
  if (!section) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="help-circle" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {open && (
        <HelpDrawer
          section={section}
          path={path}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
});
