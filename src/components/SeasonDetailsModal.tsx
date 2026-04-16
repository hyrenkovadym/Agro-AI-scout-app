import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../styles/appStyles";
import { PlantGuide, SeasonalDiseases } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedPlant: PlantGuide | null;
  selectedSeason: SeasonalDiseases["season"];
  selectedSeasonInfo: SeasonalDiseases | null;
  setSelectedSeason: (season: SeasonalDiseases["season"]) => void;
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

export function SeasonDetailsModal({
  visible,
  onClose,
  selectedPlant,
  selectedSeason,
  selectedSeasonInfo,
  setSelectedSeason,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {selectedPlant ? `${selectedPlant.name}: сезони` : "Сезонні хвороби"}
          </Text>

          {selectedPlant ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.seasonChipsRow}
              >
                {selectedPlant.seasons.map((item) => {
                  const isActive = selectedSeason === item.season;
                  return (
                    <Pressable
                      key={`${selectedPlant.id}-${item.season}`}
                      onPress={() => setSelectedSeason(item.season)}
                      style={[styles.seasonChip, isActive && styles.seasonChipActive]}
                    >
                      <Text style={[styles.seasonChipText, isActive && styles.seasonChipTextActive]}>
                        {item.season}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>Опис сезону</Text>
                  <Text style={styles.sectionItem}>
                    {selectedSeasonInfo
                      ? `У сезон "${selectedSeasonInfo.season}" найчастіше зустрічаються такі проблеми.`
                      : "Оберіть сезон для перегляду."}
                  </Text>
                </View>

                {selectedSeasonInfo
                  ? renderListSection("Поширені хвороби і стреси", selectedSeasonInfo.diseases)
                  : null}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyStateText}>Рослину не знайдено.</Text>
          )}

          <Pressable onPress={onClose} style={styles.sheetCloseButton}>
            <Text style={styles.sheetCloseButtonText}>Закрити</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
