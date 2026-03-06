import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  StatusBar
} from 'react-native';
import { databaseService, Chapter, Verse } from '../services/SQLiteService';

const { width } = Dimensions.get('window');

// 🎨 Theme colors from QuranPage.tsx
const THEME = {
  background: '#FFF8E1',        // Cream background
  primary: '#8B4513',           // Brown (buttons, accents)
  accent: '#58A869',            // Green (highlights)
  text: '#3E2723',              // Dark brown text
  textSecondary: '#6D4C41',     // Muted text
  border: '#D7CCC8',            // Soft border
  card: '#FFFFFF',              // White cards
  overlay: 'rgba(255, 248, 225, 0.95)', // Semi-transparent overlay
};

export const SearchScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [chaptersMap, setChaptersMap] = useState<Map<number, Chapter>>(new Map());
  const inputRef = useRef<TextInput>(null);

  // ✅ Load chapters on mount to build the mapping
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const db = await databaseService.getDb();
        const chapters = await databaseService.getChapters();
        const map = new Map<number, Chapter>();
        chapters.forEach(chapter => {
          // Use identifier (0-based) as the key
          map.set(chapter.identifier, chapter);
        });
        setChaptersMap(map);
      } catch (error) {
        console.error('Error loading chapters:', error);
      }
    };
    loadChapters();
  }, []);

  // ✅ Get surah name from the loaded chapters map
  const getSurahName = useCallback((chapterId: number | null): string => {
    if (chapterId === null) return 'غير معروف';
    const chapter = chaptersMap.get(chapterId);
    return chapter?.arabicTitle || `سورة ${chapterId + 1}`;
  }, [chaptersMap]);

  const getSurahNumber = useCallback((chapterId: number | null): number => {
    if (chapterId === null) return 0;
    const chapter = chaptersMap.get(chapterId);
    return chapter?.number || 0;
  }, [chaptersMap]);

  // ✅ Memoized handler to avoid recreating on every render
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const db = await databaseService.getDb();
      // 🔒 Cap results at 100 as requested
      const results = await databaseService.searchVersesSimple(db, searchTerm);
      setSearchResults(results.slice(0, 100));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setHasSearched(false);
    // Delay focus to ensure keyboard is ready
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ✅ Arabic result counter with 100 max cap logic
  const getResultCountText = useMemo(() => {
    const count = searchResults.length;
    if (count === 0) return 'لا توجد نتائج';
    if (count === 1) return 'نتيجة واحدة';
    if (count >= 100) return 'أكثر من ١٠٠ نتيجة';
    return `${count} نتائج`;
  }, [searchResults.length]);

  // ✅ Verse Item Component
  const VerseItem = React.memo(({ item, index }: { item: Verse; index: number }) => {
    const surahName = getSurahName(item.chapter_id);
    const surahNumber = getSurahNumber(item.chapter_id);
    const verseRef = `${surahName} • آية ${item.number}`;
    
    return (
      <TouchableOpacity 
        style={styles.resultItem} 
        activeOpacity={0.7}
        onPress={() => {
          // Navigation to verse details can be added here
          console.log('Verse pressed:', item.humanReadableID);
        }}
      >
        <View style={styles.verseHeader}>
          <View style={styles.verseBadge}>
            <Text style={styles.verseBadgeText}>{index + 1}</Text>
          </View>
          <View style={styles.verseInfo}>
            <Text style={styles.verseRef}>{verseRef}</Text>
            <Text style={styles.verseNumber}>الآية {item.number}</Text>
          </View>
          <Text style={styles.pageNumber}>صفحة {item.page1441_id || '–'}</Text>
        </View>
        <Text style={styles.verseText} selectable>{item.text}</Text>
        <View style={styles.verseFooter}>
          <Text style={styles.verseID}>{item.humanReadableID}</Text>
        </View>
      </TouchableOpacity>
    );
  });
  VerseItem.displayName = 'VerseItem';

  const EmptyState = ({ hasSearched, isLoading }: { hasSearched: boolean; isLoading: boolean }) => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔍</Text>
          <Text style={styles.emptyStateTitle}>ابحث في القرآن الكريم</Text>
          <Text style={styles.emptyStateText}>
            أدخل كلمة أو عبارة للبحث في جميع آيات القرآن
          </Text>
        </View>
      );
    }
    
    if (!isLoading) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>😕</Text>
          <Text style={styles.emptyStateTitle}>لا توجد نتائج</Text>
          <Text style={styles.emptyStateText}>
            جرب كلمات أخرى أو تحقق من الإملاء
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // ✅ Sticky search header component
  const SearchHeader = useMemo(() => (
    <View style={styles.stickyHeader}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>بحث في القرآن</Text>
        <Text style={styles.subtitle}>ابحث عن كلمة، آية، أو موضوع</Text>
      </View>
      
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="اكتب للبحث (مثال: الحمد، الرحمة، الصبر)"
            placeholderTextColor={THEME.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            spellCheck={false}
            textAlign="right"
            keyboardType="default"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.searchButton, (!searchTerm.trim() || isLoading) && styles.searchButtonDisabled]} 
          onPress={handleSearch}
          disabled={isLoading || !searchTerm.trim()}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>بحث</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {hasSearched && !isLoading && searchResults.length > 0 && (
        <View style={styles.resultCounter}>
          <Text style={styles.resultCounterText}>{getResultCountText}</Text>
          {searchResults.length >= 100 && (
            <Text style={styles.counterNote}>يتم عرض أول ١٠٠ نتيجة فقط</Text>
          )}
        </View>
      )}
    </View>
  ), [searchTerm, isLoading, hasSearched, searchResults.length, getResultCountText, handleSearch, clearSearch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
      
      {/* ✅ Fixed/Sticky Search Header */}
      {SearchHeader}
      
      {/* ✅ Results List */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.verseID?.toString() || `${item.chapter_id}-${item.number}`}
        renderItem={({ item, index }) => <VerseItem item={item} index={index} />}
        ListEmptyComponent={() => <EmptyState hasSearched={hasSearched} isLoading={isLoading} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
      
      {/* ✅ Loading Overlay */}
      {isLoading && hasSearched && (
        <View style={styles.loadingOverlay} pointerEvents="box-none">
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.primary} />
            <Text style={styles.loadingText}>جاري البحث...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  // 🔒 Sticky Header Styles
  stickyHeader: {
    backgroundColor: THEME.card,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  headerTop: {
    marginBottom: 14,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.primary,
    textAlign: 'center',
    fontFamily: 'uthmanTn1Bold',
  },
  subtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    height: 48,
    borderColor: THEME.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 40,
    fontSize: 17,
    backgroundColor: THEME.background,
    color: THEME.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'uthmanTn1Bold',
  },
  clearButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  searchButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  searchButtonDisabled: {
    backgroundColor: '#A89484',
    shadowOpacity: 0,
    elevation: 0,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'uthmanTn1Bold',
  },
  resultCounter: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginTop: 4,
    alignItems: 'center',
  },
  resultCounterText: {
    fontSize: 15,
    color: THEME.primary,
    fontWeight: '600',
    fontFamily: 'uthmanTn1Bold',
  },
  counterNote: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  // 📋 List & Item Styles
  listContent: {
    paddingBottom: 30,
    paddingTop: 4,
  },
  resultItem: {
    backgroundColor: THEME.card,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: THEME.accent,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  verseBadge: {
    backgroundColor: THEME.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  verseBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verseInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  verseRef: {
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'uthmanTn1Bold',
    marginBottom: 2,
  },
  verseNumber: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'right',
  },
  pageNumber: {
    fontSize: 13,
    color: THEME.textSecondary,
    backgroundColor: THEME.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  verseText: {
    fontSize: 19,
    lineHeight: 36,
    color: THEME.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'uthmanTn1Bold',
    marginBottom: 8,
  },
  verseFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 8,
  },
  verseID: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
  // 🌀 Empty & Loading States
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 80,
    minHeight: 300,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.primary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'uthmanTn1Bold',
  },
  emptyStateText: {
    fontSize: 15,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: THEME.card,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 160,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: THEME.primary,
    fontWeight: '600',
    fontFamily: 'uthmanTn1Bold',
  },
});
