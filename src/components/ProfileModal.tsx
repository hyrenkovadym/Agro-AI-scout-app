import { Dispatch, SetStateAction } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../styles/appStyles";
import { PasswordDraft, ProfileDraft } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  profileDraft: ProfileDraft;
  setProfileDraft: Dispatch<SetStateAction<ProfileDraft>>;
  passwordDraft: PasswordDraft;
  setPasswordDraft: Dispatch<SetStateAction<PasswordDraft>>;
  isSavingProfile: boolean;
  isChangingPassword: boolean;
  onSaveProfile: () => void;
  onChangePassword: () => void;
};

export function ProfileModal({
  visible,
  onClose,
  profileDraft,
  setProfileDraft,
  passwordDraft,
  setPasswordDraft,
  isSavingProfile,
  isChangingPassword,
  onSaveProfile,
  onChangePassword,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Профіль</Text>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Налаштування профілю</Text>
              <TextInput
                value={profileDraft.name}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, name: value }))}
                placeholder="Ім'я"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
              <TextInput
                value={profileDraft.email}
                onChangeText={(value) => setProfileDraft((prev) => ({ ...prev, email: value }))}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.sectionItem}>Мова інтерфейсу</Text>
              <View style={styles.languageRow}>
                <Pressable
                  onPress={() => setProfileDraft((prev) => ({ ...prev, language: "uk" }))}
                  style={[styles.languageChip, profileDraft.language === "uk" && styles.languageChipActive]}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      profileDraft.language === "uk" && styles.languageChipTextActive,
                    ]}
                  >
                    Українська
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setProfileDraft((prev) => ({ ...prev, language: "en" }))}
                  style={[styles.languageChip, profileDraft.language === "en" && styles.languageChipActive]}
                >
                  <Text
                    style={[
                      styles.languageChipText,
                      profileDraft.language === "en" && styles.languageChipTextActive,
                    ]}
                  >
                    English
                  </Text>
                </Pressable>
              </View>
              <Pressable
                onPress={onSaveProfile}
                disabled={isSavingProfile}
                style={[styles.sheetUpdateButton, isSavingProfile && styles.buttonDisabled]}
              >
                <Text style={styles.sheetUpdateButtonText}>
                  {isSavingProfile ? "Збереження..." : "Зберегти профіль"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Зміна паролю</Text>
              <TextInput
                value={passwordDraft.currentPassword}
                onChangeText={(value) => setPasswordDraft((prev) => ({ ...prev, currentPassword: value }))}
                placeholder="Поточний пароль"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                secureTextEntry
              />
              <TextInput
                value={passwordDraft.nextPassword}
                onChangeText={(value) => setPasswordDraft((prev) => ({ ...prev, nextPassword: value }))}
                placeholder="Новий пароль"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                secureTextEntry
              />
              <TextInput
                value={passwordDraft.repeatPassword}
                onChangeText={(value) => setPasswordDraft((prev) => ({ ...prev, repeatPassword: value }))}
                placeholder="Повторіть новий пароль"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                secureTextEntry
              />
              <Pressable
                onPress={onChangePassword}
                disabled={isChangingPassword}
                style={[styles.sheetUpdateButton, isChangingPassword && styles.buttonDisabled]}
              >
                <Text style={styles.sheetUpdateButtonText}>
                  {isChangingPassword ? "Оновлення..." : "Оновити пароль"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Питання та документи</Text>
              <Text style={styles.sectionItem}>• Питання і відповіді (FAQ)</Text>
              <Text style={styles.sectionItem}>• Політика конфіденційності</Text>
              <Text style={styles.sectionItem}>• Умови використання</Text>
              <Text style={styles.sectionItem}>• Контакти підтримки: support@agro-ai.app</Text>
            </View>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.sheetCloseButton}>
            <Text style={styles.sheetCloseButtonText}>Закрити</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
