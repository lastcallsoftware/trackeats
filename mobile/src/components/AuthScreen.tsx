import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../../assets/trackeats-neon-logo.svg';

type Props = {
  title?: string;
  showLogo?: boolean;
  children: React.ReactNode;
  overlay?: React.ReactNode;
};

export default function AuthScreen({ title, showLogo = true, children, overlay }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        {showLogo ? (
          <View style={styles.logoContainer}>
            <Logo width={120} height={120} />
          </View>
        ) : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </KeyboardAwareScrollView>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    width: '100%',
    aspectRatio: 1.833,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
});
