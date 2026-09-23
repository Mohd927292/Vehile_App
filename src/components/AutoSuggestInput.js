import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { TextInput, Text, Card } from 'react-native-paper';
import { useDebounce } from '../hooks/useDebounce';
import { useTheme } from '../hooks/useTheme';

const AutoSuggestInput = ({
  label,
  value,
  onChangeText,
  onSuggestionSelect,
  getSuggestions,
  placeholder,
  autoCapitalize = 'none',
  style,
  onBlur,
  theme,
  ...props
}) => {
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const debouncedValue = useDebounce(value);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    let active = true;
    if (!debouncedValue?.trim() || debouncedValue === lastSelectedValue) {
      setSuggestions([]);
      setShowSuggestions(false);
      return () => { active = false; };
    }
    setLoading(true);
    getSuggestions(debouncedValue).then(results => {
      if (!active) return;
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }).catch(() => {
      if (active) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedValue, lastSelectedValue, getSuggestions]);

  const handleSuggestionPress = (suggestion) => {
    const selectedValue = suggestion.vehicleNo || suggestion.name || suggestion.label;
    setLastSelectedValue(selectedValue);
    setShowSuggestions(false);
    setSuggestions([]);
    onSuggestionSelect(suggestion);
  };

  const [lastSelectedValue, setLastSelectedValue] = useState('');

  const handleTextChange = (text) => {
    onChangeText(text);
    if (!text.trim()) {
      setShowSuggestions(false);
      setSuggestions([]);
      setLastSelectedValue('');
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity 
      onPress={() => handleSuggestionPress(item)}
      activeOpacity={0.7}
    >
      <Card style={[styles.suggestionItem, { backgroundColor: colors.surface }]}>
        <Card.Content style={styles.suggestionContent}>
          <Text style={[styles.suggestionText, { color: colors.text }]}>
            {item.vehicleNo || item.name || item.label}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={style}>
      <TextInput
        label={label}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        mode="outlined"
        theme={theme || { colors: { onSurfaceVariant: colors.text, outline: colors.border } }}
        style={{ backgroundColor: colors.surface }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 200);
          if (onBlur) onBlur(value);
        }}
        {...props}
      />
      {loading && <ActivityIndicator style={styles.loadingIndicator} size="small" color={colors.primary} />}
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <View style={[styles.suggestionsList, { backgroundColor: colors.surface }]}>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={false}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingIndicator: { position: 'absolute', right: 16, top: 18 },
  suggestionsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 20,
    backgroundColor: 'transparent',
  },
  suggestionsList: {
    maxHeight: 200,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    marginVertical: 1,
    elevation: 2,
  },
  suggestionContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionText: {
    fontSize: 16,
  },
});

export default AutoSuggestInput;
