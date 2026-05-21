import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles/appStyles";
import { Diagnosis, PickedImage } from "../types";

type Props = {
  visible: boolean;
  isAnalyzing: boolean;
  pickedImage: PickedImage | null;
  diagnosis: Diagnosis | null;
  likelyPlant: string;
  plantAlternatives: string[];
  botanicalName: string;
  category: string;
  probability: string;
  whatSeen: string;
  causes: string[];
  actions: string[];
  additions: string[];
  checks: string[];
  descriptionImpact: string;
  note: string;
  additionalAnalysisContext: string;
  setAdditionalAnalysisContext: (value: string) => void;
  onReanalyze: () => void;
  onClose: () => void;
};

const renderListSection = (title: string, items: string[]) => {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <Text key={`${title}-${index}`} style={styles.sectionItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
};

export function AnalysisResultModal({
  visible,
  isAnalyzing,
  pickedImage,
  diagnosis,
  likelyPlant,
  plantAlternatives,
  botanicalName,
  category,
  probability,
  whatSeen,
  causes,
  actions,
  additions,
  checks,
  descriptionImpact,
  note,
  additionalAnalysisContext,
  setAdditionalAnalysisContext,
  onReanalyze,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Результат AI-аналізу</Text>

          {isAnalyzing ? (
            <View style={styles.sheetLoadingWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.sheetLoadingText}>Аналізуємо фото. Це займе кілька секунд...</Text>
            </View>
          ) : diagnosis ? (
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {pickedImage && (
                <Image source={{ uri: pickedImage.uri }} style={styles.sheetPreviewImage} resizeMode="cover" />
              )}

              <Text style={styles.sheetProblemTitle}>Назва проблеми: {diagnosis.problemName}</Text>
              <Text style={styles.sheetMeta}>Ймовірна рослина: {likelyPlant}</Text>
              {botanicalName ? <Text style={styles.sheetMeta}>Ботанічна назва: {botanicalName}</Text> : null}
              {category ? <Text style={styles.sheetMeta}>Категорія: {category}</Text> : null}
              <Text style={styles.sheetMeta}>Ймовірність: {probability}</Text>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Що видно на рослині</Text>
                <Text style={styles.sectionItem}>{whatSeen}</Text>
              </View>

              {renderListSection("Інші ймовірні рослини", plantAlternatives)}
              {renderListSection("Можлива причина", causes)}
              {renderListSection("Що робити зараз", actions)}
              {renderListSection("Що можна додати або застосувати", additions)}
              {renderListSection("Що перевірити додатково", checks)}

              {descriptionImpact ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Як враховано ваш додатковий опис</Text>
                  <Text style={styles.sectionItem}>{descriptionImpact}</Text>
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Важливе зауваження</Text>
                <Text style={styles.sectionItem}>{note}</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Safety note</Text>
                <Text style={styles.sectionItem}>
                  AI output is a preliminary recommendation and not a certified agronomist diagnosis.
                </Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Додатковий опис</Text>
                <TextInput
                  value={additionalAnalysisContext}
                  onChangeText={setAdditionalAnalysisContext}
                  placeholder="Додайте винятки або нові деталі: полив, погода, підживлення..."
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, styles.sheetInput]}
                  multiline
                />
                <Pressable
                  onPress={onReanalyze}
                  disabled={isAnalyzing}
                  style={[styles.sheetUpdateButton, isAnalyzing && styles.buttonDisabled]}
                >
                  <Text style={styles.sheetUpdateButtonText}>Оновити аналіз з описом</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.emptyStateText}>Поки немає даних аналізу. Зробіть фото рослини.</Text>
          )}

          <Pressable
            onPress={onClose}
            disabled={isAnalyzing}
            style={[styles.sheetCloseButton, isAnalyzing && styles.buttonDisabled]}
          >
            <Text style={styles.sheetCloseButtonText}>Закрити</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
