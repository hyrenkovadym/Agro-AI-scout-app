import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Dispatch, SetStateAction } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../styles/appStyles";
import { AuthDraft, AuthMode } from "../types";

type Props = {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authDraft: AuthDraft;
  setAuthDraft: Dispatch<SetStateAction<AuthDraft>>;
  isAuthLoading: boolean;
  errorText: string | null;
  apiUrl: string;
  onAuth: () => void;
};

export function AuthScreen({
  authMode,
  setAuthMode,
  authDraft,
  setAuthDraft,
  isAuthLoading,
  errorText,
  apiUrl,
  onAuth,
}: Props) {
  return (
    <LinearGradient colors={["#F4F6FA", "#FFFFFF", "#EEF2F7"]} style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authContent}>
          <Text style={styles.brand}>АГРО AI ПОМІЧНИК</Text>
          <Text style={styles.authTitle}>Вхід у систему</Text>
          <Text style={styles.authSubtitle}>
            Авторизуйтесь, щоб зберігати клієнтів та запускати AI-аналіз рослин.
          </Text>

          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => setAuthMode("login")}
              style={[styles.modeButton, authMode === "login" && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, authMode === "login" && styles.modeTextActive]}>Увійти</Text>
            </Pressable>
            <Pressable
              onPress={() => setAuthMode("register")}
              style={[styles.modeButton, authMode === "register" && styles.modeButtonActive]}
            >
              <Text style={[styles.modeText, authMode === "register" && styles.modeTextActive]}>
                Реєстрація
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {authMode === "register" && (
              <TextInput
                value={authDraft.name}
                onChangeText={(value) => setAuthDraft((prev) => ({ ...prev, name: value }))}
                placeholder="Ваше ім'я"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            )}

            <TextInput
              value={authDraft.email}
              onChangeText={(value) => setAuthDraft((prev) => ({ ...prev, email: value }))}
              placeholder="Ел. пошта"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              value={authDraft.password}
              onChangeText={(value) => setAuthDraft((prev) => ({ ...prev, password: value }))}
              placeholder="Пароль"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              autoCapitalize="none"
              secureTextEntry
            />

            <Pressable
              onPress={onAuth}
              disabled={isAuthLoading}
              style={[styles.primaryButton, isAuthLoading && styles.buttonDisabled]}
            >
              {isAuthLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {authMode === "login" ? "Увійти" : "Створити акаунт"}
                </Text>
              )}
            </Pressable>
          </View>

          {errorText && <Text style={styles.errorBanner}>{errorText}</Text>}

          <Text style={styles.metaText}>Адреса API: {apiUrl}</Text>
          <Text style={styles.metaText}>Перед входом переконайтеся, що backend запущено: `npm run api`.</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
