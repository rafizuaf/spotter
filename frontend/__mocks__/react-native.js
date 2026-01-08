// Mock for react-native
module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios,
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  Alert: {
    alert: jest.fn(),
  },
  RefreshControl: 'RefreshControl',
};
