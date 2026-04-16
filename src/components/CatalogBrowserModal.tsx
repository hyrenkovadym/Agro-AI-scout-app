import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles/appStyles";
import { DiseaseCatalogItem, PlantGuide } from "../types";

export type CatalogMode = "plants" | "diseases";

type Props = {
  visible: boolean;
  mode: CatalogMode;
  searchQuery: string;
  plants: PlantGuide[];
  diseases: DiseaseCatalogItem[];
  onChangeMode: (mode: CatalogMode) => void;
  onChangeSearchQuery: (value: string) => void;
  onSelectPlant: (plantId: string) => void;
  onSelectDisease: (item: DiseaseCatalogItem) => void;
  onClose: () => void;
};

export function CatalogBrowserModal({
  visible,
  mode,
  searchQuery,
  plants,
  diseases,
  onChangeMode,
  onChangeSearchQuery,
  onSelectPlant,
  onSelectDisease,
  onClose,
}: Props) {
  const isPlantsMode = mode === "plants";
  const placeholder = isPlantsMode
    ? "Пошук у каталозі рослин..."
    : "Пошук у каталозі хвороб...";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.catalogCard}>
          <View style={styles.sheetHandle} />

          <View style={styles.catalogHeaderRow}>
            <Text style={styles.sheetTitle}>Повний каталог</Text>
            <Pressable onPress={onClose} style={styles.catalogCloseButton}>
              <Text style={styles.catalogCloseButtonText}>Закрити</Text>
            </Pressable>
          </View>

          <View style={styles.catalogTabsRow}>
            <Pressable
              onPress={() => onChangeMode("plants")}
              style={[styles.catalogTabButton, isPlantsMode && styles.catalogTabButtonActive]}
            >
              <Text style={[styles.catalogTabText, isPlantsMode && styles.catalogTabTextActive]}>
                Рослини
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onChangeMode("diseases")}
              style={[styles.catalogTabButton, !isPlantsMode && styles.catalogTabButtonActive]}
            >
              <Text style={[styles.catalogTabText, !isPlantsMode && styles.catalogTabTextActive]}>
                Хвороби
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />

          <ScrollView style={styles.catalogScroll} showsVerticalScrollIndicator={false}>
            {isPlantsMode ? (
              plants.length === 0 ? (
                <Text style={styles.emptyStateText}>Рослини не знайдено.</Text>
              ) : (
                plants.map((plant) => (
                  <Pressable
                    key={plant.id}
                    onPress={() => onSelectPlant(plant.id)}
                    style={styles.plantCard}
                  >
                    <Text style={styles.plantName}>{plant.name}</Text>
                    <Text style={styles.plantSubtitle}>{plant.subtitle}</Text>
                    <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити сезони</Text>
                  </Pressable>
                ))
              )
            ) : diseases.length === 0 ? (
              <Text style={styles.emptyStateText}>Хвороби не знайдено.</Text>
            ) : (
              diseases.map((diseaseItem) => {
                const previewMatches = diseaseItem.matches.slice(0, 3);
                const restCount = Math.max(0, diseaseItem.matches.length - previewMatches.length);

                return (
                  <Pressable
                    key={diseaseItem.key}
                    onPress={() => onSelectDisease(diseaseItem)}
                    style={styles.plantCard}
                  >
                    <Text style={styles.diseaseName}>{diseaseItem.disease}</Text>
                    <Text style={styles.diseaseMeta}>
                      {previewMatches.map((item) => `${item.plantName} (${item.season})`).join(" • ")}
                    </Text>
                    {restCount > 0 ? (
                      <Text style={styles.metaText}>Ще рослин/сезонів: {restCount}</Text>
                    ) : null}
                    <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити картку рослини</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

