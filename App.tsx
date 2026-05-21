import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { AnalysisResultModal, AuthScreen, SeasonDetailsModal } from "./src/components";
import { plantCatalog, popularPlantIds } from "./src/constants";
import { styles } from "./src/styles/appStyles";
import {
  AnalysesResponse,
  AnalysisRecord,
  AuthDraft,
  AuthMode,
  AuthResponse,
  Client,
  ClientsResponse,
  DiseaseCatalogItem,
  MeResponse,
  PasswordDraft,
  PickedImage,
  ProfileDraft,
  SeasonalDiseases,
  User,
} from "./src/types";
import { apiRequest, apiUrl, ApiError, buildFriendlyError, formatDateTime, resolveProbability, translateCategory } from "./src/utils";

type AppPage = "home" | "profile" | "password" | "language" | "help" | "catalogPlants" | "catalogDiseases";

const textOrNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const languagePresets = [
  { code: "uk", label: "Ukrainian" },
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italiano" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "tr", label: "Turkish" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
];

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [authDraft, setAuthDraft] = useState<AuthDraft>({
    name: "",
    email: "",
    password: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isPlantHintExplicit, setPlantHintExplicit] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>("Весна");
  const [isSeasonModalVisible, setSeasonModalVisible] = useState(false);
  const [catalogPlantsQuery, setCatalogPlantsQuery] = useState("");
  const [catalogDiseasesQuery, setCatalogDiseasesQuery] = useState("");
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRecord | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [additionalAnalysisContext, setAdditionalAnalysisContext] = useState("");
  const [analysisHint, setAnalysisHint] = useState<string | null>(null);

  const [activePage, setActivePage] = useState<AppPage>("home");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    name: "",
    email: "",
    language: "uk",
  });
  const [customLanguageCode, setCustomLanguageCode] = useState("");
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>({
    currentPassword: "",
    nextPassword: "",
    repeatPassword: "",
  });

  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResultSheetVisible, setResultSheetVisible] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const selectedPlant = useMemo(() => {
    if (!selectedPlantId) {
      return null;
    }
    return plantCatalog.find((item) => item.id === selectedPlantId) || null;
  }, [selectedPlantId]);

  const selectedSeasonInfo = useMemo(() => {
    if (!selectedPlant) {
      return null;
    }
    return selectedPlant.seasons.find((item) => item.season === selectedSeason) || null;
  }, [selectedPlant, selectedSeason]);

  const activeLanguageCode = useMemo(
    () => (customLanguageCode.trim() || profileDraft.language.trim() || "uk").replace(/_/g, "-"),
    [customLanguageCode, profileDraft.language]
  );

  const popularPlants = useMemo(
    () => plantCatalog.filter((plant) => popularPlantIds.includes(plant.id)),
    []
  );

  const filteredPlants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return plantCatalog;
    }

    return plantCatalog.filter((plant) => {
      if (plant.name.toLowerCase().includes(query)) {
        return true;
      }
      if (plant.subtitle.toLowerCase().includes(query)) {
        return true;
      }
      return plant.seasons.some((seasonItem) => {
        if (seasonItem.season.toLowerCase().includes(query)) {
          return true;
        }
        return seasonItem.diseases.some((disease) => disease.toLowerCase().includes(query));
      });
    });
  }, [searchQuery]);

  const diseaseCatalog = useMemo<DiseaseCatalogItem[]>(() => {
    const diseaseMap = new Map<string, DiseaseCatalogItem>();

    for (const plant of plantCatalog) {
      for (const seasonItem of plant.seasons) {
        for (const diseaseName of seasonItem.diseases) {
          const normalizedKey = diseaseName.trim().toLowerCase();
          if (!normalizedKey) {
            continue;
          }

          const current = diseaseMap.get(normalizedKey) || {
            key: normalizedKey,
            disease: diseaseName,
            matches: [],
          };

          const alreadyLinked = current.matches.some(
            (match) => match.plantId === plant.id && match.season === seasonItem.season
          );

          if (!alreadyLinked) {
            current.matches.push({
              plantId: plant.id,
              plantName: plant.name,
              season: seasonItem.season,
            });
          }

          diseaseMap.set(normalizedKey, current);
        }
      }
    }

    return Array.from(diseaseMap.values()).sort((left, right) =>
      left.disease.localeCompare(right.disease, "uk")
    );
  }, []);

  const filteredDiseases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return diseaseCatalog;
    }

    return diseaseCatalog.filter((item) => {
      if (item.disease.toLowerCase().includes(query)) {
        return true;
      }

      return item.matches.some((match) => {
        if (match.plantName.toLowerCase().includes(query)) {
          return true;
        }
        return String(match.season).toLowerCase().includes(query);
      });
    });
  }, [diseaseCatalog, searchQuery]);

  const previewPlants = useMemo(() => filteredPlants.slice(0, 3), [filteredPlants]);
  const previewDiseases = useMemo(() => filteredDiseases.slice(0, 3), [filteredDiseases]);

  const filteredCatalogPlants = useMemo(() => {
    const query = catalogPlantsQuery.trim().toLowerCase();
    if (!query) {
      return plantCatalog;
    }

    return plantCatalog.filter((plant) => {
      if (plant.name.toLowerCase().includes(query)) {
        return true;
      }
      if (plant.subtitle.toLowerCase().includes(query)) {
        return true;
      }
      return plant.seasons.some((seasonItem) => {
        if (String(seasonItem.season).toLowerCase().includes(query)) {
          return true;
        }
        return seasonItem.diseases.some((disease) => disease.toLowerCase().includes(query));
      });
    });
  }, [catalogPlantsQuery]);

  const filteredCatalogDiseases = useMemo(() => {
    const query = catalogDiseasesQuery.trim().toLowerCase();
    if (!query) {
      return diseaseCatalog;
    }

    return diseaseCatalog.filter((item) => {
      if (item.disease.toLowerCase().includes(query)) {
        return true;
      }

      return item.matches.some((match) => {
        if (match.plantName.toLowerCase().includes(query)) {
          return true;
        }
        return String(match.season).toLowerCase().includes(query);
      });
    });
  }, [catalogDiseasesQuery, diseaseCatalog]);

  const expectedPlantHint = useMemo(() => {
    if (isPlantHintExplicit && selectedPlant?.name) {
      return selectedPlant.name;
    }

    const query = searchQuery.trim();
    if (!query) {
      return "";
    }
    if (query.length > 60) {
      return "";
    }
    if (query.split(/\s+/).length > 4) {
      return "";
    }
    return query;
  }, [isPlantHintExplicit, searchQuery, selectedPlant?.name]);

  const refreshClients = useCallback(async (authToken: string) => {
    const payload = await apiRequest<ClientsResponse>("/clients", { token: authToken });
    setClients(payload.clients);
  }, []);

  const refreshAnalyses = useCallback(async (authToken: string) => {
    const payload = await apiRequest<AnalysesResponse>("/analyses", { token: authToken });
    setAnalysisHistory(payload.analyses);

    if (payload.analyses.length > 0) {
      setLatestAnalysis(payload.analyses[0]);
      return;
    }

    setLatestAnalysis(null);
  }, []);

  const ensureQuickAnalysisClient = useCallback(
    async (authToken: string) => {
      const quickClient =
        clients.find((item) => item.notes?.includes("[quick-ai-client]")) ||
        clients.find((item) => item.name.toLowerCase().includes("/ ai"));

      if (quickClient) {
        return quickClient;
      }

      const payload = await apiRequest<{ client: Client }>("/clients", {
        method: "POST",
        token: authToken,
        body: {
          name: user?.name ? `${user.name} / AI` : "Швидкий AI аналіз",
          crop: isPlantHintExplicit ? selectedPlant?.name || null : null,
          notes: "[quick-ai-client] Автоматично створено для швидкого аналізу по фото.",
        },
      });

      setClients((current) => [payload.client, ...current]);
      return payload.client;
    },
    [clients, isPlantHintExplicit, selectedPlant?.name, user?.name]
  );

  const handleAuth = async () => {
    setErrorText(null);

    const email = authDraft.email.trim().toLowerCase();
    const password = authDraft.password.trim();
    const name = authDraft.name.trim();

    if (!email || !password) {
      setErrorText("Вкажіть email і пароль.");
      return;
    }

    if (authMode === "register" && !name) {
      setErrorText("Для реєстрації потрібно вказати ім'я.");
      return;
    }

    setIsAuthLoading(true);
    try {
      const response = await apiRequest<AuthResponse>(
        authMode === "login" ? "/auth/login" : "/auth/register",
        {
          method: "POST",
          body: authMode === "login" ? { email, password } : { name, email, password },
        }
      );

      setToken(response.token);
      setUser(response.user);
      await Promise.all([refreshClients(response.token), refreshAnalyses(response.token)]);
      setAuthDraft((prev) => ({ ...prev, password: "" }));
      setActivePage("home");
      setErrorText(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && authMode === "login") {
        setAuthMode("register");
        setErrorText("Акаунт не знайдено. Спочатку зареєструйтесь.");
      } else {
        setErrorText(buildFriendlyError(error));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!token) {
      return;
    }

    setErrorText(null);
    setIsRefreshing(true);

    try {
      await Promise.all([refreshClients(token), refreshAnalyses(token)]);
      const mePayload = await apiRequest<MeResponse>("/me", { token });
      setUser(mePayload.user);
    } catch (error) {
      setErrorText(buildFriendlyError(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  const openSeasonModal = (plantId: string) => {
    const plant = plantCatalog.find((item) => item.id === plantId) || null;
    if (!plant) {
      return;
    }
    setSelectedPlantId(plantId);
    setPlantHintExplicit(true);
    setSelectedSeason(plant.seasons[0]?.season || selectedSeason || "Весна");
    setSeasonModalVisible(true);
  };

  const openDiseaseCatalogItem = (item: DiseaseCatalogItem) => {
    const firstMatch = item.matches[0];
    if (!firstMatch) {
      return;
    }

    setSelectedPlantId(firstMatch.plantId);
    setPlantHintExplicit(true);
    setSelectedSeason(String(firstMatch.season));
    setSeasonModalVisible(true);
  };

  const openProfilePage = () => {
    const userLanguage = (user?.language || "uk").trim();
    setProfileDraft({
      name: user?.name || "",
      email: user?.email || "",
      language: userLanguage || "uk",
    });
    setCustomLanguageCode(userLanguage || "uk");
    setPasswordDraft({
      currentPassword: "",
      nextPassword: "",
      repeatPassword: "",
    });
    setActivePage("profile");
  };

  const handleSaveProfile = async () => {
    if (!token) {
      return;
    }

    const name = profileDraft.name.trim();
    const email = profileDraft.email.trim().toLowerCase();
    const language = (customLanguageCode.trim() || profileDraft.language.trim() || "uk").replace(/_/g, "-");
    if (!name || !email) {
      setErrorText("У профілі вкажіть ім'я і email.");
      return;
    }
    if (!/^[a-z]{2,8}(-[a-z0-9]{2,8}){0,2}$/i.test(language)) {
      setErrorText("Невірний формат коду мови. Приклад: uk, en, pl, pt-BR.");
      return;
    }

    setErrorText(null);
    setIsSavingProfile(true);
    try {
      const payload = await apiRequest<MeResponse>("/me", {
        method: "PATCH",
        token,
        body: {
          name,
          email,
          language,
        },
      });
      setUser(payload.user);
      setProfileDraft((prev) => ({ ...prev, language: payload.user.language || language }));
      setCustomLanguageCode(payload.user.language || language);
      setAnalysisHint("Профіль успішно оновлено.");
    } catch (error) {
      setErrorText(buildFriendlyError(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) {
      return;
    }

    const currentPassword = passwordDraft.currentPassword.trim();
    const nextPassword = passwordDraft.nextPassword.trim();
    const repeatPassword = passwordDraft.repeatPassword.trim();

    if (!currentPassword || !nextPassword || !repeatPassword) {
      setErrorText("Заповніть усі поля для зміни паролю.");
      return;
    }
    if (nextPassword !== repeatPassword) {
      setErrorText("Новий пароль і підтвердження не збігаються.");
      return;
    }

    setErrorText(null);
    setIsChangingPassword(true);
    try {
      await apiRequest<{ ok: boolean }>("/me/password", {
        method: "POST",
        token,
        body: {
          currentPassword,
          newPassword: nextPassword,
        },
      });
      setPasswordDraft({
        currentPassword: "",
        nextPassword: "",
        repeatPassword: "",
      });
      setAnalysisHint("Пароль успішно змінено.");
    } catch (error) {
      setErrorText(buildFriendlyError(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const runPhotoAnalysis = async (image: PickedImage, extraContext = "") => {
    if (!token) {
      return;
    }

    setErrorText(null);
    setIsAnalyzing(true);
    try {
      const client = await ensureQuickAnalysisClient(token);
      const expectedPlantForAnalysis = expectedPlantHint.trim();

      const contextParts = [
        expectedPlantForAnalysis
          ? `Користувач підозрює таку рослину: ${expectedPlantForAnalysis}. Це гіпотеза, перевір за фото.`
          : "Користувач не вказав рослину, її потрібно визначити за фото.",
        isPlantHintExplicit && selectedPlant
          ? `Довідкова картка обраної рослини: ${selectedPlant.subtitle}.`
          : "",
        "Користувач просить швидкий AI-аналіз з фото.",
        searchQuery.trim() ? `Пошуковий запит користувача: ${searchQuery.trim()}.` : "",
        extraContext.trim() ? `Додатковий опис користувача: ${extraContext.trim()}.` : "",
        extraContext.trim() && latestAnalysis
          ? `Попередній висновок для перегляду: ${latestAnalysis.diagnosis.problemName}; ймовірна рослина: ${latestAnalysis.diagnosis.probablePlant || "невідомо"}.`
          : "",
      ].filter(Boolean);

      const response = await apiRequest<{ analysis: AnalysisRecord }>("/analyze-plant", {
        method: "POST",
        token,
        body: {
          clientId: client.id,
          imageBase64: image.base64,
          imageMimeType: image.mimeType,
          expectedPlant: expectedPlantForAnalysis,
          language: user?.language || "uk",
          context: textOrNull(contextParts.join(" ")) || "",
        },
      });

      setLatestAnalysis(response.analysis);
      setAnalysisHistory((current) => {
        const next = current.filter((item) => item.id !== response.analysis.id);
        return [response.analysis, ...next].slice(0, 80);
      });
      setAnalysisHint(
        extraContext.trim()
          ? "Аналіз оновлено з урахуванням додаткового опису."
          : "Аналіз виконано успішно."
      );
    } catch (error) {
      setResultSheetVisible(false);
      setErrorText(buildFriendlyError(error));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const launchPhotoAnalysis = async () => {
    if (!token) {
      return;
    }

    setErrorText(null);
    setAnalysisHint(null);
    setAdditionalAnalysisContext("");

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Доступ до камери", "Дозвольте доступ до камери, щоб зробити фото рослини.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.65,
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.base64) {
      setErrorText("Не вдалося прочитати фото. Спробуйте ще раз.");
      return;
    }

    const picked: PickedImage = {
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType || "image/jpeg",
    };

    setPickedImage(picked);
    setResultSheetVisible(true);
    await runPhotoAnalysis(picked);
  };

  const handleReanalyzeWithDetails = async () => {
    if (!pickedImage) {
      setErrorText("Спочатку потрібно зробити фото.");
      return;
    }
    await runPhotoAnalysis(pickedImage, additionalAnalysisContext);
  };

  const closeResultSheet = () => {
    if (isAnalyzing) {
      return;
    }
    setResultSheetVisible(false);
  };

  if (!token || !user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authDraft={authDraft}
        setAuthDraft={setAuthDraft}
        isAuthLoading={isAuthLoading}
        errorText={errorText}
        apiUrl={apiUrl}
        onAuth={handleAuth}
      />
    );
  }

  const diagnosis = latestAnalysis?.diagnosis || null;
  const probability = diagnosis ? resolveProbability(diagnosis) : "";
  const category = diagnosis?.category ? translateCategory(diagnosis.category) : "";
  const likelyPlant = diagnosis?.probablePlant?.trim() || selectedPlant?.name || "Не вдалося визначити";
  const plantAlternatives = diagnosis?.probablePlantAlternatives || [];
  const botanicalName = diagnosis?.botanicalName?.trim() || "";
  const descriptionImpact = diagnosis?.descriptionImpact?.trim() || "";
  const whatSeen = diagnosis?.whatSeen || "Ознаки не деталізовано у відповіді моделі.";
  const causes = diagnosis?.possibleCauses || [];
  const actions = diagnosis?.recommendedActions || [];
  const additions = diagnosis?.whatToAdd || [];
  const checks = diagnosis?.additionalChecks || diagnosis?.preventionTips || [];
  const note = diagnosis?.notes || "Для точного підтвердження бажано додаткові фото або огляд агронома.";

  const renderHomeContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Пошук рослин</Text>
        <TextInput
          value={searchQuery}
          onChangeText={(value) => {
            setSearchQuery(value);
            const normalized = value.trim().toLowerCase();
            const matchesSelectedPlant =
              selectedPlant?.name.trim().toLowerCase() === normalized && normalized.length > 0;

            if (!matchesSelectedPlant) {
              setPlantHintExplicit(false);
            }
            if (!normalized) {
              setSelectedPlantId(null);
            }
          }}
          placeholder="Введіть культуру або симптом (наприклад: кукурудза, іржа, дефіцит)"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Популярні культури</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
          {popularPlants.map((plant) => {
            const isSelected = selectedPlantId === plant.id;
            return (
              <Pressable
                key={plant.id}
                onPress={() => {
                  setSelectedPlantId(plant.id);
                  setSearchQuery(plant.name);
                  setPlantHintExplicit(true);
                }}
                style={[styles.popularChip, isSelected && styles.popularChipActive]}
              >
                <Text style={[styles.popularChipText, isSelected && styles.popularChipTextActive]}>
                  {plant.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Каталог рослин</Text>
        {previewPlants.length === 0 ? (
          <Text style={styles.emptyStateText}>Нічого не знайдено. Спробуйте інший запит.</Text>
        ) : (
          previewPlants.map((plant) => {
            const isSelected = plant.id === selectedPlantId;
            return (
              <Pressable
                key={plant.id}
                onPress={() => openSeasonModal(plant.id)}
                style={[styles.plantCard, isSelected && styles.plantCardSelected]}
              >
                <Text style={styles.plantName}>{plant.name}</Text>
                <Text style={styles.plantSubtitle}>{plant.subtitle}</Text>
                <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити сезони</Text>
              </Pressable>
            );
          })
        )}
        <Pressable onPress={() => setActivePage("catalogPlants")} style={styles.catalogOpenButton}>
          <Text style={styles.catalogOpenButtonText}>
            {filteredPlants.length > previewPlants.length
              ? `Показати всі рослини (${filteredPlants.length})`
              : "Відкрити каталог рослин"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Каталог хвороб</Text>
        {previewDiseases.length === 0 ? (
          <Text style={styles.emptyStateText}>Хвороби за цим запитом не знайдено.</Text>
        ) : (
          previewDiseases.map((diseaseItem) => {
            const previewMatches = diseaseItem.matches.slice(0, 3);
            const restCount = Math.max(0, diseaseItem.matches.length - previewMatches.length);

            return (
              <Pressable
                key={diseaseItem.key}
                onPress={() => openDiseaseCatalogItem(diseaseItem)}
                style={styles.plantCard}
              >
                <Text style={styles.diseaseName}>{diseaseItem.disease}</Text>
                <Text style={styles.diseaseMeta}>
                  {previewMatches.map((item) => `${item.plantName} (${item.season})`).join(" • ")}
                </Text>
                {restCount > 0 ? <Text style={styles.metaText}>Ще рослин/сезонів: {restCount}</Text> : null}
                <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити картку рослини</Text>
              </Pressable>
            );
          })
        )}
        <Pressable onPress={() => setActivePage("catalogDiseases")} style={styles.catalogOpenButton}>
          <Text style={styles.catalogOpenButtonText}>
            {filteredDiseases.length > previewDiseases.length
              ? `Показати всі хвороби (${filteredDiseases.length})`
              : "Відкрити каталог хвороб"}
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={launchPhotoAnalysis}
        disabled={isAnalyzing}
        style={[styles.lensButton, isAnalyzing && styles.buttonDisabled]}
      >
        {isAnalyzing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.lensButtonText}>Аналіз по фото</Text>
            <Text style={styles.lensButtonSubtext}>
              Натисніть і зробіть фото рослини. AI покаже проблему і що додати.
            </Text>
          </>
        )}
      </Pressable>

      {pickedImage ? (
        <Text style={styles.metaText}>
          Selected photo is ready. You can reopen the latest result and run a re-analysis with extra context.
        </Text>
      ) : null}

      {latestAnalysis && (
        <View style={styles.lastAnalysisCard}>
          <Text style={styles.lastAnalysisTitle}>Latest analysis</Text>
          <Text style={styles.lastAnalysisProblem}>{latestAnalysis.diagnosis.problemName}</Text>
          <Text style={styles.lastAnalysisMeta}>Probability: {resolveProbability(latestAnalysis.diagnosis)}</Text>
          <Text style={styles.lastAnalysisMeta}>Date: {formatDateTime(latestAnalysis.createdAt)}</Text>
          <Pressable onPress={() => setResultSheetVisible(true)} style={styles.lastAnalysisButton}>
            <Text style={styles.lastAnalysisButtonText}>Open details</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Analysis history</Text>
        {analysisHistory.length === 0 ? (
          <Text style={styles.emptyStateText}>
            No analysis history yet. Run your first photo analysis to see saved records.
          </Text>
        ) : (
          analysisHistory.slice(0, 5).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                setLatestAnalysis(item);
                setResultSheetVisible(true);
              }}
              style={styles.plantCard}
            >
              <Text style={styles.diseaseName}>{item.diagnosis.problemName}</Text>
              <Text style={styles.diseaseMeta}>Plant: {item.diagnosis.probablePlant || item.clientName}</Text>
              <Text style={styles.diseaseMeta}>Probability: {resolveProbability(item.diagnosis)}</Text>
              <Text style={styles.metaText}>{formatDateTime(item.createdAt)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderCatalogPlantsContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Усі рослини</Text>
        <TextInput
          value={catalogPlantsQuery}
          onChangeText={setCatalogPlantsQuery}
          placeholder="Пошук рослин, сезонів або симптомів"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        <Text style={styles.metaText}>Знайдено: {filteredCatalogPlants.length}</Text>
      </View>

      <View style={styles.card}>
        {filteredCatalogPlants.length === 0 ? (
          <Text style={styles.emptyStateText}>Рослини не знайдено. Спробуйте інший запит.</Text>
        ) : (
          filteredCatalogPlants.map((plant) => (
            <Pressable key={plant.id} onPress={() => openSeasonModal(plant.id)} style={styles.plantCard}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantSubtitle}>{plant.subtitle}</Text>
              <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити сезони</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderCatalogDiseasesContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Усі хвороби</Text>
        <TextInput
          value={catalogDiseasesQuery}
          onChangeText={setCatalogDiseasesQuery}
          placeholder="Пошук хвороб, рослин або сезонів"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        <Text style={styles.metaText}>Знайдено: {filteredCatalogDiseases.length}</Text>
      </View>

      <View style={styles.card}>
        {filteredCatalogDiseases.length === 0 ? (
          <Text style={styles.emptyStateText}>Хвороби не знайдено. Спробуйте інший запит.</Text>
        ) : (
          filteredCatalogDiseases.map((diseaseItem) => {
            const previewMatches = diseaseItem.matches.slice(0, 3);
            const restCount = Math.max(0, diseaseItem.matches.length - previewMatches.length);

            return (
              <Pressable
                key={diseaseItem.key}
                onPress={() => openDiseaseCatalogItem(diseaseItem)}
                style={styles.plantCard}
              >
                <Text style={styles.diseaseName}>{diseaseItem.disease}</Text>
                <Text style={styles.diseaseMeta}>
                  {previewMatches.map((item) => `${item.plantName} (${item.season})`).join(" • ")}
                </Text>
                {restCount > 0 ? <Text style={styles.metaText}>Ще рослин/сезонів: {restCount}</Text> : null}
                <Text style={styles.openPlantMeta}>Натисніть, щоб відкрити картку рослини</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  const renderProfileContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Профіль користувача</Text>
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
        <Text style={styles.sectionItem}>Поточна мова профілю: {user.language || "uk"}</Text>
        <Pressable
          onPress={handleSaveProfile}
          disabled={isSavingProfile}
          style={[styles.sheetUpdateButton, isSavingProfile && styles.buttonDisabled]}
        >
          <Text style={styles.sheetUpdateButtonText}>
            {isSavingProfile ? "Збереження..." : "Зберегти дані"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Налаштування</Text>
        <Pressable onPress={() => setActivePage("language")} style={styles.lastAnalysisButton}>
          <Text style={styles.lastAnalysisButtonText}>Змінити мову</Text>
        </Pressable>
        <Pressable onPress={() => setActivePage("password")} style={styles.lastAnalysisButton}>
          <Text style={styles.lastAnalysisButtonText}>Змінити пароль</Text>
        </Pressable>
        <Pressable onPress={() => setActivePage("help")} style={styles.lastAnalysisButton}>
          <Text style={styles.lastAnalysisButtonText}>Питання та політика</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderPasswordContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Зміна паролю</Text>
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
          onPress={handleChangePassword}
          disabled={isChangingPassword}
          style={[styles.sheetUpdateButton, isChangingPassword && styles.buttonDisabled]}
        >
          <Text style={styles.sheetUpdateButtonText}>
            {isChangingPassword ? "Оновлення..." : "Оновити пароль"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderLanguageContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Мова</Text>
        <Text style={styles.sectionItem}>
          Оберіть з переліку або введіть будь-який код мови (BCP-47), наприклад: `uk`, `en`, `pt-BR`, `zh-CN`.
        </Text>
        <View style={styles.languageRow}>
          {languagePresets.map((item) => (
            <Pressable
              key={item.code}
              onPress={() => {
                setProfileDraft((prev) => ({ ...prev, language: item.code }));
                setCustomLanguageCode(item.code);
              }}
              style={[
                styles.languageChip,
                activeLanguageCode.toLowerCase() === item.code.toLowerCase() && styles.languageChipActive,
              ]}
            >
              <Text
                style={[
                  styles.languageChipText,
                  activeLanguageCode.toLowerCase() === item.code.toLowerCase() && styles.languageChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={customLanguageCode}
          onChangeText={setCustomLanguageCode}
          placeholder="Власний код мови (наприклад: nl, sv, cs, vi)"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          autoCapitalize="none"
        />
        <Pressable
          onPress={handleSaveProfile}
          disabled={isSavingProfile}
          style={[styles.sheetUpdateButton, isSavingProfile && styles.buttonDisabled]}
        >
          <Text style={styles.sheetUpdateButtonText}>
            {isSavingProfile ? "Збереження..." : "Зберегти мову"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderHelpContent = () => (
    <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Питання та політика</Text>
        <Text style={styles.sectionItem}>• FAQ: часті питання по аналізу рослин.</Text>
        <Text style={styles.sectionItem}>• Політика конфіденційності: як зберігаються дані.</Text>
        <Text style={styles.sectionItem}>• Умови використання: відповідальність та обмеження AI-аналізу.</Text>
        <Text style={styles.sectionItem}>• Підтримка: support@agro-ai.app</Text>
      </View>
    </ScrollView>
  );

  const pageTitleMap: Record<AppPage, string> = {
    home: "Пошук рослин та хвороб по сезонах",
    catalogPlants: "Усі рослини",
    catalogDiseases: "Усі хвороби",
    profile: "Профіль",
    password: "Зміна паролю",
    language: "Мова",
    help: "Питання та політика",
  };

  return (
    <LinearGradient colors={["#F4F6FA", "#FFFFFF", "#EEF2F7"]} style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appHeaderCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Агро AI Асистент</Text>
              <Text style={styles.headerSubtitle}>{pageTitleMap[activePage]}</Text>
              <Text style={styles.headerMeta}>{user.name}</Text>
            </View>
            <View style={styles.headerActions}>
              {activePage === "home" ? (
                <>
                  <Pressable
                    onPress={handleRefresh}
                    disabled={isRefreshing}
                    style={[styles.smallButton, isRefreshing && styles.buttonDisabled]}
                  >
                    <Text style={styles.smallButtonText}>{isRefreshing ? "..." : "Оновити"}</Text>
                  </Pressable>
                  <Pressable onPress={openProfilePage} style={styles.smallButtonGhost}>
                    <Text style={styles.smallButtonGhostText}>Профіль</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => setActivePage("home")} style={styles.smallButtonGhost}>
                  <Text style={styles.smallButtonGhostText}>Назад</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {errorText && <Text style={styles.errorBanner}>{errorText}</Text>}
        {analysisHint && <Text style={styles.successBanner}>{analysisHint}</Text>}

        {activePage === "home" && renderHomeContent()}
        {activePage === "catalogPlants" && renderCatalogPlantsContent()}
        {activePage === "catalogDiseases" && renderCatalogDiseasesContent()}
        {activePage === "profile" && renderProfileContent()}
        {activePage === "password" && renderPasswordContent()}
        {activePage === "language" && renderLanguageContent()}
        {activePage === "help" && renderHelpContent()}

        <AnalysisResultModal
          visible={isResultSheetVisible}
          isAnalyzing={isAnalyzing}
          pickedImage={pickedImage}
          diagnosis={diagnosis}
          likelyPlant={likelyPlant}
          plantAlternatives={plantAlternatives}
          botanicalName={botanicalName}
          category={category}
          probability={probability}
          whatSeen={whatSeen}
          causes={causes}
          actions={actions}
          additions={additions}
          checks={checks}
          descriptionImpact={descriptionImpact}
          note={note}
          additionalAnalysisContext={additionalAnalysisContext}
          setAdditionalAnalysisContext={setAdditionalAnalysisContext}
          onReanalyze={handleReanalyzeWithDetails}
          onClose={closeResultSheet}
        />

        <SeasonDetailsModal
          visible={isSeasonModalVisible}
          onClose={() => setSeasonModalVisible(false)}
          selectedPlant={selectedPlant}
          selectedSeason={selectedSeason as SeasonalDiseases["season"]}
          selectedSeasonInfo={selectedSeasonInfo}
          setSelectedSeason={(season) => setSelectedSeason(season)}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
